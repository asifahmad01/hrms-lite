import { useEffect, useMemo, useState } from 'react'
import {
  type AttendanceMonthlySummary,
  type AttendanceRecord,
  type AttendanceStatus,
  type DailyAttendanceItem,
  attendanceApi,
} from '../../api/attendance'
import { mapApiError } from '../../api/errors'
import { type Employee, employeesApi } from '../../api/employees'
import Badge from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import Spinner from '../../components/ui/Spinner'
import Table, { type Column } from '../../components/ui/Table'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatDateOnly, toInputDate } from '../../utils/format'

// ── Constants ─────────────────────────────────────────────────────────────────

const ALL_STATUSES: AttendanceStatus[] = ['PRESENT', 'ABSENT', 'LEAVE', 'HALF_DAY']

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT:  'Present',
  ABSENT:   'Absent',
  LEAVE:    'Leave',
  HALF_DAY: 'Half Day',
}

type Tab = 'daily' | 'history'

// ── Helpers ───────────────────────────────────────────────────────────────────

function monthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString('en-US', { month: 'long' })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SummaryPills({ items }: { items: DailyAttendanceItem[] }) {
  const counts = useMemo(() => {
    const c: Record<string, number> = { PRESENT: 0, ABSENT: 0, LEAVE: 0, HALF_DAY: 0, UNMARKED: 0 }
    items.forEach(({ record }) => {
      if (record) c[record.status] = (c[record.status] ?? 0) + 1
      else        c.UNMARKED++
    })
    return c
  }, [items])

  return (
    <div className="daily-summary-pills">
      <span className="sum-pill sum-present">✓ {counts.PRESENT} Present</span>
      <span className="sum-pill sum-absent">✗ {counts.ABSENT} Absent</span>
      <span className="sum-pill sum-leave">⏸ {counts.LEAVE} Leave</span>
      <span className="sum-pill sum-half_day">½ {counts.HALF_DAY} Half Day</span>
      <span className="sum-pill sum-unmarked">— {counts.UNMARKED} Unmarked</span>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const toast = useToast()

  // ── Shared ─────────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>('daily')

  // ── Daily tab ──────────────────────────────────────────────────────────────
  const [dailyDate, setDailyDate]       = useState(toInputDate())
  const [dailyItems, setDailyItems]     = useState<DailyAttendanceItem[]>([])
  const [loadingDaily, setLoadingDaily] = useState(false)
  const [deptFilter, setDeptFilter]     = useState('')
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | ''>('')
  const [saving, setSaving]             = useState<number | null>(null)

  // ── History tab ────────────────────────────────────────────────────────────
  const [employees, setEmployees]   = useState<Employee[]>([])
  const [loadingEmp, setLoadingEmp] = useState(true)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [records, setRecords]       = useState<AttendanceRecord[]>([])
  const [loadingRec, setLoadingRec] = useState(false)
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')
  const [summary, setSummary]       = useState<AttendanceMonthlySummary | null>(null)
  const [loadingSum, setLoadingSum] = useState(false)
  const todayDate = new Date()
  const [sumYear, setSumYear]   = useState(todayDate.getFullYear())
  const [sumMonth, setSumMonth] = useState(todayDate.getMonth() + 1)

  // ── Derived ────────────────────────────────────────────────────────────────

  const departments = useMemo(
    () => [...new Set(dailyItems.map(i => i.employee.department).filter(Boolean))].sort(),
    [dailyItems],
  )

  const filteredDaily = useMemo(() => {
    return dailyItems.filter(item => {
      if (deptFilter && item.employee.department !== deptFilter) return false
      if (statusFilter) {
        if (item.record === null) return false
        if (item.record.status !== statusFilter) return false
      }
      return true
    })
  }, [dailyItems, deptFilter, statusFilter])

  const dateRangeError =
    fromDate && toDate && fromDate > toDate
      ? '"From" date must not be after "To" date.'
      : null

  const selectedEmployee = employees.find(e => e.id === selectedId) ?? null

  // ── Data loaders ───────────────────────────────────────────────────────────

  async function loadDailyView(date: string) {
    setLoadingDaily(true)
    try {
      const res = await attendanceApi.getDailyView(date)
      setDailyItems(res.data ?? [])
    } catch (err) {
      toast.error(mapApiError(err))
    } finally {
      setLoadingDaily(false)
    }
  }

  useEffect(() => {
    loadDailyView(dailyDate)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dailyDate])

  useEffect(() => {
    employeesApi.list()
      .then(res => setEmployees(res.data ?? []))
      .catch(() => toast.error('Failed to load employees.'))
      .finally(() => setLoadingEmp(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (selectedId === null || dateRangeError) return
    setLoadingRec(true)
    attendanceApi
      .listByEmployee(selectedId, { from: fromDate || undefined, to: toDate || undefined })
      .then(res => setRecords(res.data ?? []))
      .catch(err => toast.error(mapApiError(err, { 404: 'Employee not found.' })))
      .finally(() => setLoadingRec(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, fromDate, toDate])

  useEffect(() => {
    if (selectedId === null) return
    setLoadingSum(true)
    attendanceApi
      .getMonthlySummary(selectedId, sumYear, sumMonth)
      .then(res => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSum(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, sumYear, sumMonth])

  // ── Handlers ───────────────────────────────────────────────────────────────

  async function handleInlineStatus(employeeId: number, newStatus: AttendanceStatus | '') {
    if (!newStatus) return
    setSaving(employeeId)
    try {
      await attendanceApi.upsert(employeeId, { date: dailyDate, status: newStatus })
      const res = await attendanceApi.getDailyView(dailyDate)
      setDailyItems(res.data ?? [])
      toast.success(`Marked ${STATUS_LABEL[newStatus]}`)
    } catch (err) {
      toast.error(mapApiError(err))
    } finally {
      setSaving(null)
    }
  }

  function handleEmployeeSelect(val: string) {
    setSelectedId(val ? Number(val) : null)
    setRecords([])
    setSummary(null)
    setFromDate('')
    setToDate('')
  }

  function setLastNDays(n: number) {
    const to   = new Date()
    const from = new Date()
    from.setDate(from.getDate() - (n - 1))
    setFromDate(toInputDate(from))
    setToDate(toInputDate(to))
  }

  // ── Table columns ──────────────────────────────────────────────────────────

  const dailyColumns: Column<DailyAttendanceItem>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: ({ employee }) => (
        <span>
          <span className="font-mono text-sm text-muted">{employee.employee_code}</span>
          {' '}
          <span>{employee.full_name}</span>
        </span>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      render: ({ employee }) => (
        <span className="text-muted text-sm">{employee.department}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: ({ record }) =>
        record
          ? <Badge status={record.status} />
          : <span className="badge badge-unmarked">Unmarked</span>,
    },
    {
      key: 'action',
      header: 'Mark',
      render: ({ employee, record }) => (
        <select
          className="att-status-select"
          data-status={record?.status ?? ''}
          value={record?.status ?? ''}
          disabled={saving === employee.id}
          onChange={e => handleInlineStatus(employee.id, e.target.value as AttendanceStatus | '')}
        >
          <option value="">— Mark —</option>
          {ALL_STATUSES.map(s => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
      ),
    },
  ]

  const historyColumns: Column<AttendanceRecord>[] = [
    {
      key: 'date',
      header: 'Date',
      render: r => <span className="font-mono">{formatDateOnly(r.date)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: r => <Badge status={r.status} />,
    },
    {
      key: 'created_at',
      header: 'Marked On',
      render: r => <span className="text-muted text-sm">{formatDate(r.created_at)}</span>,
    },
  ]

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Page header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Attendance</h2>
          <p className="page-subtitle">Track and manage employee attendance records</p>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="tab-nav">
        <button
          className={`tab-btn${tab === 'daily' ? ' tab-btn-active' : ''}`}
          onClick={() => setTab('daily')}
        >
          📅 Daily View
        </button>
        <button
          className={`tab-btn${tab === 'history' ? ' tab-btn-active' : ''}`}
          onClick={() => setTab('history')}
        >
          📊 History
        </button>
      </div>

      {/* ══════════════════ DAILY TAB ══════════════════ */}
      {tab === 'daily' && (
        <>
          <Card className="mb-4">
            <div className="card-body">
              <div className="daily-toolbar">
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={dailyDate}
                    onChange={e => setDailyDate(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Department</label>
                  <select
                    className="form-select"
                    value={deptFilter}
                    onChange={e => setDeptFilter(e.target.value)}
                  >
                    <option value="">All departments</option>
                    {departments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value as AttendanceStatus | '')}
                  >
                    <option value="">All statuses</option>
                    {ALL_STATUSES.map(s => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>

                {(deptFilter || statusFilter) && (
                  <div className="form-group daily-clear-wrap">
                    <label className="form-label">&nbsp;</label>
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={() => { setDeptFilter(''); setStatusFilter('') }}
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {dailyItems.length > 0 && <SummaryPills items={dailyItems} />}

          <Card>
            <CardHeader>
              <span className="card-title">
                {formatDateOnly(dailyDate)}
                {' '}
                <span className="card-title-count">
                  {filteredDaily.length} employee{filteredDaily.length !== 1 ? 's' : ''}
                </span>
              </span>
            </CardHeader>

            {loadingDaily ? (
              <Spinner />
            ) : dailyItems.length === 0 ? (
              <EmptyState
                icon="📅"
                title="No employees found"
                message="Add employees first to mark attendance."
              />
            ) : filteredDaily.length === 0 ? (
              <EmptyState
                icon="🔍"
                title="No matches"
                message="No employees match the current filters."
              />
            ) : (
              <Table
                columns={dailyColumns}
                data={filteredDaily}
                keyExtractor={i => i.employee.id}
              />
            )}
          </Card>
        </>
      )}

      {/* ══════════════════ HISTORY TAB ══════════════════ */}
      {tab === 'history' && (
        <>
          <Card className="mb-4">
            <div className="card-body">
              <div className="form-group" style={{ maxWidth: 360 }}>
                <label className="form-label">Select Employee</label>
                {loadingEmp ? (
                  <p className="text-muted text-sm">Loading employees…</p>
                ) : (
                  <select
                    className="form-select"
                    value={selectedId ?? ''}
                    onChange={e => handleEmployeeSelect(e.target.value)}
                  >
                    <option value="">— Select an employee —</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.full_name} ({emp.employee_code})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </Card>

          {!selectedEmployee && (
            <EmptyState
              icon="👆"
              title="Select an employee"
              message="Choose an employee above to view their attendance history and monthly summary."
            />
          )}

          {selectedEmployee && (
            <>
              {/* Monthly Summary */}
              <Card className="mb-4">
                <CardHeader>
                  <span className="card-title">Monthly Summary — {selectedEmployee.full_name}</span>
                  <div className="summary-month-picker">
                    <select
                      className="form-select form-select-sm"
                      value={sumMonth}
                      onChange={e => setSumMonth(Number(e.target.value))}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{monthName(m)}</option>
                      ))}
                    </select>
                    <select
                      className="form-select form-select-sm"
                      value={sumYear}
                      onChange={e => setSumYear(Number(e.target.value))}
                    >
                      {Array.from({ length: 5 }, (_, i) => todayDate.getFullYear() - 2 + i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </CardHeader>

                {loadingSum ? (
                  <Spinner />
                ) : summary && summary.total > 0 ? (
                  <div className="monthly-summary-grid">
                    <div className="month-stat month-stat-present">
                      <span className="month-stat-value">{summary.present}</span>
                      <span className="month-stat-label">Present</span>
                    </div>
                    <div className="month-stat month-stat-absent">
                      <span className="month-stat-value">{summary.absent}</span>
                      <span className="month-stat-label">Absent</span>
                    </div>
                    <div className="month-stat month-stat-leave">
                      <span className="month-stat-value">{summary.leave}</span>
                      <span className="month-stat-label">Leave</span>
                    </div>
                    <div className="month-stat month-stat-half">
                      <span className="month-stat-value">{summary.half_day}</span>
                      <span className="month-stat-label">Half Day</span>
                    </div>
                    <div className="month-stat month-stat-rate">
                      <span className="month-stat-value">{summary.rate.toFixed(1)}%</span>
                      <span className="month-stat-label">Rate</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon="📊"
                    title="No records"
                    message={`No attendance data for ${monthName(sumMonth)} ${sumYear}.`}
                  />
                )}
              </Card>

              {/* Attendance History */}
              <Card>
                <CardHeader>
                  <span className="card-title">History — {selectedEmployee.full_name}</span>
                </CardHeader>

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
                    {dateRangeError && <p className="field-error">{dateRangeError}</p>}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Quick range</label>
                    <div className="date-shortcuts">
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setLastNDays(7)}>7 days</button>
                      <button className="btn btn-ghost btn-sm" type="button" onClick={() => setLastNDays(30)}>30 days</button>
                      {(fromDate || toDate) && (
                        <button className="btn btn-ghost btn-sm" type="button" onClick={() => { setFromDate(''); setToDate('') }}>
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {loadingRec ? (
                  <Spinner />
                ) : records.length === 0 ? (
                  <EmptyState
                    icon="📅"
                    title="No records"
                    message={
                      fromDate || toDate
                        ? 'No records for the selected date range.'
                        : 'No attendance records found for this employee.'
                    }
                  />
                ) : (
                  <Table
                    columns={historyColumns}
                    data={records}
                    keyExtractor={r => r.id}
                  />
                )}
              </Card>
            </>
          )}
        </>
      )}
    </>
  )
}
