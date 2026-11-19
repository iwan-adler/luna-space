import { SkeletonList } from '@/components/ui/Skeleton'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useViewerTimeZone } from '@/features/profile'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import { requireSupabase } from '@/lib/supabase'

/** The last 20 activity entries; `mine` keeps only the viewer's own actions (FR-DASH-04, FR-PLAT-09). */
export function ActivityWidget({ mine }: { mine: boolean }) {
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const tz = useViewerTimeZone()
  const activity = useQuery({
    queryKey: ['activity', workspaceId, mine ? user?.id : 'all'],
    enabled: Boolean(user),
    queryFn: async () => {
      let q = requireSupabase()
        .from('activity_log')
        .select('id, actor_id, summary, created_at')
        .eq('category', 'activity')
        .order('created_at', { ascending: false })
        .limit(20)
      if (mine) q = q.eq('actor_id', user!.id)
      const { data, error } = await q
      if (error) throw toAppError(error)
      return data
    },
  })
  const nameOf = (id: string | null) =>
    id === user?.id ? 'You' : (members.data?.find((m) => m.userId === id)?.displayName ?? 'Someone')

  return (
    <section aria-labelledby="activity-title" className="panel space-y-3 p-5">
      <h2 id="activity-title" className="text-body font-medium">
        Recent activity
      </h2>
      {activity.isPending ? (
        <SkeletonList label="Loading activity" variant="line" rows={3} />
      ) : activity.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load activity.</p>
      ) : activity.data.length === 0 ? (
        <p className="text-body-sm text-muted">Nothing has happened here yet.</p>
      ) : (
        <ol className="max-h-80 space-y-2.5 overflow-y-auto pr-1" data-testid="activity">
          {activity.data.map((a) => (
            <li key={a.id} className="text-body-sm">
              <span className="font-medium">{nameOf(a.actor_id)}</span>{' '}
              <span className="text-muted">
                {a.summary.replace(/^[A-Z]/, (c) => c.toLowerCase())}
              </span>
              <span className="block text-caption text-muted">
                {formatDateTime(a.created_at, tz)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
