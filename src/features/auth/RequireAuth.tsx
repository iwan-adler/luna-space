import { Navigate, Outlet, useLocation } from 'react-router'
import { PageSpinner } from '@/components/ui/Spinner'
import { savePendingRoute } from '@/lib/pendingRoute'
import { useAuth } from './AuthProvider'

/** Sends signed-out visitors to sign-in and remembers where they were going. */
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <PageSpinner label="Checking your session" fullScreen />
  if (!user) {
    savePendingRoute(location.pathname + location.search)
    return <Navigate to="/auth/sign-in" replace />
  }
  return <Outlet />
}
