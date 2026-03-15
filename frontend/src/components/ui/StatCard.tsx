import { cn } from '../../utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface StatCardProps {
  /** Card label — displayed below the value, e.g. "Total Employees" */
  title: string
  /** Primary metric to display, e.g. 42 or "83.1%" */
  value: string | number
  /** Secondary line below the label, e.g. "All departments" */
  subtitle?: string
  /** Emoji icon rendered inside the coloured icon box */
  icon: string
  /**
   * CSS class controlling the icon background colour.
   * One of: stat-icon-blue | stat-icon-green | stat-icon-red | stat-icon-purple
   */
  iconClass: string
  /** When true, shows a shimmer skeleton in place of the value */
  loading?: boolean
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconClass,
  loading = false,
}: StatCardProps) {
  return (
    <div className="card stat-card">
      <div className="stat-card-body">
        {/* Coloured icon box */}
        <div className={cn('stat-card-icon', iconClass)} aria-hidden="true">
          {icon}
        </div>

        {/* Metric */}
        <div className="stat-card-info">
          <div className="stat-card-value">
            {loading
              ? <span className="stat-card-skeleton" aria-hidden="true" />
              : value}
          </div>
          <div className="stat-card-label">{title}</div>
          {subtitle && (
            <div className="stat-card-sub">{subtitle}</div>
          )}
        </div>
      </div>
    </div>
  )
}
