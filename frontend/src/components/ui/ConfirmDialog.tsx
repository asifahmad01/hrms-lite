/* @refresh reset */
/**
 * ConfirmDialog — a Promise-based confirmation modal that replaces
 * window.confirm() across the entire app.
 *
 * Setup (done once in App.tsx):
 *   <ConfirmProvider>
 *     <RouterProvider router={router} />
 *   </ConfirmProvider>
 *
 * Usage anywhere inside the provider:
 *   const confirm = useConfirm()
 *
 *   async function handleDelete(emp: Employee) {
 *     const ok = await confirm({
 *       title:        'Delete Employee',
 *       message:      `Remove "${emp.full_name}"? All attendance records will be deleted.`,
 *       confirmLabel: 'Delete',
 *       variant:      'danger',
 *     })
 *     if (!ok) return
 *     // … proceed with delete
 *   }
 */
import { createContext, useCallback, useContext, useState } from 'react'
import Button from './Button'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ConfirmOptions {
  /** Modal heading */
  title: string
  /** Explanatory text shown below the heading */
  message: string
  /** Label for the confirm button — defaults to "Confirm" */
  confirmLabel?: string
  /** Label for the cancel button — defaults to "Cancel" */
  cancelLabel?: string
  /** Controls the confirm button colour — defaults to "primary" */
  variant?: 'danger' | 'primary'
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

// ── Context ───────────────────────────────────────────────────────────────────

const ConfirmContext = createContext<ConfirmFn | null>(null)

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns an async function that opens the confirm dialog and resolves to
 * true (confirmed) or false (cancelled / backdrop click).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>')
  return ctx
}

// ── Internal state shape ──────────────────────────────────────────────────────

interface DialogState {
  options: ConfirmOptions
  resolve: (ok: boolean) => void
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<DialogState | null>(null)

  // Stable reference — safe to spread as a Context value
  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      setDialog({ options, resolve })
    })
  }, [])

  function close(ok: boolean) {
    dialog?.resolve(ok)
    setDialog(null)
  }

  const btnVariant = dialog?.options.variant === 'danger' ? 'danger' : 'primary'

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}

      {dialog && (
        <div
          className="modal-backdrop"
          onClick={() => close(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div
            className="modal confirm-modal"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="modal-header">
              <h3 className="modal-title" id="confirm-dialog-title">
                {dialog.options.title}
              </h3>
            </div>

            {/* Body */}
            <p className="confirm-modal-message">
              {dialog.options.message}
            </p>

            {/* Footer */}
            <div className="modal-footer">
              <Button
                variant="ghost"
                onClick={() => close(false)}
                // Auto-focus Cancel so pressing Enter doesn't accidentally confirm
                autoFocus
              >
                {dialog.options.cancelLabel ?? 'Cancel'}
              </Button>
              <Button variant={btnVariant} onClick={() => close(true)}>
                {dialog.options.confirmLabel ?? 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
