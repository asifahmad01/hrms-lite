/**
 * AttendanceSummaryBar
 *
 * A compact horizontal bar of coloured pills showing all five attendance
 * metrics. Designed for tight spaces — card headers, page subtitles, or
 * next to a date picker inside the Attendance / Dashboard pages.
 *
 * Works with both:
 *   - API response  →  AttendanceMonthlySummary from attendanceApi.getMonthlySummary()
 *   - Local records →  computeAttendanceSummary(records) from utils/attendance
 *
 * Usage:
 *   // Full — all five pills
 *   <AttendanceSummaryBar summary={summary} />
 *
 *   // Omit rate pill
 *   <AttendanceSummaryBar summary={summary} showRate={false} />
 *
 *   // Inside a CardHeader next to a title
 *   <CardHeader>
 *     <span className="card-title">Daily View</span>
 *     <AttendanceSummaryBar summary={computeAttendanceSummary(records)} />
 *   </CardHeader>
 */

import type { AttendanceSummary } from '../../utils/attendance'

// ── Types ──────────────────────────────────────────────────────────────────────

interface AttendanceSummaryBarProps {
  /** Summary data — from API or computeAttendanceSummary() */
  summary: AttendanceSummary | null
  /** Hide the rate pill (default: true — show it) */
  showRate?: boolean
  /** Extra CSS class on the bar wrapper */
  className?: string
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function AttendanceSummaryBar({
  summary,
  showRate = true,
  className,
}: AttendanceSummaryBarProps) {
  if (!summary) return null

  return (
    <div className={`att-summary-bar${className ? ` ${className}` : ''}`}>
      <span className="att-sum-pill att-sum-present">
        ✓ {summary.present} <span className="att-sum-label">Present</span>
      </span>

      <span className="att-sum-pill att-sum-absent">
        ✗ {summary.absent} <span className="att-sum-label">Absent</span>
      </span>

      <span className="att-sum-pill att-sum-leave">
        ⏸ {summary.leave} <span className="att-sum-label">Leave</span>
      </span>

      <span className="att-sum-pill att-sum-half_day">
        ½ {summary.half_day} <span className="att-sum-label">Half Day</span>
      </span>

      {showRate && summary.total > 0 && (
        <span className="att-sum-pill att-sum-rate">
          📈 {summary.rate.toFixed(1)}%
        </span>
      )}
    </div>
  )
}
