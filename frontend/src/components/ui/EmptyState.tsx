/**
 * EmptyState — centred empty-content display.
 *
 * Usage (no action):
 *   <EmptyState icon="📅" title="No records" message="Mark attendance above." />
 *
 * Usage (with action button):
 *   <EmptyState
 *     icon="👤"
 *     title="No employees yet"
 *     message="Get started by adding your first employee."
 *     action={{ label: '+ Add Employee', onClick: openModal }}
 *   />
 */
import Button from './Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmptyStateAction {
  label: string
  onClick: () => void
}

interface EmptyStateProps {
  icon?: string
  title: string
  message?: string
  /** When provided, renders a primary action button below the message. */
  action?: EmptyStateAction
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function EmptyState({
  icon = '📭',
  title,
  message,
  action,
}: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <div className="empty-state-title">{title}</div>
      {message && (
        <div className="empty-state-message">{message}</div>
      )}
      {action && (
        <div className="empty-state-action">
          <Button size="sm" onClick={action.onClick}>
            {action.label}
          </Button>
        </div>
      )}
    </div>
  )
}
