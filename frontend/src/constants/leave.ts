import type { LeaveStatus, LeaveType } from '../api/leave_requests'

// ── Leave type labels ──────────────────────────────────────────────────────────

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  ANNUAL:    'Annual',
  SICK:      'Sick',
  CASUAL:    'Casual',
  UNPAID:    'Unpaid',
  MATERNITY: 'Maternity',
  PATERNITY: 'Paternity',
}

export const LEAVE_TYPE_ICON: Record<LeaveType, string> = {
  ANNUAL:    '🏖️',
  SICK:      '🤒',
  CASUAL:    '🌤️',
  UNPAID:    '💸',
  MATERNITY: '👶',
  PATERNITY: '👨‍👶',
}

// ── Leave status labels + badge classes ────────────────────────────────────────

export const LEAVE_STATUS_LABELS: Record<LeaveStatus, string> = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export const LEAVE_STATUS_BADGE_CLASS: Record<LeaveStatus, string> = {
  PENDING:  'badge badge-pending',
  APPROVED: 'badge badge-approved',
  REJECTED: 'badge badge-rejected',
}
