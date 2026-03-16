/**
 * EmployeeProfilePage — full employee detail view at /employee-management/:id
 *
 * Data:
 *   - Employee record:    GET /api/v1/employees/{id}
 *   - Attendance records: GET /api/v1/employees/{id}/attendance  (last 90 days)
 *
 * Attendance summary stats are computed client-side from the fetched records.
 */
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { type AttendanceRecord, attendanceApi } from '../../api/attendance'
import { ApiError } from '../../api/client'
import { mapApiError } from '../../api/errors'
import {
  type Employee,
  type EmployeeStatus,
  type EmploymentType,
  type UpdateEmployeePayload,
  employeesApi,
} from '../../api/employees'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import PageError from '../../components/ui/PageError'
import Spinner from '../../components/ui/Spinner'
import Table, { type Column } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import {
  DEPARTMENTS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_BADGE_CLASS,
  EMPLOYMENT_TYPE_LABELS,
  LOCATIONS,
  STATUS_BADGE_CLASS,
} from '../../constants/employee'
import { formatDate, formatDateOnly, toInputDate } from '../../utils/format'

// ── Types ──────────────────────────────────────────────────────────────────────

interface EditFormState {
  full_name: string
  email: string
  department: string
  phone: string
  designation: string
  joining_date: string
  employment_type: EmploymentType
  status: EmployeeStatus
  manager_name: string
  location: string
}

