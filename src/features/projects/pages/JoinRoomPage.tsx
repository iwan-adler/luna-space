import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { AuthFrame, useAuth } from '@/features/auth'
import { AppError } from '@/lib/errors'
import { savePendingRoute } from '@/lib/pendingRoute'
import { useAcceptRoomInvitation } from '../guests'

const TOKEN_KEY = 'luna.joinToken'

/**
 * Reads the token from the URL fragment once, keeps it in sessionStorage across sign-in or
 * sign-up and removes it from the address bar, so it is never sent to a server or logged
 * (Flow §21.2).
 */
function takeTokenFromUrl(): string | null {
  try {
    const fromHash = window.location.hash.slice(1)
    if (fromHash) {
      sessionStorage.setItem(TOKEN_KEY, fromHash)
      window.history.replaceState(null, '', '/join')
    }
    return sessionStorage.getItem(TOKEN_KEY)
  } catch {
    return window.location.hash.slice(1) || null
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY)
  } catch {
    // ignore
  }
}

/** /join#<token> — accept a project room invitation; works signed out (FR-GUEST-04, AC-28). */
export function JoinRoomPage() {
  const [token] = useState(takeTokenFromUrl)
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const accept = useAcceptRoomInvitation()

  if (loading) return <PageSpinner />
  const errorCode = accept.error instanceof AppError ? accept.error.code : undefined

  return (
    <AuthFrame>
      <div className="space-y-4">
        <h1 className="text-h1 font-semibold">Join a project room</h1>
        <p className="text-body-sm text-muted">
          You&apos;ve been invited as a guest to one project room in Luna Space. You&apos;ll see
          that room only — its board, checklists and the files the team shares with guests.
        </p>

        {!token ? (
          <Alert tone="warning">
            This link is incomplete. Ask the person who invited you to send it again.
          </Alert>
        ) : !user ? (
          <div className="space-y-2">
            <Button
              className="w-full"
              onClick={() => {
                savePendingRoute('/join')
                void navigate('/auth/sign-in')
              }}
            >
              Sign in to join
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={() => {
                savePendingRoute('/join')
                void navigate('/auth/sign-up')
              }}
            >
              Create an account
            </Button>
          </div>
        ) : (
          <>
            {accept.error ? <Alert tone="danger">{accept.error.message}</Alert> : null}
            {errorCode === 'INVITE_INVALID' ? (
              <Link to="/" className="text-primary hover:underline">
                Go to Luna Space
              </Link>
            ) : (
              <Button
                className="w-full"
                loading={accept.isPending}
                onClick={() =>
                  accept.mutate(token, {
                    onSuccess: (r) => {
                      clearToken()
                      if (r.code === 'ALREADY_MEMBER')
                        void navigate(`/projects/${r.project_id}`, { replace: true })
                      else
                        void navigate(`/guest/rooms/${r.project_id}/overview?welcome=1`, {
                          replace: true,
                        })
                    },
                  })
                }
              >
                Join room
              </Button>
            )}
            <p className="text-caption text-muted">Signed in as {user.email}</p>
          </>
        )}
      </div>
    </AuthFrame>
  )
}
