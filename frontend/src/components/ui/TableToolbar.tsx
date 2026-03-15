/**
 * TableToolbar — reusable search + filter bar for data tables.
 *
 * Usage:
 *   <TableToolbar
 *     search={search}
 *     onSearchChange={setSearch}
 *     searchPlaceholder="Search employees…"
 *     resultCount={filtered.length}
 *     totalCount={all.length}
 *     actions={<Button onClick={openAdd}>+ Add Employee</Button>}
 *   >
 *     {children}  ← filter/sort controls (selects, etc.)
 *   </TableToolbar>
 */
import type { ReactNode } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface TableToolbarProps {
  /** Controlled search value */
  search: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Shows "N of M" result count when provided */
  resultCount?: number
  totalCount?: number
  /** Right-aligned slot — action buttons (e.g. "+ Add") */
  actions?: ReactNode
  /** Filter / sort controls rendered after the search input */
  children?: ReactNode
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function TableToolbar({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  resultCount,
  totalCount,
  actions,
  children,
}: TableToolbarProps) {
  const showCount =
    resultCount !== undefined &&
    totalCount   !== undefined &&
    resultCount  !== totalCount

  return (
    <div className="table-toolbar">
      {/* ── Left: search + filters ───────────────────────────────────────── */}
      <div className="table-toolbar-left">
        {/* Search input */}
        <div className="table-toolbar-search">
          <span className="table-toolbar-search-icon" aria-hidden="true">🔍</span>
          <input
            className="table-toolbar-search-input"
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            aria-label={searchPlaceholder}
          />
          {search && (
            <button
              className="table-toolbar-clear"
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter / sort slots */}
        {children}

        {/* Result count */}
        {showCount && (
          <span className="table-toolbar-count">
            {resultCount} of {totalCount}
          </span>
        )}
      </div>

      {/* ── Right: action buttons ─────────────────────────────────────────── */}
      {actions && (
        <div className="table-toolbar-right">
          {actions}
        </div>
      )}
    </div>
  )
}
