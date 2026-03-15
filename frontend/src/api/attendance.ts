import { api } from './client'
import type { Employee } from './employees'

// ── Types ──────────────────────────────────────────────────────────────────────

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LEAVE' | 'HALF_DAY'

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

/** One row in the daily view — employee + optional attendance record */
export interface DailyAttendanceItem {
  employee: Employee
  record: AttendanceRecord | null
}

/** Monthly aggregate returned by GET .../attendance/summary */
export interface AttendanceMonthlySummary {
  present:  number
  absent:   number
  leave:    number
  half_day: number
  total:    number
  rate:     number  // (present + half_day*0.5) / total * 100
}

// ── API ────────────────────────────────────────────────────────────────────────

export const attendanceApi = {
  /** GET /api/v1/attendance/daily?date=YYYY-MM-DD */
  getDailyView: (date: string) =>
    api.get<DailyAttendanceItem[]>(`/api/v1/attendance/daily?date=${date}`),

  /** GET /api/v1/employees/{id}/attendance?from=&to= */
  listByEmployee: (employeeId: number, params?: { from?: string; to?: string }) => {
    const qs = new URLSearchParams()
    if (params?.from) qs.set('from', params.from)
    if (params?.to)   qs.set('to',   params.to)
    const query = qs.toString() ? `?${qs}` : ''
    return api.get<AttendanceRecord[]>(
      `/api/v1/employees/${employeeId}/attendance${query}`,
    )
  },

  /** GET /api/v1/employees/{id}/attendance/summary?year=&month= */
  getMonthlySummary: (employeeId: number, year: number, month: number) =>
    api.get<AttendanceMonthlySummary>(
      `/api/v1/employees/${employeeId}/attendance/summary?year=${year}&month=${month}`,
    ),

  /** POST /api/v1/employees/{id}/attendance  — strict, 409 if duplicate */
  mark: (employeeId: number, payload: MarkAttendancePayload) =>
    api.post<AttendanceRecord>(
      `/api/v1/employees/${employeeId}/attendance`,
      payload,
    ),

  /** PATCH /api/v1/employees/{id}/attendance  — upsert (create or update) */
  upsert: (employeeId: number, payload: MarkAttendancePayload) =>
    api.patch<AttendanceRecord>(
      `/api/v1/employees/${employeeId}/attendance`,
      payload,
    ),
}
