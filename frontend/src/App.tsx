import { RouterProvider } from 'react-router-dom'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { ToastProvider } from './components/ui/Toast'
import { router } from './routes'

export default function App() {
  return (
    // Provider order matters — inner providers can use outer ones.
    // ToastProvider   → toast notifications available to everything inside.
    // ConfirmProvider → confirm dialog available to everything inside.
    <ToastProvider>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </ToastProvider>
  )
}
