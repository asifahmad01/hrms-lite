import type { EmployeeStatus, EmploymentType } from '../api/employees'

// ── Departments ────────────────────────────────────────────────────────────────

export const DEPARTMENTS: string[] = [
  'Engineering',
  'Product',
  'Design',
  'Marketing',
  'Sales',
  'Finance',
  'Human Resources',
  'Operations',
  'Customer Support',
  'Legal',
]

// ── Locations ──────────────────────────────────────────────────────────────────

export const LOCATIONS: string[] = [
  'New York',
  'San Francisco',
  'Austin',
  'Chicago',
  'London',
  'Toronto',
  'Remote',
]

// ── Employment type labels ─────────────────────────────────────────────────────

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: 'Full-time',
  PART_TIME: 'Part-time',
  CONTRACT:  'Contract',
  INTERN:    'Intern',
}

// ── Status labels ──────────────────────────────────────────────────────────────

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  ACTIVE:     'Active',
  INACTIVE:   'Inactive',
  ON_LEAVE:   'On Leave',
  TERMINATED: 'Terminated',
}

// ── Badge CSS class map ────────────────────────────────────────────────────────

export const STATUS_BADGE_CLASS: Record<EmployeeStatus, string> = {
  ACTIVE:     'badge badge-active',
  INACTIVE:   'badge badge-inactive',
  ON_LEAVE:   'badge badge-on-leave',
  TERMINATED: 'badge badge-terminated',
}

export const EMPLOYMENT_BADGE_CLASS: Record<EmploymentType, string> = {
  FULL_TIME: 'badge badge-full-time',
  PART_TIME: 'badge badge-part-time',
  CONTRACT:  'badge badge-contract',
  INTERN:    'badge badge-intern',
}
