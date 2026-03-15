import { useEffect, useState } from 'react'
import { type DashboardStats, dashboardApi } from '../../api/dashboard'
import { mapApiError } from '../../api/errors'
import Badge from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import EmptyState from '../../components/ui/EmptyState'
import PageError from '../../components/ui/PageError'
import StatCard from '../../components/ui/StatCard'
import Table, { type Column } from '../../components/ui/Table'
import type { Employee } from '../../api/employees'
import type { TodaySummaryItem } from '../../api/dashboard'
import { formatDate } from '../../utils/format'

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Today as "Mar 14, 2026" — shown as the subtitle on attendance stat cards. */
function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Format attendance rate: returns "—" when there are no employees yet. */
function formatRate(rate: number, totalEmployees: number): string {
  if (totalEmployees === 0) return '—'
  return `${rate.toFixed(1)}%`
}

// ── Table column definitions ──────────────────────────────────────────────────

const recentColumns: Column<Employee>[] = [
  {
    key: 'employee_code',
    header: 'Code',
    render: e => <span className="font-mono">{e.employee_code}</span>,
  },
  { key: 'full_name',  header: 'Name' },
  { key: 'department', header: 'Department' },
  {
    key: 'created_at',
    header: 'Joined',
    render: e => (
      <span className="text-muted text-sm">{formatDate(e.created_at)}</span>
    ),
  },
]

const summaryColumns: Column<TodaySummaryItem>[] = [
  { key: 'full_name', header: 'Name' },
  {
    key: 'employee_code',
    header: 'Code',
    render: r => <span className="font-mono">{r.employee_code}</span>,
  },
  {
    key: 'status',
    header: 'Status',
    render: r => <Badge status={r.status} />,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats]     = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  async function loadStats() {
    try {
      setLoading(true)
      setError(null)
      const res = await dashboardApi.getStats()
      setStats(res.data)
    } catch (err) {
      setError(mapApiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStats() }, [])

  // ── Derived values (safe defaults during loading) ──────────────────────────

  const today           = todayLabel()
  const totalEmployees  = stats?.total_employees  ?? 0
  const presentToday    = stats?.present_today    ?? 0
  const absentToday     = stats?.absent_today     ?? 0
  const departmentCount = stats?.departments_count ?? 0
  const rateToday       = stats?.attendance_rate_today ?? 0

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Dashboard</h2>
          <p className="page-subtitle">
            Welcome back — here's your organisation at a glance
          </p>
        </div>
        <span className="text-muted text-sm">{today}</span>
      </div>

      {/* ── Load error ──────────────────────────────────────────────────── */}
      {error && <PageError message={error} onRetry={loadStats} />}

      {/* ── Stat cards grid ─────────────────────────────────────────────── */}
      <div className="dashboard-stats-grid">
        <StatCard
          title="Total Employees"
          value={loading ? 0 : totalEmployees}
          subtitle="Active headcount"
          icon="👥"
          iconClass="stat-icon-blue"
          loading={loading}
        />
        <StatCard
          title="Present Today"
          value={loading ? 0 : presentToday}
          subtitle={today}
          icon="✅"
          iconClass="stat-icon-green"
          loading={loading}
        />
        <StatCard
          title="Absent Today"
          value={loading ? 0 : absentToday}
          subtitle={today}
          icon="❌"
          iconClass="stat-icon-red"
          loading={loading}
        />
        <StatCard
          title="Departments"
          value={loading ? 0 : departmentCount}
          subtitle={
            loading
              ? undefined
              : formatRate(rateToday, totalEmployees) !== '—'
                ? `${formatRate(rateToday, totalEmployees)} attendance rate`
                : 'Unique departments'
          }
          icon="🏢"
          iconClass="stat-icon-purple"
          loading={loading}
        />
      </div>

      {/* ── Two-column bottom section ────────────────────────────────────── */}
      <div className="dashboard-sections">

        {/* Recently joined employees */}
        <Card>
          <CardHeader>
            <span className="card-title">Recently Joined</span>
            <span className="text-muted text-sm">Last 5 employees</span>
          </CardHeader>

          {loading ? (
            <div className="dashboard-section-skeleton">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          ) : !stats || stats.recent_employees.length === 0 ? (
            <EmptyState
              icon="👤"
              title="No employees yet"
              message="Add your first employee to see them here."
            />
          ) : (
            <Table
              columns={recentColumns}
              data={stats.recent_employees}
              keyExtractor={e => e.id}
            />
          )}
        </Card>

        {/* Today's attendance summary */}
        <Card>
          <CardHeader>
            <span className="card-title">Today's Attendance</span>
            <span className="text-muted text-sm">{today}</span>
          </CardHeader>

          {loading ? (
            <div className="dashboard-section-skeleton">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-row" />
              ))}
            </div>
          ) : !stats || stats.today_summary.length === 0 ? (
            <EmptyState
              icon="📅"
              title="No attendance marked today"
              message="Use the Attendance page to mark today's records."
            />
          ) : (
            <Table
              columns={summaryColumns}
              data={stats.today_summary}
              keyExtractor={r => r.employee_code}
            />
          )}
        </Card>

      </div>
    </>
  )
}
