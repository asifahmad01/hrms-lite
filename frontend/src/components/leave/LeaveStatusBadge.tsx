import type { LeaveStatus } from '../../api/leave_requests'
import { LEAVE_STATUS_BADGE_CLASS, LEAVE_STATUS_LABELS } from '../../constants/leave'

interface LeaveStatusBadgeProps {
  status: LeaveStatus
}

export default function LeaveStatusBadge({ status }: LeaveStatusBadgeProps) {
  return (
    <span className={LEAVE_STATUS_BADGE_CLASS[status]}>
      {LEAVE_STATUS_LABELS[status]}
    </span>
  )
}
