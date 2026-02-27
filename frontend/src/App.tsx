import { RouterProvider } from 'react-router-dom'
import { ToastProvider } from './components/ui/Toast'
import { router } from './routes'

export default function App() {
  return (
    // ToastProvider wraps everything so any page can call useToast()
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  )
}
