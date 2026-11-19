import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { useOpportunities, useViewerTimeZone } from '@/features/opportunities'
import { useCurrentWorkspace } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { findMissions, type Mission, type MissionSource } from './model'

/** The current time, refreshed every `ms` (for live countdowns). */
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), ms)
    return () => window.clearInterval(t)
  }, [ms])
  return now
}

/** Missions of the current workspace, nearest first (re-evaluated every minute). */
export function useMissions(): Mission[] {
  const opps = useOpportunities()
  const tz = useViewerTimeZone()
  const now = useNow(60_000)
  return useMemo(
    () => findMissions((opps.data ?? []) as unknown as MissionSource[], tz, now),
    [opps.data, tz, now],
  )
}

export interface MissionTask {
  id: string
  title: string
  status: string
  priority: string
  assignee_id: string | null
  completed_at: string | null
}
export interface MissionChecklistItem {
  id: string
  label: string
  is_done: boolean
  position: number
}

/** The linked project's tasks and checklist items, live while the page is open. */
export function useMissionBoard(projectId: string | null) {
  const { workspaceId } = useCurrentWorkspace()
  const qc = useQueryClient()
  const key = ['mission', workspaceId, projectId] as const
  const board = useQuery({
    queryKey: key,
    enabled: Boolean(projectId),
    refetchInterval: 30_000,
    queryFn: async () => {
      const db = requireSupabase()
      const [tasks, lists] = await Promise.all([
        db
          .from('tasks')
          .select('id, title, status, priority, assignee_id, completed_at')
          .eq('project_id', projectId!)
          .is('deleted_at', null)
          .is('parent_task_id', null)
          .order('position'),
        db
          .from('checklists')
          .select('id, title, items:checklist_items(id, label, is_done, position)')
          .eq('project_id', projectId!)
          .is('deleted_at', null),
      ])
      const error = tasks.error ?? lists.error
      if (error) throw toAppError(error)
      const items = (lists.data ?? [])
        .flatMap((l) => (l.items ?? []) as MissionChecklistItem[])
        .sort((a, b) => a.position - b.position)
      return { tasks: (tasks.data ?? []) as MissionTask[], checklist: items }
    },
  })
  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: key })
    void qc.invalidateQueries({ queryKey: ['projects'] })
  }
  const setTaskDone = useMutation({
    mutationFn: async (args: { id: string; done: boolean }) => {
      const { error } = await requireSupabase()
        .from('tasks')
        .update({ status: args.done ? 'done' : 'in_progress' })
        .eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSettled: invalidate,
  })
  const setItemDone = useMutation({
    mutationFn: async (args: { id: string; done: boolean }) => {
      const { error } = await requireSupabase()
        .from('checklist_items')
        .update({ is_done: args.done })
        .eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSettled: invalidate,
  })
  return { board, setTaskDone, setItemDone }
}
