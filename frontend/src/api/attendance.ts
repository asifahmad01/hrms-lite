import { api } from './client'

export type AttendanceStatus = 'PRESENT' | 'ABSENT'

export interface AttendanceRecord {
  id: number
  employee_fk: number
  date: string
  status: AttendanceStatus
  created_at: string
}

export interface MarkAttendancePayload {
  date: string
  status: AttendanceStatus
}

export const attendanceApi = {
  listByEmployee: (employeeId: number, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to)   qs.set('to',   params.to)
    const query = qs.toString() ? `?${qs}` : ''
    return api.get<AttendanceRecord[]>(
      `/api/v1/employees/${employeeId}/attendance${query}`,
    )
  },

  mark: (employeeId: number, payload: MarkAttendancePayload) =>
    api.post<AttendanceRecord>(
      `/api/v1/employees/${employeeId}/attendance`,
      payload,
    ),
}
