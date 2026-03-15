/**
 * useAsyncState — manages the loading / error / data triplet for any async
 * operation (typically a page-level data fetch).
 *
 * Replaces the repeated boilerplate:
 *   const [data,    setData]    = useState(initial)
 *   const [loading, setLoading] = useState(false)
 *   const [error,   setError]   = useState<string | null>(null)
 *
 * Usage:
 *   const employees = useAsyncState<Employee[]>([])
 *
 *   async function load() {
 *     await employees.run(() =>
 *       employeesApi.list().then(r => r.data ?? [])
 *     )
 *   }
 *
 *   useEffect(() => { load() }, [])
 *
 *   // JSX:
 *   if (employees.loading) return <Spinner />
 *   if (employees.error)   return <PageError message={employees.error} onRetry={load} />
 *   return <Table data={employees.data} ... />
 */
import { useState } from 'react'
import { mapApiError } from '../api/errors'

// ── Types ─────────────────────────────────────────────────────────────────────

interface AsyncState<T> {
  data: T
  loading: boolean
  error: string | null
}

export interface UseAsyncState<T> {
  data: T
  loading: boolean
  error: string | null

  /**
   * Execute an async function.
   * - Sets loading=true and clears error before calling fn.
   * - On success: stores the returned value as data, returns it.
   * - On failure: stores the mapped error message, returns null.
   *
   * The return value lets callers act on success without a separate try-catch:
   *   const created = await state.run(() => api.create(payload))
   *   if (created) { closeModal(); toast.success('Done') }
   */
  run: (fn: () => Promise<T>) => Promise<T | null>

  /**
   * Directly set data — use after a mutation to update the list in-place
   * without re-fetching:
   *   state.setData(prev => [...prev, newItem])
   */
  setData: (updater: T | ((prev: T) => T)) => void

  /** Clear the current error (e.g. when the user dismisses it manually). */
  clearError: () => void
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useAsyncState<T>(initial: T): UseAsyncState<T> {
  const [state, setState] = useState<AsyncState<T>>({
    data: initial,
    loading: false,
    error: null,
  })

  // ── run ───────────────────────────────────────────────────────────────────
  async function run(fn: () => Promise<T>): Promise<T | null> {
    setState(s => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn()
      setState({ data, loading: false, error: null })
      return data
    } catch (err) {
      setState(s => ({ ...s, loading: false, error: mapApiError(err) }))
      return null
    }
  }

  // ── setData ───────────────────────────────────────────────────────────────
  function setData(updater: T | ((prev: T) => T)): void {
    setState(s => ({
      ...s,
      data: typeof updater === 'function'
        ? (updater as (prev: T) => T)(s.data)
        : updater,
    }))
  }

  // ── clearError ────────────────────────────────────────────────────────────
  function clearError(): void {
    setState(s => ({ ...s, error: null }))
  }

  return {
    data:    state.data,
    loading: state.loading,
    error:   state.error,
    run,
    setData,
    clearError,
  }
}
