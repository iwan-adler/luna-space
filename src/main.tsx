import { QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import { App } from '@/app/App'
import { ToastProvider } from '@/components/ui/Toast'
import { AuthProvider } from '@/features/auth'
import { queryClient } from '@/lib/queryClient'
import { applyTheme, readThemePreference } from '@/lib/theme'
import '@/styles/index.css'

applyTheme(readThemePreference())

const root = document.getElementById('root')
if (!root) throw new Error('Root element #root not found')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
