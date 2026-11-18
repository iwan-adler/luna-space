import { useQuery } from '@tanstack/react-query'
import { Navigate, Outlet } from 'react-router'
import { useAuth } from '@/features/auth'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { fetchHasGuestRooms } from './api'
import { useMembership } from './hooks'

/**
 * Members only. People without a workspace go to their guest rooms if they have any
 * (FR-GUEST-11), otherwise to onboarding (Flow §4).
 */
export function RequireWorkspace() {
  const { user } = useAuth()
  const { data, isPending, isError, refetch } = useMembership()
  const guestRooms = useQuery({
    queryKey: ['workspace', 'has-guest-rooms', user?.id],
    queryFn: () => fetchHasGuestRooms(user!.id),
    enabled: Boolean(user) && !isPending && !data,
  })
  if (isPending || (!data && guestRooms.isPending))
    return <PageSpinner label="Loading your workspace" />
  if (isError) {
    return (
      <div className="mx-auto mt-16 max-w-md space-y-3 px-4">
        <Alert tone="danger">
          Couldn&apos;t load your workspace. Check your connection and try again.
        </Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    )
  }
  if (!data) return <Navigate to={guestRooms.data ? '/guest' : '/onboarding'} replace />
  return <Outlet />
}
