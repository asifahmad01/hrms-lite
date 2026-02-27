import { useEffect, useState } from 'react'
import { ApiError } from '../../api/client'
import { mapApiError } from '../../api/errors'
import { type CreateEmployeePayload, type Employee, employeesApi } from '../../api/employees'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import Table, { type Column } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../utils/format'

// ── Client-side validation ─────────────────────────────────────────────────────

interface FieldErrors {
  employee_id?: string
  full_name?:   string
  email?:       string
  department?:  string
}

function validate(form: CreateEmployeePayload): FieldErrors {
  const errors: FieldErrors = {}

  const eid = form.employee_id.trim()
  if (!eid)
    errors.employee_id = 'Employee ID is required.'
  else if (eid.length > 20)
    errors.employee_id = 'Must be 20 characters or fewer.'
  else if (!/^[A-Za-z0-9_-]+$/.test(eid))
    errors.employee_id = 'Only letters, numbers, hyphens, and underscores are allowed.'

  const name = form.full_name.trim()
  if (!name)
    errors.full_name = 'Full name is required.'
  else if (name.length < 2)
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

function hasErrors(e: FieldErrors) {
  return Object.values(e).some(Boolean)
}

// ── Component ──────────────────────────────────────────────────────────────────

const EMPTY_FORM: CreateEmployeePayload = {
  employee_id: '',
  full_name:   '',
  email:       '',
  department:  '',
}

export default function EmployeesPage() {
  const toast = useToast()

  const [employees, setEmployees]   = useState<Employee[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // Modal state
  const [showModal, setShowModal]     = useState(false)
  const [form, setForm]               = useState<CreateEmployeePayload>(EMPTY_FORM)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [formError, setFormError]     = useState<string | null>(null)
  const [submitting, setSubmitting]   = useState(false)

  // ── Data loading ─────────────────────────────────────────────────────────────

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

  useEffect(() => { loadEmployees() }, [])

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function openModal() {
    setForm(EMPTY_FORM)
    setFieldErrors({})
    setFormError(null)
    setShowModal(true)
  }

  function closeModal() { setShowModal(false) }

  /** Clear the per-field error the moment the user starts fixing it. */
  function handleFieldChange(field: keyof CreateEmployeePayload, value: string) {
    setForm(f => ({ ...f, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors(fe => ({ ...fe, [field]: undefined }))
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    // 1. Client-side validation — short-circuit before any network call
    const errors = validate(form)
    if (hasErrors(errors)) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})

    // 2. API call
    setSubmitting(true)
    try {
      const res = await employeesApi.create(form)
      if (res.data) setEmployees(prev => [res.data!, ...prev])
      closeModal()
      toast.success(`Employee "${form.full_name}" created successfully.`)
    } catch (err) {
      // 409 → backend names the exact conflicting field (employee_id / email)
      setFormError(mapApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(emp: Employee) {
    if (!confirm(`Delete "${emp.full_name}"? All attendance records will also be removed.`)) return

    setDeletingId(emp.id)
    try {
      await employeesApi.delete(emp.id)
      setEmployees(prev => prev.filter(e => e.id !== emp.id))
      toast.success(`"${emp.full_name}" has been deleted.`)
    } catch (err) {
      toast.error(mapApiError(err, {
        404: `"${emp.full_name}" no longer exists. Refreshing the list…`,
      }))
      // 404 → already gone on the server, sync local list
      if (err instanceof ApiError && err.status === 404) {
        await loadEmployees()
      }
    } finally {
      setDeletingId(null)
    }
  }

  // ── Table columns ──────────────────────────────────────────────────────────────

  const columns: Column<Employee>[] = [
    {
      key:    'employee_id',
      header: 'Employee ID',
      render: e => <span className="font-mono">{e.employee_id}</span>,
    },
    { key: 'full_name',  header: 'Full Name' },
    { key: 'email',      header: 'Email' },
    { key: 'department', header: 'Department' },
    {
      key:    'created_at',
      header: 'Joined',
      render: e => <span className="text-muted text-sm">{formatDate(e.created_at)}</span>,
    },
    {
      key:    'actions',
      header: '',
      render: e => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(e)}
          disabled={deletingId === e.id}
        >
          {deletingId === e.id ? '…' : 'Delete'}
        </Button>
      ),
    },
  ]

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Employees</h2>
          <p className="page-subtitle">Manage your organisation's employee records</p>
        </div>
        <Button onClick={openModal}>+ Add Employee</Button>
      </div>

      {/* Load error + retry */}
      {error && (
        <div className="alert alert-error mb-4" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={loadEmployees}>Retry</Button>
        </div>
      )}

      {/* Employee table */}
      <Card>
        <CardHeader>
          <span className="card-title">All Employees ({employees.length})</span>
        </CardHeader>

        {loading ? (
          <Spinner />
        ) : employees.length === 0 ? (
          <EmptyState
            icon="👤"
            title="No employees yet"
            message="Click '+ Add Employee' to create your first record."
          />
        ) : (
          <Table columns={columns} data={employees} keyExtractor={e => e.id} />
        )}
      </Card>

      {/* ── Add Employee modal ──────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Add Employee</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {/* Form-level error: 409 duplicates, network failures, etc. */}
            {formError && <div className="alert alert-error mb-4">{formError}</div>}

            {/* noValidate disables the browser's native validation UI — we own it */}
            <form className="modal-form" onSubmit={handleCreate} noValidate>

              <div className="form-group">
                <label className="form-label">Employee ID</label>
                <input
                  className={`form-input${fieldErrors.employee_id ? ' input-error' : ''}`}
                  placeholder="e.g. EMP-001"
                  value={form.employee_id}
                  onChange={e => handleFieldChange('employee_id', e.target.value)}
                  maxLength={20}
                  autoFocus
                />
                {fieldErrors.employee_id && (
                  <p className="field-error">{fieldErrors.employee_id}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className={`form-input${fieldErrors.full_name ? ' input-error' : ''}`}
                  placeholder="Jane Doe"
                  value={form.full_name}
                  onChange={e => handleFieldChange('full_name', e.target.value)}
                />
                {fieldErrors.full_name && (
                  <p className="field-error">{fieldErrors.full_name}</p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
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

              <div className="form-group">
                <label className="form-label">Department</label>
                <input
                  className={`form-input${fieldErrors.department ? ' input-error' : ''}`}
                  placeholder="Engineering"
                  value={form.department}
                  onChange={e => handleFieldChange('department', e.target.value)}
                />
                {fieldErrors.department && (
                  <p className="field-error">{fieldErrors.department}</p>
                )}
              </div>

              <div className="modal-footer">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={closeModal}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Saving…' : 'Add Employee'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
