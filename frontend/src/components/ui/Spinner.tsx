/**
 * Spinner — animated loading indicator.
 *
 * Fully backward-compatible: existing <Spinner /> calls work unchanged
 * (defaults to size="md", variant="section").
 *
 * Usage:
 *   <Spinner />                              // section-level (default)
 *   <Spinner variant="page" />               // full-page load, more vertical padding
 *   <Spinner size="sm" variant="inline" />   // inside a button or tight space
 *   <Spinner size="lg" variant="page" />     // prominent page load
 */
import { cn } from '../../utils/cn'

// ── Types ─────────────────────────────────────────────────────────────────────

interface SpinnerProps {
  /** Physical size of the spinner ring. Default: "md" */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Layout context:
   * - "section" — centred inside a card or content block (padding: 48px). Default.
   * - "page"    — centred for a full-page load (padding: 120px).
   * - "inline"  — no container; renders the raw spinner element only.
   */
  variant?: 'page' | 'section' | 'inline'
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Spinner({ size = 'md', variant = 'section' }: SpinnerProps) {
  const ring = (
    <div
      className={cn('spinner', size !== 'md' && `spinner-${size}`)}
      role="status"
      aria-label="Loading"
    />
  )

  if (variant === 'inline') return ring

  return (
    <div
      className={cn(
        'spinner-container',
        variant === 'page' && 'spinner-container-page',
      )}
    >
      {ring}
    </div>
  )
}
