import { Link, useNavigate, useParams } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useAuth } from '@/features/auth'
import { AppError } from '@/lib/errors'
import { savePendingRoute } from '@/lib/pendingRoute'
import { useAcceptInvitation } from '../hooks'

/** /invite/:token — works signed out (Flow §6). */
export function AcceptInvitePage() {
  const { token = '' } = useParams()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const accept = useAcceptInvitation()

  if (loading) return <PageSpinner />

  const errorCode = accept.error instanceof AppError ? accept.error.code : undefined

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-h2 font-bold">
        <MoonLogo className="size-8" />
        Luna Space
      </div>
      <main id="main" className="space-y-4 rounded-lg border border-border bg-surface p-6 shadow-2">
        <h1 className="text-h1 font-bold">You&apos;re invited</h1>
        <p className="text-body-sm text-muted">
          Your partner invited you to share a private Luna Space workspace — opportunities,
          projects, deadlines and chat for the two of you.
        </p>

        {!user ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                savePendingRoute(`/invite/${encodeURIComponent(token)}`)
                navigate('/auth/sign-in')
              }}
            >
              Sign in to accept
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                savePendingRoute(`/invite/${encodeURIComponent(token)}`)
                navigate('/auth/sign-up')
              }}
            >
              Create an account
            </Button>
          </div>
        ) : (
          <>
            {accept.error ? <Alert tone="danger">{accept.error.message}</Alert> : null}
            {errorCode === 'ALREADY_MEMBER' ? (
              <Link to="/" className="text-primary hover:underline">
                Go to your dashboard
              </Link>
            ) : (
              <Button
                className="w-full"
                loading={accept.isPending}
                onClick={() =>
                  accept.mutate(token, { onSuccess: () => navigate('/', { replace: true }) })
                }
              >
                Join workspace
              </Button>
            )}
            <p className="text-caption text-muted">Signed in as {user.email}</p>
          </>
        )}
      </main>
    </div>
  )
}
