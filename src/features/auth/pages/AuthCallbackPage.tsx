import { Link, useSearchParams } from 'react-router'
import { PageSpinner } from '@/components/ui/Spinner'
import { useAuth } from '../AuthProvider'
import { ResumeAfterAuth } from '../ResumeAfterAuth'

/**
 * Landing page for email links. supabase-js (PKCE, detectSessionInUrl) exchanges the `code`
 * automatically; we wait for the session and then continue to `next` or the pending route.
 */
export function AuthCallbackPage() {
  const { user, loading } = useAuth()
  const [params] = useSearchParams()
  const errorDescription = params.get('error_description')

  if (errorDescription) {
    return (
      <div className="space-y-3">
        <h1 className="text-h1 font-semibold">Link not valid</h1>
        <p className="text-body-sm text-muted">This link has expired or was already used.</p>
        <Link to="/auth/sign-in" className="text-body-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }
  if (loading || !user) return <PageSpinner label="Signing you in" />

  const next = params.get('next')
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : null
  return <ResumeAfterAuth preferred={safeNext} />
}
