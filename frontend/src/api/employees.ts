import { api } from './client'

// ── Enums ──────────────────────────────────────────────────────────────────────

export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED'

// ── Interfaces ─────────────────────────────────────────────────────────────────

export interface Employee {
  id: number
  employee_code: string
  full_name: string
  email: string
  department: string
  phone: string | null
  designation: string | null
  joining_date: string | null    // ISO date string "YYYY-MM-DD"
  employment_type: EmploymentType
  status: EmployeeStatus
  manager_name: string | null
  location: string | null
  created_at: string
}

export interface CreateEmployeePayload {
  employee_code: string
  full_name: string
  email: string
  department: string
  phone?: string
  designation?: string
  joining_date?: string          // "YYYY-MM-DD"
  employment_type?: EmploymentType
  manager_name?: string
  location?: string
}

export interface UpdateEmployeePayload {
  full_name?: string
  email?: string
  department?: string
  phone?: string
  designation?: string
  joining_date?: string          // "YYYY-MM-DD"
  employment_type?: EmploymentType
  status?: EmployeeStatus
  manager_name?: string
  location?: string
}

// ── API ────────────────────────────────────────────────────────────────────────

export const employeesApi = {
  list:    ()                                    => api.get<Employee[]>('/api/v1/employees/'),
  getById: (id: number)                          => api.get<Employee>(`/api/v1/employees/${id}`),
  create:  (payload: CreateEmployeePayload)      => api.post<Employee>('/api/v1/employees/', payload),
  update:  (id: number, payload: UpdateEmployeePayload) =>
                                                    api.patch<Employee>(`/api/v1/employees/${id}`, payload),
  delete:  (id: number)                          => api.delete<null>(`/api/v1/employees/${id}`),
}
