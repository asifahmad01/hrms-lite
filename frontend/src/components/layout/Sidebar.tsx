import { NavLink } from 'react-router-dom'

const NAV_ITEMS = [
  { to: '/employees', label: 'Employees', icon: '👥' },
  { to: '/attendance', label: 'Attendance', icon: '📅' },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-text">HRMS Lite</div>
        <div className="sidebar-logo-sub">Human Resource Management</div>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-nav-label">Main Menu</div>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-link-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
