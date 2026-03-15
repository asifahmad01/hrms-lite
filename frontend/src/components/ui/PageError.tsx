/**
 * PageError — inline error block shown when a page-level data fetch fails.
 *
 * Usage:
 *   {error && <PageError message={error} onRetry={loadData} />}
 *
 * For mutation errors (e.g. form submit failures) use a Toast instead:
 *   toast.error(message)
 */
import Button from './Button'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PageErrorProps {
  /** The human-readable error message — pass the string from mapApiError(). */
  message: string
  /**
   * When provided, a "Try again" button is rendered.
   * Should be the same function used to load data initially.
   */
  onRetry?: () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PageError({ message, onRetry }: PageErrorProps) {
  return (
    <div className="page-error" role="alert">
      <span className="page-error-icon" aria-hidden="true">⚠️</span>
      <span className="page-error-message">{message}</span>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}
