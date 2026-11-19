import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useCurrentWorkspace } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { formatBytes } from '@/lib/files'
import { requireSupabase } from '@/lib/supabase'

/** Supabase free-plan limits the project runs on (TRD §14). */
const STORAGE_LIMIT = 1024 ** 3
const DATABASE_LIMIT = 500 * 1024 ** 2

interface Usage {
  members: number
  opportunities: number
  projects: number
  tasks: number
  notes: number
  messages: number
  files: number
  storage_bytes: number
  trash_bytes: number
  database_bytes: number
}

function Meter({
  label,
  used,
  limit,
  note,
}: {
  label: string
  used: number
  limit: number
  note: string
}) {
  const f = Math.min(1, used / limit)
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-body-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted">
          {formatBytes(used)} of {formatBytes(limit)}
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-hairline"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div
          className={`h-full rounded-full ${f > 0.85 ? 'bg-danger' : f > 0.6 ? 'bg-warning' : 'bg-[var(--gradient-primary)]'}`}
          style={{ width: `${Math.max(f * 100, 1)}%` }}
        />
      </div>
      <p className="text-caption text-muted">{note}</p>
    </div>
  )
}

/** How much this workspace stores, and how full the shared project is (ADR 0022). */
export function UsageCard() {
  const { workspaceId, workspaceName } = useCurrentWorkspace()
  const usage = useQuery({
    queryKey: ['usage', workspaceId],
    queryFn: async (): Promise<Usage> => {
      const { data, error } = await requireSupabase().rpc('workspace_usage')
      if (error) throw toAppError(error)
      return data as unknown as Usage
    },
  })
  const u = usage.data
  const counts: [string, number | undefined][] = [
    ['Members', u?.members],
    ['Opportunities', u?.opportunities],
    ['Projects', u?.projects],
    ['Tasks', u?.tasks],
    ['Notes', u?.notes],
    ['Messages', u?.messages],
    ['Files', u?.files],
  ]
  return (
    <Card className="space-y-4 p-5" data-testid="usage">
      <h2 className="text-h2">Usage</h2>
      {usage.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load usage.</p>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {counts.map(([label, n]) => (
              <li key={label} className="rounded-[14px] border border-hairline px-3 py-2">
                {n === undefined ? (
                  <Skeleton className="h-6 w-8" />
                ) : (
                  <span className="stat-number block text-[20px]">{n}</span>
                )}
                <span className="text-caption text-muted">{label}</span>
              </li>
            ))}
          </ul>
          {u ? (
            <div className="space-y-4">
              <Meter
                label={`Files in ${workspaceName}`}
                used={u.storage_bytes}
                limit={STORAGE_LIMIT}
                note={
                  u.trash_bytes
                    ? `Plus ${formatBytes(u.trash_bytes)} in the recycle bin, removed after 30 days.`
                    : 'The file storage limit is shared by every workspace in the app.'
                }
              />
              <Meter
                label="Whole app database"
                used={u.database_bytes}
                limit={DATABASE_LIMIT}
                note="Every workspace together, on the current Supabase plan."
              />
            </div>
          ) : (
            <Skeleton className="h-16 w-full" />
          )}
        </>
      )}
    </Card>
  )
}
