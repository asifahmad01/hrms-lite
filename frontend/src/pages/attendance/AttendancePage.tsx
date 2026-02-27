import { useEffect, useMemo, useState } from 'react'
import { type AttendanceRecord, type AttendanceStatus, attendanceApi } from '../../api/attendance'
import { ApiError } from '../../api/client'
import { mapApiError } from '../../api/errors'
import { type Employee, employeesApi } from '../../api/employees'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import Table, { type Column } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatDateOnly, toInputDate } from '../../utils/format'

export default function AttendancePage() {
  const toast = useToast()

  // ── Employees ───────────────────────────────────────────────────────────────
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [empError, setEmpError]     = useState<string | null>(null)

  // ── Selection + date filters ────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')

  // ── Attendance records ──────────────────────────────────────────────────────
  const [records, setRecords]       = useState<AttendanceRecord[]>([])
  const [loadingR, setLoadingR]     = useState(false)

  // ── Mark form ───────────────────────────────────────────────────────────────
  const [markDate, setMarkDate]     = useState(toInputDate())
  const [markStatus, setMarkStatus] = useState<AttendanceStatus>('PRESENT')
  const [marking, setMarking]       = useState(false)

  // ── Derived stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:   records.length,
    present: records.filter(r => r.status === 'PRESENT').length,
    absent:  records.filter(r => r.status === 'ABSENT').length,
  }), [records])

  // ── Load employees once ─────────────────────────────────────────────────────
  useEffect(() => {
    employeesApi.list()
      .then(res => setEmployees(res.data ?? []))
      .catch(() => setEmpError('Failed to load employees. Please refresh.'))
      .finally(() => setLoadingEmp(false))
  }, [])

  // ── Reload records when employee / filters change ───────────────────────────
  useEffect(() => {
    if (selectedId === null) return
    // Skip fetch when the date range is logically invalid
    if (fromDate && toDate && fromDate > toDate) return
    setLoadingR(true)
    attendanceApi
      .listByEmployee(selectedId, { from: fromDate || undefined, to: toDate || undefined })
      .then(res => setRecords(res.data ?? []))
      .catch(err => toast.error(mapApiError(err, { 404: 'Employee not found. Please refresh.' })))
      .finally(() => setLoadingR(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, fromDate, toDate])

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleEmployeeChange(val: string) {
    setSelectedId(val ? Number(val) : null)
    setRecords([])
    setFromDate('')
    setToDate('')
  }

  async function handleMark(e: React.FormEvent) {
    e.preventDefault()
    if (selectedId === null) return
    setMarking(true)
    try {
      await attendanceApi.mark(selectedId, { date: markDate, status: markStatus })
      toast.success(`Marked ${markStatus} for ${formatDateOnly(markDate)}`)
      // Refresh history in background
      const res = await attendanceApi.listByEmployee(selectedId, {
        from: fromDate || undefined,
        to:   toDate   || undefined,
      })
      setRecords(res.data ?? [])
    } catch (err) {
      toast.error(mapApiError(err, {
        409: `Attendance already marked for ${formatDateOnly(markDate)}. Use a different date.`,
        404: 'Employee not found. Please refresh the page and try again.',
      }))
    } finally {
      setMarking(false)
    }
  }

  function setLastNDays(n: number) {
    const to   = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (n - 1))
    setFromDate(toInputDate(from))
    setToDate(toInputDate(to))
  }

  function clearFilters() {
    setFromDate('')
    setToDate('')
  }

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns: Column<AttendanceRecord>[] = [
    {
      key:    'date',
      header: 'Date',
      render: r => <span className="font-mono">{formatDateOnly(r.date)}</span>,
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

  const selectedEmployee = employees.find(e => e.id === selectedId)
  const filtersActive    = !!(fromDate || toDate)

  // Client-side date range guard — shown inline and blocks the API call
  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? '"From" date must not be after "To" date.'
      : null

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Attendance</h2>
          <p className="page-subtitle">Track and manage employee attendance records</p>
        </div>
      </div>

      {/* ── Employee selector ──────────────────────────────────────────────── */}
      <Card className="mb-4">
        <div className="card-body">
          <div className="form-group" style={{ maxWidth: 340 }}>
            <label className="form-label">Select Employee</label>

            {loadingEmp ? (
              <p className="text-muted text-sm">Loading employees…</p>
            ) : empError ? (
              <div className="alert alert-error">{empError}</div>
            ) : (
              <select
                className="form-select"
                value={selectedId ?? ''}
                onChange={e => handleEmployeeChange(e.target.value)}
              >
                <option value="">— Select an employee —</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.employee_id})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </Card>

      {/* Prompt when nothing selected */}
      {!selectedEmployee && !loadingEmp && !empError && (
        <EmptyState
          icon="👆"
          title="Select an employee"
          message="Choose an employee from the dropdown above to view and manage their attendance."
        />
      )}

      {selectedEmployee && (
        <>
          {/* ── Mark attendance ──────────────────────────────────────────── */}
          <Card className="mb-4">
            <CardHeader>
              <span className="card-title">
                Mark Attendance — {selectedEmployee.full_name}
              </span>
            </CardHeader>

            <div className="card-body">
              <form className="form-row" onSubmit={handleMark}>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={markDate}
                    onChange={e => setMarkDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={markStatus}
                    onChange={e => setMarkStatus(e.target.value as AttendanceStatus)}
                  >
                    <option value="PRESENT">PRESENT</option>
                    <option value="ABSENT">ABSENT</option>
                  </select>
                </div>

                <Button type="submit" disabled={marking}>
                  {marking ? 'Saving…' : 'Mark Attendance'}
                </Button>
              </form>
            </div>
          </Card>

          {/* ── Attendance history ───────────────────────────────────────── */}
          <Card>
            <CardHeader>
              <span className="card-title">
                History — {selectedEmployee.full_name}
              </span>

              {/* Stat pills — shown only when there are records */}
              {stats.total > 0 && (
                <div className="attendance-stats">
                  <span className="stat-pill stat-total">
                    {stats.total} total
                  </span>
                  <span className="stat-pill stat-present">
                    ✓ {stats.present} present
                  </span>
                  <span className="stat-pill stat-absent">
                    ✗ {stats.absent} absent
                  </span>
                </div>
              )}
            </CardHeader>

            {/* Date range filter row */}
            <div className="history-filter">
              <div className="form-group">
                <label className="form-label">From</label>
                <input
                  type="date"
                  className={`form-input${dateRangeError ? ' input-error' : ''}`}
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">To</label>
                <input
                  type="date"
                  className={`form-input${dateRangeError ? ' input-error' : ''}`}
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
                {dateRangeError && (
                  <p className="field-error">{dateRangeError}</p>
                )}
              </div>

              {/* Quick-range shortcuts */}
              <div className="form-group">
                <label className="form-label">Quick range</label>
                <div className="date-shortcuts">
                  <Button variant="ghost" size="sm" type="button" onClick={() => setLastNDays(7)}>
                    7 days
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setLastNDays(30)}>
                    30 days
                  </Button>
                  {filtersActive && (
                    <Button variant="ghost" size="sm" type="button" onClick={clearFilters}>
                      Clear
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Table / states */}
            {loadingR ? (
              <Spinner />
            ) : records.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No attendance records"
                message={
                  filtersActive
                    ? 'No records found for the selected date range. Try clearing the filter.'
                    : 'Use the form above to mark attendance for this employee.'
                }
              />
            ) : (
              <Table columns={columns} data={records} keyExtractor={r => r.id} />
            )}
          </Card>
        </>
      )}
    </>
  )
}
