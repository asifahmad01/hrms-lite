/**
 * AttendanceSummaryCards
 *
 * Five stat cards arranged in a responsive grid showing the key attendance
 * metrics: Present, Absent, Leave, Half Day, and Attendance Rate.
 *
 * Works with both:
 *   - API response  →  AttendanceMonthlySummary from attendanceApi.getMonthlySummary()
 *   - Local records →  computeAttendanceSummary(records) from utils/attendance
 *
 * Usage:
 *   <AttendanceSummaryCards summary={summary} loading={loadingSum} />
 *
 *   // With a subtitle on each card (e.g. current month)
 *   <AttendanceSummaryCards summary={summary} subtitle="March 2026" />
 */

import type { AttendanceSummary } from '../../utils/attendance'
import StatCard from '../ui/StatCard'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AttendanceSummaryCardsProps {
  /** Summary data — from API or computeAttendanceSummary() */
  summary: AttendanceSummary | null
  /** Show skeleton shimmer while loading */
  loading?: boolean
  /** Optional secondary line on each card, e.g. "March 2026" or "Last 30 days" */
  subtitle?: string
  /** Extra CSS class on the grid wrapper */
  className?: string
}

// ── Config ─────────────────────────────────────────────────────────────────────

const CARDS = [
  {
    key:       'present' as const,
    title:     'Present',
    icon:      '✅',
    iconClass: 'stat-icon-green',
    getValue:  (s: AttendanceSummary) => s.present,
  },
  {
    key:       'absent' as const,
    title:     'Absent',
    icon:      '❌',
    iconClass: 'stat-icon-red',
    getValue:  (s: AttendanceSummary) => s.absent,
  },
  {
    key:       'leave' as const,
    title:     'On Leave',
    icon:      '🏖️',
    iconClass: 'stat-icon-yellow',
    getValue:  (s: AttendanceSummary) => s.leave,
  },
  {
    key:       'half_day' as const,
    title:     'Half Day',
    icon:      '⏰',
    iconClass: 'stat-icon-purple',
    getValue:  (s: AttendanceSummary) => s.half_day,
  },
  {
    key:       'rate' as const,
    title:     'Attendance Rate',
    icon:      '📈',
    iconClass: 'stat-icon-blue',
    getValue:  (s: AttendanceSummary) =>
      s.total === 0 ? '—' : `${s.rate.toFixed(1)}%`,
  },
] as const

// ── Component ──────────────────────────────────────────────────────────────────

export default function AttendanceSummaryCards({
  summary,
  loading = false,
  subtitle,
  className,
}: AttendanceSummaryCardsProps) {
  return (
    <div className={`att-summary-cards-grid${className ? ` ${className}` : ''}`}>
      {CARDS.map(card => (
        <StatCard
          key={card.key}
          title={card.title}
          icon={card.icon}
          iconClass={card.iconClass}
          value={summary ? card.getValue(summary) : 0}
          subtitle={subtitle}
          loading={loading || summary === null}
        />
      ))}
    </div>
  )
}
