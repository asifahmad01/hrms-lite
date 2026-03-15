import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../../api/client'
import { mapApiError } from '../../api/errors'
import {
  type CreateEmployeePayload,
  type Employee,
  type EmployeeStatus,
  type EmploymentType,
  type UpdateEmployeePayload,
  employeesApi,
} from '../../api/employees'
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
  DEPARTMENTS,
  EMPLOYEE_STATUS_LABELS,
  EMPLOYMENT_BADGE_CLASS,
  EMPLOYMENT_TYPE_LABELS,
  LOCATIONS,
  STATUS_BADGE_CLASS,
} from '../../constants/employee'
import { formatDate } from '../../utils/format'

// ── Types ──────────────────────────────────────────────────────────────────────

type ModalMode = 'add' | 'edit'

type SortKey =
  | 'name_asc' | 'name_desc'
  | 'joining_asc' | 'joining_desc'
  | 'created_desc' | 'created_asc'

interface FormState {
  employee_code: string
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
  employee_code?: string
  full_name?: string
  email?: string
  department?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'created_desc',  label: 'Newest first' },
  { value: 'created_asc',   label: 'Oldest first' },
  { value: 'joining_desc',  label: 'Joining date ↓' },
  { value: 'joining_asc',   label: 'Joining date ↑' },
  { value: 'name_asc',      label: 'Name A → Z' },
  { value: 'name_desc',     label: 'Name Z → A' },
]

const ALL_STATUSES = Object.keys(EMPLOYEE_STATUS_LABELS) as EmployeeStatus[]

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchesSearch(emp: Employee, q: string): boolean {
  if (!q) return true
  const lq = q.toLowerCase()
  return (
    emp.full_name.toLowerCase().includes(lq)     ||
    emp.employee_code.toLowerCase().includes(lq) ||
    emp.email.toLowerCase().includes(lq)          ||
    (emp.designation ?? '').toLowerCase().includes(lq)
  )
}

function sortEmployees(list: Employee[], key: SortKey): Employee[] {
  return [...list].sort((a, b) => {
    switch (key) {
      case 'name_asc':     return a.full_name.localeCompare(b.full_name)
      case 'name_desc':    return b.full_name.localeCompare(a.full_name)
      case 'joining_asc':  return (a.joining_date ?? '').localeCompare(b.joining_date ?? '')
      case 'joining_desc': return (b.joining_date ?? '').localeCompare(a.joining_date ?? '')
      case 'created_asc':  return a.created_at.localeCompare(b.created_at)
      case 'created_desc': return b.created_at.localeCompare(a.created_at)
    }
  })
}

// ── Validation ─────────────────────────────────────────────────────────────────

function validate(form: FormState, mode: ModalMode): FieldErrors {
  const errors: FieldErrors = {}
  if (mode === 'add') {
    const code = form.employee_code.trim()
    if (!code)
      errors.employee_code = 'Employee code is required.'
    else if (!/^[A-Z0-9-]{2,20}$/.test(code.toUpperCase()))
      errors.employee_code = 'Use 2–20 uppercase letters, digits, or hyphens (e.g. EMP-001).'
  }
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

// ── Default / conversion helpers ──────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  employee_code: '', full_name: '', email: '', department: '',
  phone: '', designation: '', joining_date: '',
  employment_type: 'FULL_TIME', status: 'ACTIVE',
  manager_name: '', location: '',
}

