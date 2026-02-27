/** Format an ISO date string or Date object into a human-readable string. */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? new Date(value) : value
  return d.toLocaleDateString('en-US', {
    year:  'numeric',
    month: 'short',
    day:   'numeric',
  })
}

/** Return today's date as a YYYY-MM-DD string (for date input defaultValue). */
export function toInputDate(d: Date = new Date()): string {
  return d.toISOString().split('T')[0]
}

/**
 * Format a bare YYYY-MM-DD string (no time component) as a readable date.
 * Uses local-time construction to avoid the UTC-midnight timezone shift that
 * new Date('2026-02-26') would cause in western-hemisphere timezones.
 */
export function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}
