import { useEffect } from 'react'
import { Navigate } from 'react-router'
import { clearPendingRoute, peekPendingRoute } from '@/lib/pendingRoute'

/**
 * Sends a just-signed-in user to where they were going (e.g. /invite/:token) or home.
 * Reads without consuming during render (safe under StrictMode) and clears afterwards.
 */
export function ResumeAfterAuth({ preferred }: { preferred?: string | null }) {
  const target = preferred ?? peekPendingRoute() ?? '/'
  useEffect(() => clearPendingRoute(), [])
  return <Navigate to={target} replace />
}
