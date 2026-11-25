import {
  CalendarDays,
  CheckSquare,
  FileText,
  Folder,
  FolderKanban,
  Link2,
  NotebookPen,
  RotateCcw,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { useViewerTimeZone } from '@/features/profile'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { formatDateTime } from '@/lib/format'
import { useRecycleBin, useRestore, type BinKind } from './hooks'
import { BIN_LABEL, daysLeft, restoredHref } from './model'

const ICON: Record<BinKind, LucideIcon> = {
  opportunity: Trophy,
  project: FolderKanban,
  task: CheckSquare,
  note: NotebookPen,
  bookmark: Link2,
  folder: Folder,
  file: FileText,
  event: CalendarDays,
}

/** /trash — deleted items, restorable for 30 days by whoever can see them (FR-PLAT-10, US-04). */
export function RecycleBinPage() {
  const bin = useRecycleBin()
  const restore = useRestore()
  const toast = useToast()
  const tz = useViewerTimeZone()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const nameOf = (id: string | null) =>
    id === user?.id ? 'you' : (members.data?.find((m) => m.userId === id)?.displayName ?? 'someone')

  return (
    <section aria-labelledby="bin-title" className="space-y-5">
      <div>
        <h1 id="bin-title" className="text-h1">
          Recycle bin
        </h1>
        <p className="mt-1 text-body-sm text-muted">
          Deleted items stay here for 30 days, then they are removed for good. Any member can
          restore shared items; private items only their owner.
        </p>
      </div>

      {bin.isPending ? (
        <Spinner label="Loading the recycle bin" />
      ) : bin.error ? (
        <Alert tone="danger">Couldn&apos;t load the recycle bin. Check your connection.</Alert>
      ) : bin.data.length === 0 ? (
        <div className="panel panel-glow">
          <EmptyState title="Nothing deleted">
            Things anyone in this workspace deletes land here for 30 days.
          </EmptyState>
        </div>
      ) : (
        <ul
          className="panel divide-y divide-hairline overflow-hidden p-0"
          data-testid="recycle-bin"
        >
          {bin.data.map((item) => {
            const Icon = ICON[item.kind]
            const left = daysLeft(item.purge_at)
            const busy = restore.isPending && restore.variables?.id === item.id
            return (
              <li key={`${item.kind}:${item.id}`} className="flex items-center gap-3 px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-hairline">
                  <Icon className="size-4 text-muted" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-caption text-muted">
                    {BIN_LABEL[item.kind]} · deleted by {nameOf(item.deleted_by)}{' '}
                    {formatDateTime(item.deleted_at, tz)} ·{' '}
                    <span className={left <= 3 ? 'text-danger' : ''}>
                      {left === 0 ? 'removed today' : `${left} day${left === 1 ? '' : 's'} left`}
                    </span>
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy}
                  icon={<RotateCcw className="size-4" aria-hidden />}
                  aria-label={`Restore ${item.title}`}
                  onClick={() =>
                    restore.mutate(item, {
                      onSuccess: () => toast.show(`Restored “${item.title}”`, 'success'),
                      onError: (e) => toast.show(e.message, 'error'),
                    })
                  }
                >
                  Restore
                </Button>
              </li>
            )
          })}
        </ul>
      )}
      {restore.isSuccess && restore.variables ? (
        <p className="text-body-sm text-muted" aria-live="polite">
          <Link to={restoredHref(restore.variables)} className="underline">
            Open what you restored
          </Link>
        </p>
      ) : null}
    </section>
  )
}
