/**
 * Centralized error → user-friendly message mapping.
 *
 * Usage:
 *   catch (err) {
 *     toast.error(mapApiError(err))
 *     // or with per-call overrides:
 *     toast.error(mapApiError(err, { 404: 'Employee no longer exists.' }))
 *   }
 */
import { ApiError } from './client'

export function mapApiError(
  err: unknown,
  /** Optional per-status overrides for the calling context. */
  custom: Partial<Record<number, string>> = {},
): string {
  if (err instanceof ApiError) {
    // Caller-supplied override takes highest priority
    if (custom[err.status]) return custom[err.status]!

    switch (err.status) {
      case 400:
        return 'Invalid request. Please check the form data.'
      case 404:
        return 'The requested resource was not found.'
      case 409:
        // Backend already sends a precise duplicate message — surface it verbatim
        return err.message
      case 422:
        // Backend sends field-level validation detail — surface it verbatim
        return err.message
      case 500:
        return 'A server error occurred. Please try again later.'
      default:
        return err.message || `Unexpected error (HTTP ${err.status}).`
    }
  }

  // fetch() itself threw — no HTTP response was received
  if (err instanceof TypeError) {
    return 'Cannot connect to the server. Check your internet connection.'
  }

  return err instanceof Error ? err.message : 'An unexpected error occurred.'
}