function employeeToForm(emp: Employee): FormState {
  return {
    employee_code:   emp.employee_code,
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

// ── Component ──────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const toast    = useToast()
  const confirm  = useConfirm()
  const navigate = useNavigate()

  // ── Data state ──────────────────────────────────────────────────────────────
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── Toolbar state ────────────────────────────────────────────────────────────
  const [search, setSearch]             = useState('')
  const [deptFilter, setDeptFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortKey, setSortKey]           = useState<SortKey>('created_desc')

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [showModal, setShowModal]     = useState(false)
  const [modalMode, setModalMode]     = useState<ModalMode>('add')
  const [editingId, setEditingId]     = useState<number | null>(null)
  const [form, setForm]               = useState<FormState>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError]     = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  // ── Load ─────────────────────────────────────────────────────────────────────

  async function loadEmployees() {
    try {
      setLoading(true)
      setError(null)
      const res = await employeesApi.list()
      setEmployees(res.data ?? [])
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadEmployees() }, [])

  // ── Derived filtered + sorted list ────────────────────────────────────────────

  const displayed = useMemo(() => {
    let list = employees

    if (search)       list = list.filter(e => matchesSearch(e, search))
    if (deptFilter)   list = list.filter(e => e.department === deptFilter)
    if (statusFilter) list = list.filter(e => e.status === statusFilter as EmployeeStatus)

    return sortEmployees(list, sortKey)
  }, [employees, search, deptFilter, statusFilter, sortKey])

  // Departments that actually exist in the data (for filter dropdown)
  const activeDepts = useMemo(
    () => [...new Set(employees.map(e => e.department))].sort(),
    [employees],
  )

  // ── Modal helpers ─────────────────────────────────────────────────────────────

  function openAdd() {
    setModalMode('add'); setEditingId(null)
    setForm(EMPTY_FORM); setFieldErrors({}); setFormError(null); setShowModal(true)
  }

  function openEdit(emp: Employee) {
    setModalMode('edit'); setEditingId(emp.id)
    setForm(employeeToForm(emp)); setFieldErrors({}); setFormError(null); setShowModal(true)
  }

  function closeModal() { setShowModal(false) }

  function handleFieldChange(field: keyof FormState, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (field in fieldErrors && fieldErrors[field as keyof FieldErrors])
      setFieldErrors(fe => ({ ...fe, [field]: undefined }))
  }

  // ── Submit ────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    const errors = validate(form, modalMode)
    if (hasErrors(errors)) { setFieldErrors(errors); return }
    setFieldErrors({})
    setSubmitting(true)
    try {
      if (modalMode === 'add') {
        const payload: CreateEmployeePayload = {
          employee_code:   form.employee_code.trim().toUpperCase(),
          full_name:       form.full_name.trim(),
          email:           form.email.trim(),
          department:      form.department,
          phone:           form.phone.trim()       || undefined,
          designation:     form.designation.trim() || undefined,
          joining_date:    form.joining_date       || undefined,
          employment_type: form.employment_type,
          manager_name:    form.manager_name.trim() || undefined,
          location:        form.location           || undefined,
        }
        const res = await employeesApi.create(payload)
        if (res.data) setEmployees(prev => [res.data as NonNullable<typeof res.data>, ...prev])
        toast.success(`"${form.full_name.trim()}" added successfully.`)
      } else {
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
        if (editingId === null) return
        const res = await employeesApi.update(editingId, payload)
        if (res.data)
          setEmployees(prev => prev.map(e => e.id === editingId ? (res.data as NonNullable<typeof res.data>) : e))
        toast.success(`"${form.full_name.trim()}" updated successfully.`)
      }
      closeModal()
    } catch (err) {
      setFormError(mapApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

  async function handleDelete(emp: Employee) {
    const ok = await confirm({
      title:        'Delete Employee',
      message:      `Remove "${emp.full_name}"? All attendance records will also be deleted.`,
      confirmLabel: 'Delete',
      variant:      'danger',
    })
    if (!ok) return
    setDeletingId(emp.id)
    try {
      await employeesApi.delete(emp.id)
      setEmployees(prev => prev.filter(e => e.id !== emp.id))
      if (showModal && editingId === emp.id) closeModal()
      toast.success(`"${emp.full_name}" has been deleted.`)
    } catch (err) {
      toast.error(mapApiError(err, {
        404: `"${emp.full_name}" no longer exists. Refreshing…`,
      }))
      if (err instanceof ApiError && err.status === 404) await loadEmployees()
    } finally {
      setDeletingId(null)
    }
  }

  // ── Table columns ──────────────────────────────────────────────────────────────

  const columns: Column<Employee>[] = [
    {
      key:    'employee_code',
      header: 'Code',
      render: e => <span className="font-mono text-sm">{e.employee_code}</span>,
    },
    {
      key:    'full_name',
      header: 'Employee',
      render: e => (
        <div className="emp-cell-name">
          <div className="emp-avatar">{e.full_name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="font-medium">{e.full_name}</div>
            {e.designation && (
              <div className="text-muted text-sm">{e.designation}</div>
            )}
          </div>
        </div>
      ),
    },
    { key: 'department', header: 'Department' },
    {
      key:    'employment_type',
      header: 'Type',
      render: e => (
        <span className={EMPLOYMENT_BADGE_CLASS[e.employment_type]}>
          {EMPLOYMENT_TYPE_LABELS[e.employment_type]}
        </span>
      ),
    },
    {
      key:    'status',
      header: 'Status',
      render: e => (
        <span className={STATUS_BADGE_CLASS[e.status]}>
          {EMPLOYEE_STATUS_LABELS[e.status]}
        </span>
      ),
    },
    {
      key:    'joining_date',
      header: 'Joined',
      render: e => (
        <span className="text-muted text-sm">
          {e.joining_date ? formatDate(e.joining_date) : '—'}
        </span>
      ),
    },
    {
      key:    'actions',
      header: '',
      render: e => (
        <div className="emp-row-actions">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/employees/${e.id}`)}>
            View
          </Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(e)}>
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { void handleDelete(e) }}
            disabled={deletingId === e.id}
          >
            {deletingId === e.id ? '…' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  const isFiltered = !!(search || deptFilter || statusFilter)

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Employees</h2>
          <p className="page-subtitle">Manage your organisation's employee records</p>
        </div>
      </div>

      {/* Load error */}
      {error && <PageError message={error} onRetry={() => { void loadEmployees() }} />}

      {/* Employee table card */}
      <Card>
        <CardHeader>
          <span className="card-title">
            All Employees
            {!loading && (
              <span className="card-title-count">
                {displayed.length}
                {isFiltered && employees.length !== displayed.length && (
                  <> of {employees.length}</>
                )}
              </span>
            )}
          </span>
        </CardHeader>

        {/* Toolbar */}
        <TableToolbar
          search={search}
          onSearchChange={v => { setSearch(v) }}
          searchPlaceholder="Search by name, code, email, title…"
          actions={<Button onClick={openAdd}>+ Add Employee</Button>}
        >
          {/* Department filter */}
          <select
            className="toolbar-select"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
          >
            <option value="">All departments</option>
            {activeDepts.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            className="toolbar-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{EMPLOYEE_STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Sort */}
          <select
            className="toolbar-select"
            value={sortKey}
            onChange={e => setSortKey(e.target.value as SortKey)}
            aria-label="Sort employees"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setSearch(''); setDeptFilter(''); setStatusFilter('') }}
            >
              Clear filters
            </Button>
          )}
        </TableToolbar>

        {/* Table body */}
        {loading ? (
          <Spinner />
        ) : displayed.length === 0 ? (
          isFiltered ? (
            <EmptyState
              icon="🔍"
              title="No matches found"
              message="Try adjusting your search or filters."
              action={{ label: 'Clear filters', onClick: () => { setSearch(''); setDeptFilter(''); setStatusFilter('') } }}
            />
          ) : (
            <EmptyState
              icon="👤"
              title="No employees yet"
              message="Get started by adding your first employee."
              action={{ label: '+ Add Employee', onClick: openAdd }}
            />
          )
        ) : (
          <Table columns={columns} data={displayed} keyExtractor={e => e.id} />
        )}
      </Card>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>

            {/* ── ADD / EDIT modal ─────────────────────────────────────── */}
            {(modalMode === 'add' || modalMode === 'edit') && (
              <>
                <div className="modal-header">
                  <h3 className="modal-title">
                    {modalMode === 'add' ? 'Add Employee' : 'Edit Employee'}
                  </h3>
                  <button className="modal-close" onClick={closeModal}>✕</button>
                </div>

                {formError && <div className="alert alert-error mb-4">{formError}</div>}

                <form className="modal-form" onSubmit={e => { void handleSubmit(e) }} noValidate>
                  <div className="form-grid-2">

                    {/* Code — add only */}
                    {modalMode === 'add' && (
                      <div className="form-group">
                        <label className="form-label">Employee Code *</label>
                        <input
                          className={`form-input${fieldErrors.employee_code ? ' input-error' : ''}`}
                          placeholder="e.g. EMP-001"
                          value={form.employee_code}
                          onChange={e => handleFieldChange('employee_code', e.target.value)}
                          maxLength={20}
                          autoFocus
                        />
                        {fieldErrors.employee_code && (
                          <p className="field-error">{fieldErrors.employee_code}</p>
                        )}
                      </div>
                    )}

                    {/* Full Name */}
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        className={`form-input${fieldErrors.full_name ? ' input-error' : ''}`}
                        placeholder="Jane Doe"
                        value={form.full_name}
                        onChange={e => handleFieldChange('full_name', e.target.value)}
                        autoFocus={modalMode === 'edit'}
                      />
                      {fieldErrors.full_name && (
                        <p className="field-error">{fieldErrors.full_name}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="form-group">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                        placeholder="jane@company.com"
                        value={form.email}
                        onChange={e => handleFieldChange('email', e.target.value)}
                      />
                      {fieldErrors.email && (
                        <p className="field-error">{fieldErrors.email}</p>
                      )}
                    </div>

                    {/* Phone */}
                    <div className="form-group">
                      <label className="form-label">Phone</label>
                      <input
                        className="form-input"
                        placeholder="+1 555 000 0000"
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
                        {DEPARTMENTS.map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      {fieldErrors.department && (
                        <p className="field-error">{fieldErrors.department}</p>
                      )}
                    </div>

                    {/* Designation */}
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input
                        className="form-input"
                        placeholder="Software Engineer"
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

                    {/* Status — edit only */}
                    {modalMode === 'edit' && (
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
                    )}

                    {/* Manager */}
                    <div className="form-group">
                      <label className="form-label">Manager</label>
                      <input
                        className="form-input"
                        placeholder="John Smith"
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
                        {LOCATIONS.map(l => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>

                  </div>

                  <div className="modal-footer">
                    <Button type="button" variant="ghost" onClick={closeModal} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? 'Saving…' : modalMode === 'add' ? 'Add Employee' : 'Save Changes'}
                    </Button>
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      )}
    </>
  )
}
