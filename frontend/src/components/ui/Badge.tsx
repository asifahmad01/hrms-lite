import type { AttendanceStatus } from '../../api/attendance'

const LABELS: Record<AttendanceStatus, string> = {
  PRESENT:  'Present',
  ABSENT:   'Absent',
  LEAVE:    'Leave',
  HALF_DAY: 'Half Day',
}

interface BadgeProps {
  status: AttendanceStatus
}

export default function Badge({ status }: BadgeProps) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
