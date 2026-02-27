import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/employees': 'Employees',
  '/attendance': 'Attendance',
}

export default function Topbar() {
  const { pathname } = useLocation()
  const title = PAGE_TITLES[pathname] ?? 'HRMS Lite'

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
    </header>
  )
}
