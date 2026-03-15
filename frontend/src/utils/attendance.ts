import type { AttendanceRecord } from '../api/attendance'

/**
 * Attendance summary shape — matches the backend AttendanceMonthlySummary
 * schema, so API responses and locally-computed values are interchangeable.
 */
export interface AttendanceSummary {
  present:  number
  absent:   number
  leave:    number
  half_day: number
  total:    number
  /** (present + half_day * 0.5) / total * 100  —  0 when total is 0 */
  rate:     number
}

/**
 * Compute an AttendanceSummary from a local array of AttendanceRecord objects.
 * Useful when you already have records in state and don't need an extra API call.
 *
 * @example
 * const summary = computeAttendanceSummary(records)
 */
export function computeAttendanceSummary(records: AttendanceRecord[]): AttendanceSummary {
  const counts = { present: 0, absent: 0, leave: 0, half_day: 0 }

  for (const r of records) {
    switch (r.status) {
      case 'PRESENT':  counts.present++;  break
      case 'ABSENT':   counts.absent++;   break
      case 'LEAVE':    counts.leave++;    break
      case 'HALF_DAY': counts.half_day++; break
    }
  }

  const total = records.length
  const rate  = total > 0
    ? ((counts.present + counts.half_day * 0.5) / total) * 100
    : 0

  return { ...counts, total, rate }
}
