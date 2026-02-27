import type { AttendanceStatus } from '../../api/attendance'

interface BadgeProps {
  status: AttendanceStatus
}

export default function Badge({ status }: BadgeProps) {
  return (
    <span className={`badge badge-${status.toLowerCase()}`}>
      {status}
    </span>
  )
}
