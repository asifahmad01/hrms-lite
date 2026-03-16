import { useLocation } from 'react-router-dom'

// ── Page metadata ─────────────────────────────────────────────────────────────

interface PageMeta {
  title: string
  subtitle: string
}

const PAGE_META: Record<string, PageMeta> = {
  '/dashboard':  { title: 'Dashboard',      subtitle: 'Overview & key metrics'         },
  '/employee-management':  { title: 'Employees',      subtitle: 'Manage employee records'        },
  '/attendance': { title: 'Attendance',     subtitle: 'Track daily attendance'         },
  '/leave':      { title: 'Leave Requests', subtitle: 'Manage time-off requests'       },
  '/reports':    { title: 'Reports',        subtitle: 'Attendance & HR reports'        },
  '/settings':   { title: 'Settings',       subtitle: 'System configuration'           },
}

const FALLBACK: PageMeta = { title: 'HRMS Lite', subtitle: '' }

// ── Component ─────────────────────────────────────────────────────────────────

export default function Topbar() {
  const { pathname } = useLocation()
  const page = PAGE_META[pathname] ?? FALLBACK

  return (
    <header className="topbar">

      {/* ── Left: page title + subtitle ───────────────────────────────────── */}
      <div className="topbar-left">
        <h1 className="topbar-title">{page.title}</h1>
        {page.subtitle && (
          <span className="topbar-subtitle">{page.subtitle}</span>
        )}
      </div>

      {/* ── Right: notification bell + user profile ───────────────────────── */}
      <div className="topbar-right">
        <div className="topbar-divider" aria-hidden="true" />

        {/* Notification bell — static placeholder for demo */}
        <div
          className="topbar-icon-btn"
          role="button"
          aria-label="Notifications"
          title="Notifications"
        >
          🔔
        </div>

        {/* User profile */}
        <div className="topbar-user">
          <div className="topbar-user-avatar" aria-hidden="true">AU</div>
          <div className="topbar-user-info">
            <span className="topbar-user-name">Admin User</span>
            <span className="topbar-user-role">HR Manager</span>
          </div>
        </div>
      </div>

    </header>
  )
}
