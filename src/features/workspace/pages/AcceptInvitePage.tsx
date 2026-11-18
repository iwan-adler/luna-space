import { Link, useNavigate, useParams } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { AuthFrame, useAuth } from '@/features/auth'
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
    <AuthFrame>
      <div className="space-y-4">
        <h1 className="text-h1 font-semibold">You&apos;re invited</h1>
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
      </div>
    </AuthFrame>
  )
}
