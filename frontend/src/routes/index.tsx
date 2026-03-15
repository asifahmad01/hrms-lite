import { createBrowserRouter, Navigate } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import AttendancePage from '../pages/attendance/AttendancePage'
import DashboardPage from '../pages/dashboard/DashboardPage'
import EmployeeProfilePage from '../pages/employees/EmployeeProfilePage'
import EmployeesPage from '../pages/employees/EmployeesPage'
import LeaveRequestsPage from '../pages/leave/LeaveRequestsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Redirect root → /dashboard
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard',      element: <DashboardPage /> },
      { path: 'employees',      element: <EmployeesPage /> },
      { path: 'employees/:id',  element: <EmployeeProfilePage /> },
      { path: 'attendance',     element: <AttendancePage /> },
      { path: 'leave',          element: <LeaveRequestsPage /> },
    ],
  },
])
