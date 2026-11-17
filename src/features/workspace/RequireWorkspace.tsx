import { Navigate, Outlet } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner } from '@/components/ui/Spinner'
import { useMembership } from './hooks'

/** Members only: users without a workspace go to onboarding (Flow §4). */
export function RequireWorkspace() {
  const { data, isPending, isError, refetch } = useMembership()
  if (isPending) return <PageSpinner label="Loading your workspace" />
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
  if (!data) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
