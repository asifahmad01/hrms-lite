import { api } from './client'

export interface Employee {
  id: number
  employee_id: string
  full_name: string
  email: string
  department: string
  created_at: string
}

export interface CreateEmployeePayload {
  employee_id: string
  full_name: string
  email: string
  department: string
}

export const employeesApi = {
  list:    ()                                => api.get<Employee[]>('/api/v1/employees/'),
  getById: (id: number)                     => api.get<Employee>(`/api/v1/employees/${id}`),
  create:  (payload: CreateEmployeePayload) => api.post<Employee>('/api/v1/employees/', payload),
  delete:  (id: number)                     => api.delete<null>(`/api/v1/employees/${id}`),
}
