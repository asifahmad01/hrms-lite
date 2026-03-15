import { api } from './client'

// ── Types ──────────────────────────────────────────────────────────────────────

export type LeaveType =
  | 'ANNUAL'
  | 'SICK'
  | 'CASUAL'
  | 'UNPAID'
  | 'MATERNITY'
  | 'PATERNITY'

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface LeaveRequest {
  id:          number
  employee_fk: number
  leave_type:  LeaveType
  start_date:  string   // "YYYY-MM-DD"
  end_date:    string   // "YYYY-MM-DD"
  reason:      string
  status:      LeaveStatus
  created_at:  string
}

export interface CreateLeaveRequestPayload {
  leave_type:  LeaveType
  start_date:  string
  end_date:    string
  reason:      string
}

// ── API ────────────────────────────────────────────────────────────────────────

export const leaveRequestsApi = {
  /** GET /api/v1/leaves?status= — all requests (admin view) */
  listAll: (params?: { status?: LeaveStatus }) => {
    const qs = params?.status ? `?status=${params.status}` : ''
    return api.get<LeaveRequest[]>(`/api/v1/leaves${qs}`)
  },

  /** GET /api/v1/employees/{id}/leaves?status= — requests for one employee */
  listByEmployee: (employeeId: number, params?: { status?: LeaveStatus }) => {
    const qs = params?.status ? `?status=${params.status}` : ''
    return api.get<LeaveRequest[]>(`/api/v1/employees/${employeeId}/leaves${qs}`)
  },

  /** POST /api/v1/employees/{id}/leaves */
  create: (employeeId: number, payload: CreateLeaveRequestPayload) =>
    api.post<LeaveRequest>(`/api/v1/employees/${employeeId}/leaves`, payload),

  /** PATCH /api/v1/leaves/{id}/status */
  updateStatus: (leaveId: number, status: 'APPROVED' | 'REJECTED') =>
    api.patch<LeaveRequest>(`/api/v1/leaves/${leaveId}/status`, { status }),

  /** DELETE /api/v1/leaves/{id} — PENDING only */
  delete: (leaveId: number) =>
    api.delete<null>(`/api/v1/leaves/${leaveId}`),
}
