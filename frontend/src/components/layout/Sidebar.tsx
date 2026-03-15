import { NavLink } from 'react-router-dom'

// ── Nav structure ─────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Main Menu',
    items: [
      { to: '/dashboard',  label: 'Dashboard',  icon: '📊' },
      { to: '/employees',  label: 'Employees',  icon: '👥' },
      { to: '/attendance', label: 'Attendance', icon: '📅' },
    ],
  },
  {
    label: 'Management',
    items: [
      { to: '/leave',   label: 'Leave Requests', icon: '🏖️' },
      { to: '/reports', label: 'Reports',        icon: '📈' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/settings', label: 'Settings', icon: '⚙️' },
    ],
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  return (
    <aside className="sidebar">

      {/* ── Logo / brand ──────────────────────────────────────────────────── */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-mark" aria-hidden="true">HR</div>
        <div>
          <div className="sidebar-logo-text">HRMS Lite</div>
          <div className="sidebar-logo-sub">Human Resources</div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────── */}
      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_GROUPS.map(group => (
          <div key={group.label} className="sidebar-nav-group">
            <div className="sidebar-nav-label">{group.label}</div>

            {group.items.map(item => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `sidebar-link${isActive ? ' active' : ''}`
                }
              >
                <span className="sidebar-link-icon" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── User profile ──────────────────────────────────────────────────── */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-user-avatar" aria-hidden="true">AU</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">Admin User</div>
            <div className="sidebar-user-role">HR Manager</div>
          </div>
        </div>
      </div>

    </aside>
  )
}
