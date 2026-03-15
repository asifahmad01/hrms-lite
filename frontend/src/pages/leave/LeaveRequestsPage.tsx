import { useEffect, useMemo, useState } from 'react'
import {
  type CreateLeaveRequestPayload,
  type LeaveRequest,
  type LeaveStatus,
  type LeaveType,
  leaveRequestsApi,
} from '../../api/leave_requests'
import { mapApiError } from '../../api/errors'
import { type Employee, employeesApi } from '../../api/employees'
import LeaveStatusBadge from '../../components/leave/LeaveStatusBadge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { useConfirm } from '../../components/ui/ConfirmDialog'
import EmptyState from '../../components/ui/EmptyState'
import PageError from '../../components/ui/PageError'
import Spinner from '../../components/ui/Spinner'
import Table, { type Column } from '../../components/ui/Table'
import TableToolbar from '../../components/ui/TableToolbar'
import { useToast } from '../../components/ui/Toast'
import {
  LEAVE_TYPE_ICON,
  LEAVE_TYPE_LABELS,
} from '../../constants/leave'
import { formatDateOnly, toInputDate } from '../../utils/format'

// ── Types ──────────────────────────────────────────────────────────────────────

const ALL_LEAVE_TYPES: LeaveType[] = [
  'ANNUAL', 'SICK', 'CASUAL', 'UNPAID', 'MATERNITY', 'PATERNITY',
]
const ALL_LEAVE_STATUSES: LeaveStatus[] = ['PENDING', 'APPROVED', 'REJECTED']

interface FormState {
  employee_id: string
  leave_type:  LeaveType
  start_date:  string
  end_date:    string
  reason:      string
}

