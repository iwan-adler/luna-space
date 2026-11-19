import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, CheckCheck, Flame, Send, UserPlus } from 'lucide-react'
import { Link } from 'react-router'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/features/auth'
import { ProfileCard, useViewerTimeZone } from '@/features/profile'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { weekStartInstant, weekStreak } from './recap'

/** Who's in the workspace and what each person is working on right now (ADR 0019). */
export function TeamCard() {
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const working = useQuery({
    queryKey: ['dashboard', 'working-on', workspaceId],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('tasks')
        .select('id, title, assignee_id, project_id, updated_at')
        .eq('status', 'in_progress')
        .is('deleted_at', null)
        .not('assignee_id', 'is', null)
        .order('updated_at', { ascending: false })
        .limit(200)
      if (error) throw toAppError(error)
      return data
    },
  })
  const others = members.data?.filter((m) => m.userId !== user?.id) ?? []

  return (
    <section aria-labelledby="team-title" className="panel space-y-3 p-5" data-testid="team-card">
      <div className="flex items-center justify-between">
        <h2 id="team-title" className="text-body font-medium">
          Your team
        </h2>
        <Link
          to="/settings/workspace"
          className="icon-btn size-8"
          aria-label="Workspace members and invites"
        >
          <UserPlus className="size-4" strokeWidth={1.75} aria-hidden />
        </Link>
      </div>
      {members.isPending ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-4/5" />
        </div>
      ) : (
        <>
          <ul className="space-y-2.5">
            {members.data?.map((m) => {
              const task = working.data?.find((t) => t.assignee_id === m.userId)
              return (
                <li key={m.userId} className="flex items-center gap-3">
                  <span
                    className="btn-primary grid size-9 shrink-0 place-items-center rounded-full text-body-sm font-semibold"
                    aria-hidden
                  >
                    {m.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body-sm font-medium">
                      <ProfileCard userId={m.userId} label={m.displayName}>
                        {m.userId === user?.id ? `${m.displayName} (you)` : m.displayName}
                      </ProfileCard>
                    </span>
                    <span className="block truncate text-caption text-muted">
                      {task ? (
                        <>
                          Working on{' '}
                          <Link
                            to={task.project_id ? `/projects/${task.project_id}/board` : '/tasks'}
                            className="text-text hover:underline"
                          >
                            {task.title}
                          </Link>
                        </>
                      ) : (
                        'Nothing in progress'
                      )}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
          {others.length === 0 ? (
            <Link
              to="/settings/workspace"
              className="inline-flex items-center gap-2 text-body-sm text-muted hover:text-text"
            >
              <UserPlus className="size-4" strokeWidth={1.75} aria-hidden /> Invite your friends
            </Link>
          ) : null}
        </>
      )}
    </section>
  )
}

/** "This week together": tasks done, applications, submissions, and a weekly streak. */
export function WeeklyRecap() {
  const { workspaceId } = useCurrentWorkspace()
  const tz = useViewerTimeZone()
  const recap = useQuery({
    queryKey: ['dashboard', 'recap', workspaceId, tz],
    queryFn: async () => {
      const db = requireSupabase()
      const start = weekStartInstant(tz).toISOString()
      const since = new Date(Date.now() - 16 * 7 * 86_400_000).toISOString()
      const [done, changes] = await Promise.all([
        db
          .from('tasks')
          .select('completed_at')
          .gte('completed_at', since)
          .is('deleted_at', null)
          .limit(5000),
        db
          .from('activity_log')
          .select('metadata')
          .eq('action', 'opportunity.status_changed')
          .gte('created_at', start)
          .limit(500),
      ])
      const error = done.error ?? changes.error
      if (error) throw toAppError(error)
      const completed = (done.data ?? []).map((t) => t.completed_at!).filter(Boolean)
      const to = (changes.data ?? []).map((c) => (c.metadata as { to?: string } | null)?.to)
      return {
        tasksThisWeek: completed.filter((iso) => iso >= start).length,
        applied: to.filter((s) => s === 'registered').length,
        submitted: to.filter((s) => s === 'submitted').length,
        streak: weekStreak(completed, tz),
      }
    },
  })
  const r = recap.data
  const stats = [
    { icon: CheckCheck, label: 'tasks done', value: r?.tasksThisWeek },
    { icon: CalendarCheck, label: 'applications', value: r?.applied },
    { icon: Send, label: 'submissions', value: r?.submitted },
  ]

  return (
    <section
      aria-labelledby="recap-title"
      className="panel panel-corner space-y-4 p-5"
      data-testid="weekly-recap"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="recap-title" className="text-body font-medium">
          This week together
        </h2>
        {r && r.streak > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-1 text-caption font-medium text-warning">
            <Flame className="size-3.5" aria-hidden /> {r.streak}-week streak
          </span>
        ) : null}
      </div>
      {recap.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load this week.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <li
              key={s.label}
              className="flex flex-col items-center rounded-[16px] border border-hairline bg-[var(--control-fill)] px-2 py-3 text-center"
            >
              <s.icon className="size-4 text-highlight" aria-hidden />
              {s.value === undefined ? (
                <Skeleton className="my-1 h-7 w-8" />
              ) : (
                <span className="stat-number text-[26px] leading-8">{s.value}</span>
              )}
              <span className="text-caption text-muted">{s.label}</span>
            </li>
          ))}
        </ul>
      )}
      {r && r.tasksThisWeek + r.applied + r.submitted === 0 ? (
        <p className="text-caption text-muted">
          A fresh week. Finish a task or send an application to start the count.
        </p>
      ) : null}
    </section>
  )
}