interface FieldErrors {
  full_name?: string
  email?: string
  department?: string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function validate(form: EditFormState): FieldErrors {
  const errors: FieldErrors = {}
  if (!form.full_name.trim())
    errors.full_name = 'Full name is required.'
  else if (form.full_name.trim().length < 2)
    errors.full_name = 'Must be at least 2 characters.'
  const email = form.email.trim()
  if (!email)
    errors.email = 'Email is required.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    errors.email = 'Enter a valid email address.'
  if (!form.department.trim())
    errors.department = 'Department is required.'
  return errors
}
function hasErrors(e: FieldErrors) { return Object.values(e).some(Boolean) }

function empToForm(emp: Employee): EditFormState {
  return {
    full_name:       emp.full_name,
    email:           emp.email,
    department:      emp.department,
    phone:           emp.phone ?? '',
    designation:     emp.designation ?? '',
    joining_date:    emp.joining_date ?? '',
    employment_type: emp.employment_type,
    status:          emp.status,
    manager_name:    emp.manager_name ?? '',
    location:        emp.location ?? '',
  }
}

/** 90-day window for initial attendance load */
function ninetyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 89)
  return toInputDate(d)
}

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="profile-info-row">
      <span className="profile-info-label">{label}</span>
      <span className={`profile-info-value${mono ? ' font-mono' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

interface MiniStatProps {
  label: string
  value: number | string
  accent?: 'blue' | 'green' | 'red' | 'purple' | 'default'
}
function MiniStat({ label, value, accent = 'default' }: MiniStatProps) {
  return (
    <div className={`profile-mini-stat profile-mini-stat-${accent}`}>
      <div className="profile-mini-stat-value">{value}</div>
      <div className="profile-mini-stat-label">{label}</div>
    </div>
  )
}

// ── Attendance columns ────────────────────────────────────────────────────────

const attendanceColumns: Column<AttendanceRecord>[] = [
  {
    key:    'date',
    header: 'Date',
    render: r => <span className="font-mono text-sm">{formatDateOnly(r.date)}</span>,
  },
  {
    key:    'status',
    header: 'Status',
    render: r => <Badge status={r.status} />,
  },
  {
    key:    'created_at',
    header: 'Marked On',
    render: r => <span className="text-muted text-sm">{formatDate(r.created_at)}</span>,
  },
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>()
  const employeeId = Number(id)
  const navigate = useNavigate()
  const toast    = useToast()
  const confirm  = useConfirm()

  // ── Employee data ───────────────────────────────────────────────────────────
  const [employee, setEmployee]     = useState<Employee | null>(null)
  const [empLoading, setEmpLoading] = useState(true)
  const [empError, setEmpError]     = useState<string | null>(null)

  // ── Attendance data ─────────────────────────────────────────────────────────
  const [records, setRecords]       = useState<AttendanceRecord[]>([])
  const [attLoading, setAttLoading] = useState(true)
  const [attError, setAttError]     = useState<string | null>(null)
  const [showAll, setShowAll]       = useState(false)

  // ── Edit modal state ────────────────────────────────────────────────────────
  const [showEdit, setShowEdit]         = useState(false)
  const [form, setForm]                 = useState<EditFormState | null>(null)
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({})
  const [formError, setFormError]       = useState<string | null>(null)
  const [submitting, setSubmitting]     = useState(false)

  // ── Deleting ────────────────────────────────────────────────────────────────
  const [deleting, setDeleting]         = useState(false)

  // ── Fetch employee ──────────────────────────────────────────────────────────

  async function loadEmployee() {
    try {
      setEmpLoading(true)
      setEmpError(null)
      const res = await employeesApi.getById(employeeId)
      setEmployee(res.data ?? null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404)
        setEmpError('Employee not found. They may have been deleted.')
      else
        setEmpError(mapApiError(err))
    } finally {
      setEmpLoading(false)
    }
  }

  // ── Fetch attendance (last 90 days) ─────────────────────────────────────────

  async function loadAttendance() {
    try {
      setAttLoading(true)
      setAttError(null)
      const res = await attendanceApi.listByEmployee(employeeId, { from: ninetyDaysAgo() })
      setRecords(res.data ?? [])
    } catch (err) {
      setAttError(mapApiError(err))
    } finally {
      setAttLoading(false)
    }
  }

  useEffect(() => {
    if (!isNaN(employeeId)) {
      void loadEmployee()
      void loadAttendance()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  // ── Derived attendance stats ─────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total   = records.length
    const present = records.filter(r => r.status === 'PRESENT').length
    const absent  = records.filter(r => r.status === 'ABSENT').length
    const rate    = total > 0 ? Math.round((present / total) * 100) : 0
    return { total, present, absent, rate }
  }, [records])

  // Displayed records: 10 most recent unless "show all" is on
  const visibleRecords = showAll ? records : records.slice(0, 10)

  // ── Edit handlers ────────────────────────────────────────────────────────────

  function openEdit() {
    if (!employee) return
    setForm(empToForm(employee))
    setFieldErrors({})
    setFormError(null)
    setShowEdit(true)
  }

  function handleFieldChange(field: keyof EditFormState, value: string) {
    setForm(f => f ? { ...f, [field]: value } : f)
    if (field in fieldErrors && fieldErrors[field as keyof FieldErrors])
      setFieldErrors(fe => ({ ...fe, [field]: undefined }))
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form) return
    setFormError(null)
    const errors = validate(form)
    if (hasErrors(errors)) { setFieldErrors(errors); return }
    setFieldErrors({})
    setSubmitting(true)
    try {
      const payload: UpdateEmployeePayload = {
        full_name:       form.full_name.trim(),
        email:           form.email.trim(),
        department:      form.department,
        phone:           form.phone.trim()       || undefined,
        designation:     form.designation.trim() || undefined,
        joining_date:    form.joining_date       || undefined,
        employment_type: form.employment_type,
        status:          form.status,
        manager_name:    form.manager_name.trim() || undefined,
        location:        form.location           || undefined,
      }
      const res = await employeesApi.update(employeeId, payload)
      if (res.data) setEmployee(res.data)
      setShowEdit(false)
      toast.success('Employee profile updated.')
    } catch (err) {
      setFormError(mapApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete handler ───────────────────────────────────────────────────────────

  async function handleDelete() {
    if (!employee) return
    const ok = await confirm({
      title:        'Delete Employee',
      message:      `Remove "${employee.full_name}"? All attendance records will also be deleted.`,
      confirmLabel: 'Delete',
      variant:      'danger',
    })
    if (!ok) return
    setDeleting(true)
    try {
      await employeesApi.delete(employeeId)
      toast.success(`"${employee.full_name}" has been deleted.`)
      navigate('/employee-management')
    } catch (err) {
      toast.error(mapApiError(err))
      setDeleting(false)
    }
  }

  // ── Error / loading states ───────────────────────────────────────────────────

  if (empLoading) return <Spinner variant="page" />
  if (empError)   return (
    <>
      <div className="page-header">
        <button className="profile-back-btn" onClick={() => navigate('/employee-management')}>
          ← Employees
        </button>
      </div>
      <PageError message={empError} onRetry={() => { void loadEmployee() }} />
    </>
  )
  if (!employee) return null

  // ── Render ────────────────────────────────────────────────────────────────────

  const ALL_STATUSES = Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]

  return (
    <>
      {/* ── Back nav ──────────────────────────────────────────────────────── */}
      <button className="profile-back-btn" onClick={() => navigate('/employee-management')}>
        ← Employees
      </button>

      {/* ── Profile header card ───────────────────────────────────────────── */}
      <div className="profile-header-card">
        {/* Avatar + identity */}
        <div className="profile-header-identity">
          <div className="profile-header-avatar">
            {employee.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-header-meta">
            <h1 className="profile-header-name">{employee.full_name}</h1>
            <p className="profile-header-sub">
              <span className="font-mono">{employee.employee_code}</span>
              {employee.designation && (
                <> · {employee.designation}</>
              )}
              {employee.department && (
                <> · {employee.department}</>
              )}
            </p>
            <div className="profile-header-badges">
              <span className={STATUS_BADGE_CLASS[employee.status]}>
                {EMPLOYEE_STATUS_LABELS[employee.status]}
              </span>
              <span className={EMPLOYMENT_BADGE_CLASS[employee.employment_type]}>
                {EMPLOYMENT_TYPE_LABELS[employee.employment_type]}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="profile-header-actions">
          <Button variant="ghost" onClick={openEdit}>Edit Profile</Button>
          <Button
            variant="danger"
            onClick={() => { void handleDelete() }}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>

      {/* ── 3-column detail grid ──────────────────────────────────────────── */}
      <div className="profile-detail-grid">

        {/* Contact info */}
        <Card>
          <CardHeader>
            <span className="card-title">Contact</span>
          </CardHeader>
          <div className="profile-info-list">
            <InfoRow label="Email"    value={employee.email} />
            <InfoRow label="Phone"    value={employee.phone} />
            <InfoRow label="Location" value={employee.location} />
          </div>
        </Card>

        {/* Work details */}
        <Card>
          <CardHeader>
            <span className="card-title">Work Details</span>
          </CardHeader>
          <div className="profile-info-list">
            <InfoRow label="Department"  value={employee.department} />
            <InfoRow label="Manager"     value={employee.manager_name} />
            <InfoRow label="Joining Date"
              value={employee.joining_date ? formatDate(employee.joining_date) : undefined}
            />
            <InfoRow label="Added On"    value={formatDate(employee.created_at)} />
          </div>
        </Card>

        {/* Attendance summary (last 90 days) */}
        <Card>
          <CardHeader>
            <span className="card-title">Attendance</span>
            <span className="text-muted text-sm">Last 90 days</span>
          </CardHeader>

          {attLoading ? (
            <Spinner size="sm" />
          ) : attError ? (
            <PageError message={attError} onRetry={() => { void loadAttendance() }} />
          ) : (
            <div className="profile-att-summary">
              <MiniStat label="Total"   value={stats.total}   accent="blue" />
              <MiniStat label="Present" value={stats.present} accent="green" />
              <MiniStat label="Absent"  value={stats.absent}  accent="red" />
              <MiniStat label="Rate"    value={stats.total > 0 ? `${stats.rate}%` : '—'} accent="purple" />
            </div>
          )}
        </Card>

      </div>

      {/* ── Recent attendance table ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <span className="card-title">
            Recent Attendance
            {records.length > 0 && (
              <span className="card-title-count">{records.length} records</span>
            )}
          </span>
          <span className="text-muted text-sm">Last 90 days</span>
        </CardHeader>

        {attLoading ? (
          <Spinner />
        ) : attError ? (
          <PageError message={attError} onRetry={() => { void loadAttendance() }} />
        ) : records.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No attendance in the last 90 days"
            message="Use the Attendance page to mark records for this employee."
          />
        ) : (
          <>
            <Table
              columns={attendanceColumns}
              data={visibleRecords}
              keyExtractor={r => r.id}
            />
            {records.length > 10 && (
              <div className="profile-show-more">
                <button
                  className="profile-show-more-btn"
                  onClick={() => setShowAll(v => !v)}
                >
                  {showAll
                    ? 'Show fewer'
                    : `Show all ${records.length} records`}
                </button>
              </div>
            )}
          </>
        )}
      </Card>

      {/* ── Edit modal ────────────────────────────────────────────────────── */}
      {showEdit && form && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Edit — {employee.full_name}</h3>
              <button className="modal-close" onClick={() => setShowEdit(false)}>✕</button>
            </div>

            {formError && <div className="alert alert-error mb-4">{formError}</div>}

            <form className="modal-form" onSubmit={e => { void handleEditSubmit(e) }} noValidate>
              <div className="form-grid-2">

                {/* Full Name */}
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input
                    className={`form-input${fieldErrors.full_name ? ' input-error' : ''}`}
                    value={form.full_name}
                    onChange={e => handleFieldChange('full_name', e.target.value)}
                    autoFocus
                  />
                  {fieldErrors.full_name && <p className="field-error">{fieldErrors.full_name}</p>}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label className="form-label">Email *</label>
                  <input
                    type="email"
                    className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                    value={form.email}
                    onChange={e => handleFieldChange('email', e.target.value)}
                  />
                  {fieldErrors.email && <p className="field-error">{fieldErrors.email}</p>}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={e => handleFieldChange('phone', e.target.value)}
                    maxLength={30}
                  />
                </div>

                {/* Department */}
                <div className="form-group">
                  <label className="form-label">Department *</label>
                  <select
                    className={`form-input${fieldErrors.department ? ' input-error' : ''}`}
                    value={form.department}
                    onChange={e => handleFieldChange('department', e.target.value)}
                  >
                    <option value="">Select department…</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  {fieldErrors.department && <p className="field-error">{fieldErrors.department}</p>}
                </div>

                {/* Designation */}
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input
                    className="form-input"
                    value={form.designation}
                    onChange={e => handleFieldChange('designation', e.target.value)}
                    maxLength={100}
                  />
                </div>

                {/* Joining Date */}
                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={form.joining_date}
                    onChange={e => handleFieldChange('joining_date', e.target.value)}
                  />
                </div>

                {/* Employment Type */}
                <div className="form-group">
                  <label className="form-label">Employment Type</label>
                  <select
                    className="form-input"
                    value={form.employment_type}
                    onChange={e => handleFieldChange('employment_type', e.target.value)}
                  >
                    {(Object.keys(EMPLOYMENT_TYPE_LABELS) as EmploymentType[]).map(t => (
                      <option key={t} value={t}>{EMPLOYMENT_TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-input"
                    value={form.status}
                    onChange={e => handleFieldChange('status', e.target.value)}
                  >
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Manager */}
                <div className="form-group">
                  <label className="form-label">Manager</label>
                  <input
                    className="form-input"
                    value={form.manager_name}
                    onChange={e => handleFieldChange('manager_name', e.target.value)}
                    maxLength={255}
                  />
                </div>

                {/* Location */}
                <div className="form-group">
                  <label className="form-label">Location</label>
                  <select
                    className="form-input"
                    value={form.location}
                    onChange={e => handleFieldChange('location', e.target.value)}
                  >
                    <option value="">Select location…</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>

              </div>

              <div className="modal-footer">
                <Button type="button" variant="ghost" onClick={() => setShowEdit(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