const EMPTY_FORM: FormState = {
  employee_id: '',
  leave_type:  'ANNUAL',
  start_date:  toInputDate(),
  end_date:    toInputDate(),
  reason:      '',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Number of calendar days inclusive between two YYYY-MM-DD strings. */
function leaveDays(start: string, end: string): number {
  const [sy, sm, sd] = start.split('-').map(Number)
  const [ey, em, ed] = end.split('-').map(Number)
  const diff =
    new Date(ey, em - 1, ed).getTime() - new Date(sy, sm - 1, sd).getTime()
  return Math.round(diff / 86_400_000) + 1
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeaveRequestsPage() {
  const toast   = useToast()
  const confirm = useConfirm()

  // ── Remote state ───────────────────────────────────────────────────────────
  const [requests, setRequests]   = useState<LeaveRequest[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  // ── Filter / search state ──────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | ''>('')
  const [empFilter, setEmpFilter]       = useState<number | ''>('')

  // ── Create-modal state ─────────────────────────────────────────────────────
  const [showModal, setShowModal] = useState(false)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // ── Action loading ─────────────────────────────────────────────────────────
  const [actioning, setActioning] = useState<number | null>(null)  // leave id

  // ── Derived: employee lookup map ───────────────────────────────────────────
  const employeeMap = useMemo(
    () => new Map(employees.map(e => [e.id, e])),
    [employees],
  )

  // ── Derived: summary counts ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { PENDING: 0, APPROVED: 0, REJECTED: 0 }
    requests.forEach(r => { c[r.status] = (c[r.status] ?? 0) + 1 })
    return c
  }, [requests])

  // ── Derived: client-side filtered rows ────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return requests.filter(r => {
      if (statusFilter && r.status !== statusFilter) return false
      if (empFilter    && r.employee_fk !== empFilter) return false
      if (q) {
        const emp = employeeMap.get(r.employee_fk)
        const haystack = [
          emp?.full_name    ?? '',
          emp?.employee_code ?? '',
          LEAVE_TYPE_LABELS[r.leave_type],
          r.reason,
        ].join(' ').toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [requests, statusFilter, empFilter, search, employeeMap])

  // ── Form derived validation ────────────────────────────────────────────────
  const dateOrderError =
    form.start_date && form.end_date && form.start_date > form.end_date
      ? 'End date cannot be before start date.'
      : null

  // ── Loaders ────────────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true)
    setError(null)
    try {
      const [reqRes, empRes] = await Promise.all([
        leaveRequestsApi.listAll(),
        employeesApi.list(),
      ])
      setRequests(reqRes.data  ?? [])
      setEmployees(empRes.data ?? [])
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openModal() {
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.employee_id) { setFormError('Please select an employee.'); return }
    if (dateOrderError)    { setFormError(dateOrderError); return }
    if (form.reason.trim().length < 10) {
      setFormError('Reason must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    const payload: CreateLeaveRequestPayload = {
      leave_type:  form.leave_type,
      start_date:  form.start_date,
      end_date:    form.end_date,
      reason:      form.reason.trim(),
    }
    try {
      await leaveRequestsApi.create(Number(form.employee_id), payload)
      toast.success('Leave request submitted.')
      closeModal()
      await loadAll()
    } catch (err) {
      setFormError(mapApiError(err, {
        404: 'Employee not found. Refresh and try again.',
        422: mapApiError(err),
      }))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleApprove(leave: LeaveRequest) {
    setActioning(leave.id)
    try {
      await leaveRequestsApi.updateStatus(leave.id, 'APPROVED')
      toast.success('Leave request approved.')
      setRequests(rs => rs.map(r => r.id === leave.id ? { ...r, status: 'APPROVED' } : r))
    } catch (err) {
      toast.error(mapApiError(err, { 422: 'Cannot approve: request is no longer pending.' }))
    } finally {
      setActioning(null)
    }
  }

  async function handleReject(leave: LeaveRequest) {
    setActioning(leave.id)
    try {
      await leaveRequestsApi.updateStatus(leave.id, 'REJECTED')
      toast.success('Leave request rejected.')
      setRequests(rs => rs.map(r => r.id === leave.id ? { ...r, status: 'REJECTED' } : r))
    } catch (err) {
      toast.error(mapApiError(err, { 422: 'Cannot reject: request is no longer pending.' }))
    } finally {
      setActioning(null)
    }
  }

  async function handleDelete(leave: LeaveRequest) {
    const emp = employeeMap.get(leave.employee_fk)
    const ok  = await confirm({
      title:        'Delete Leave Request',
      message:      `Delete the ${LEAVE_TYPE_LABELS[leave.leave_type]} leave request for ${emp?.full_name ?? `Employee #${leave.employee_fk}`}? This cannot be undone.`,
      confirmLabel: 'Delete',
      variant:      'danger',
    })
    if (!ok) return

    setActioning(leave.id)
    try {
      await leaveRequestsApi.delete(leave.id)
      toast.success('Leave request deleted.')
      setRequests(rs => rs.filter(r => r.id !== leave.id))
    } catch (err) {
      toast.error(mapApiError(err, { 422: 'Only pending requests can be deleted.' }))
    } finally {
      setActioning(null)
    }
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const columns: Column<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: r => {
        const emp = employeeMap.get(r.employee_fk)
        return emp ? (
          <div className="leave-emp-cell">
            <div className="leave-emp-avatar">{emp.full_name.charAt(0)}</div>
            <div>
              <div className="leave-emp-name">{emp.full_name}</div>
              <div className="leave-emp-code">{emp.employee_code} · {emp.department}</div>
            </div>
          </div>
        ) : (
          <span className="text-muted text-sm">Employee #{r.employee_fk}</span>
        )
      },
    },
    {
      key: 'leave_type',
      header: 'Type',
      render: r => (
        <span className="leave-type-cell">
          <span className="leave-type-icon">{LEAVE_TYPE_ICON[r.leave_type]}</span>
          {LEAVE_TYPE_LABELS[r.leave_type]}
        </span>
      ),
    },
    {
      key: 'dates',
      header: 'Dates',
      render: r => (
        <div className="leave-dates-cell">
          <span>{formatDateOnly(r.start_date)}</span>
          <span className="leave-dates-arrow">→</span>
          <span>{formatDateOnly(r.end_date)}</span>
          <span className="leave-dates-duration">
            {leaveDays(r.start_date, r.end_date)}d
          </span>
        </div>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: r => (
        <span
          className="leave-reason-cell"
          title={r.reason}
        >
          {r.reason.length > 60 ? `${r.reason.slice(0, 60)}…` : r.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: r => <LeaveStatusBadge status={r.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: r => {
        const busy = actioning === r.id
        return (
          <div className="leave-row-actions">
            {r.status === 'PENDING' && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => { void handleApprove(r) }}
                >
                  Approve
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => { void handleReject(r) }}
                >
                  Reject
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => { void handleDelete(r) }}
                >
                  Delete
                </Button>
              </>
            )}
          </div>
        )
      },
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Leave Requests</h2>
          <p className="page-subtitle">Manage employee leave applications</p>
        </div>
        <Button onClick={openModal}>+ New Request</Button>
      </div>

      {/* Load error */}
      {error && <PageError message={error} onRetry={() => { void loadAll() }} />}

      {/* Summary stat pills */}
      {!loading && requests.length > 0 && (
        <div className="leave-summary-pills">
          <span className="leave-sum-pill leave-sum-total">
            {requests.length} total
          </span>
          <span className="leave-sum-pill leave-sum-pending">
            ⏳ {counts.PENDING} pending
          </span>
          <span className="leave-sum-pill leave-sum-approved">
            ✓ {counts.APPROVED} approved
          </span>
          <span className="leave-sum-pill leave-sum-rejected">
            ✗ {counts.REJECTED} rejected
          </span>
        </div>
      )}

      {/* Table card */}
      <Card>
        <CardHeader>
          <span className="card-title">All Requests</span>
        </CardHeader>

        {/* Toolbar: search + filters */}
        <TableToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by name, code, type, reason…"
          resultCount={filtered.length}
          totalCount={requests.length}
        >
          {/* Status filter */}
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as LeaveStatus | '')}
          >
            <option value="">All statuses</option>
            {ALL_LEAVE_STATUSES.map(s => (
              <option key={s} value={s}>
                {s.charAt(0) + s.slice(1).toLowerCase()}
              </option>
            ))}
          </select>

          {/* Employee filter */}
          <select
            className="toolbar-select"
            value={empFilter}
            onChange={e => setEmpFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">All employees</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.id}>
                {emp.full_name}
              </option>
            ))}
          </select>

          {/* Clear button */}
          {(statusFilter || empFilter || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setStatusFilter(''); setEmpFilter('') }}
            >
              Clear
            </Button>
          )}
        </TableToolbar>

        {/* Content */}
        {loading ? (
          <Spinner />
        ) : requests.length === 0 ? (
          <EmptyState
            icon="🏖️"
            title="No leave requests yet"
            message="Click '+ New Request' to submit the first one."
            action={{ label: '+ New Request', onClick: openModal }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="No matches"
            message="No requests match the current filters."
          />
        ) : (
          <Table
            columns={columns}
            data={filtered}
            keyExtractor={r => r.id}
          />
        )}
      </Card>

      {/* ══════════════ Create modal ══════════════ */}
      {showModal && (
        <div
          className="modal-backdrop"
          onClick={closeModal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="leave-modal-title"
        >
          <div
            className="modal modal-lg"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title" id="leave-modal-title">
                New Leave Request
              </h3>
              <button className="modal-close" onClick={closeModal} aria-label="Close">
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={e => { void handleSubmit(e) }}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error mb-4">{formError}</div>
                )}

                <div className="form-grid-2">
                  {/* Employee */}
                  <div className="form-group form-col-span-2">
                    <label className="form-label">Employee <span className="form-required">*</span></label>
                    <select
                      className="form-select"
                      value={form.employee_id}
                      onChange={e => setField('employee_id', e.target.value)}
                      required
                    >
                      <option value="">— Select employee —</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>
                          {emp.full_name} ({emp.employee_code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Leave type */}
                  <div className="form-group">
                    <label className="form-label">Leave Type <span className="form-required">*</span></label>
                    <select
                      className="form-select"
                      value={form.leave_type}
                      onChange={e => setField('leave_type', e.target.value as LeaveType)}
                      required
                    >
                      {ALL_LEAVE_TYPES.map(t => (
                        <option key={t} value={t}>
                          {LEAVE_TYPE_ICON[t]} {LEAVE_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Duration preview */}
                  {form.start_date && form.end_date && !dateOrderError && (
                    <div className="form-group leave-duration-preview">
                      <label className="form-label">Duration</label>
                      <div className="leave-duration-value">
                        {leaveDays(form.start_date, form.end_date)} day
                        {leaveDays(form.start_date, form.end_date) !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}

                  {/* Start date */}
                  <div className="form-group">
                    <label className="form-label">Start Date <span className="form-required">*</span></label>
                    <input
                      type="date"
                      className={`form-input${dateOrderError ? ' input-error' : ''}`}
                      value={form.start_date}
                      onChange={e => setField('start_date', e.target.value)}
                      required
                    />
                  </div>

                  {/* End date */}
                  <div className="form-group">
                    <label className="form-label">End Date <span className="form-required">*</span></label>
                    <input
                      type="date"
                      className={`form-input${dateOrderError ? ' input-error' : ''}`}
                      value={form.end_date}
                      onChange={e => setField('end_date', e.target.value)}
                      required
                    />
                    {dateOrderError && (
                      <p className="field-error">{dateOrderError}</p>
                    )}
                  </div>

                  {/* Reason */}
                  <div className="form-group form-col-span-2">
                    <label className="form-label">
                      Reason <span className="form-required">*</span>
                      <span className="form-label-hint">({form.reason.length}/1000, min 10)</span>
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      maxLength={1000}
                      placeholder="Describe the reason for this leave request…"
                      value={form.reason}
                      onChange={e => setField('reason', e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <Button variant="ghost" type="button" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !!dateOrderError}>
                  {submitting ? 'Submitting…' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
