import { api } from './client'
import type { AttendanceStatus } from './attendance'
import type { Employee } from './employees'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TodaySummaryItem {
  employee_code: string
  full_name: string
  status: AttendanceStatus
}

export interface DashboardStats {
  total_employees: number
  present_today: number
  absent_today: number
  departments_count: number
  attendance_rate_today: number      // 0–100 percentage
  recent_employees: Employee[]       // last 5 by join date
  today_summary: TodaySummaryItem[]  // all attendance records for today
}

// ── API ───────────────────────────────────────────────────────────────────────

export const dashboardApi = {
  getStats: () => api.get<DashboardStats>('/api/v1/dashboard/stats'),
}
