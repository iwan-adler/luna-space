import { Route, Routes } from 'react-router'
import { AppShell } from './AppShell'
import { NotFoundPage } from './NotFoundPage'
import { SignInPlaceholderPage } from '@/features/auth/pages/SignInPlaceholderPage'
import { WelcomePage } from '@/features/dashboard/pages/WelcomePage'

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<WelcomePage />} />
        <Route path="auth/sign-in" element={<SignInPlaceholderPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
