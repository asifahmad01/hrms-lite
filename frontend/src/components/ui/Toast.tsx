/* @refresh reset */
/**
 * Minimal toast notification system.
 *
 * Exports:
 *   ToastProvider  — wrap the app with this once (in App.tsx)
 *   useToast()     — returns { success, error, info } helpers anywhere inside the provider
 */
import { createContext, useCallback, useContext, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  type: ToastType
  message: string
}

interface ToastAPI {
  success: (message: string) => void
  error:   (message: string) => void
  info:    (message: string) => void
}

// ── Context ───────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastAPI | null>(null)

// ── Hook ──────────────────────────────────────────────────────────────────────

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}

// ── Provider ──────────────────────────────────────────────────────────────────

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
}

const AUTO_DISMISS_MS = 4000

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, message: string) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message }])
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
  }, [dismiss])

  const api: ToastAPI = {
    success: (msg) => add('success', msg),
    error:   (msg) => add('error',   msg),
    info:    (msg) => add('info',    msg),
  }

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Portal-like container rendered at the top level */}
      {toasts.length > 0 && (
        <div className="toast-container" role="region" aria-label="Notifications">
          {toasts.map(t => (
            <div key={t.id} className={`toast toast-${t.type}`} role="alert">
              <span className={`toast-icon toast-icon-${t.type}`}>{ICONS[t.type]}</span>
              <span className="toast-message">{t.message}</span>
              <button
                className="toast-dismiss"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
