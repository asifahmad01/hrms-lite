import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import AttendancePage from '../pages/attendance/AttendancePage'
import EmployeesPage from '../pages/employees/EmployeesPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Redirect root → /employees
      { index: true, element: <Navigate to="/employees" replace /> },
      { path: 'employees', element: <EmployeesPage /> },
      { path: 'attendance', element: <AttendancePage /> },
    ],
  },
])
