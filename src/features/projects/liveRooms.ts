import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { AppError, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

/**
 * Studio Meet live rooms (ADR 0023): one shared row per workspace (the Studio, project = null)
 * and per project, so everyone sees when a meeting is live. Replaces the redesign's
 * per-browser localStorage state.
 */
export interface MeetState {
  isActive: boolean
  /** Local time the meeting started, e.g. "14:05". */
  startedAt?: string
  /** Display name of whoever started it. */
  startedBy?: string
  meetUrl: string
}

interface Row {
  id: string
  project_id: string | null
  meet_url: string
  is_active: boolean
  started_by: string | null
  started_at: string | null
}

export const NEW_MEET_URL = 'https://meet.google.com/new'
const MEET_RE = /^https:\/\/meet\.google\.com\/(new|[a-z0-9-]{3,64})$/

/** A Google Meet address as the database accepts it, or null. */
export function normaliseMeetUrl(input: string): string | null {
  let v = input.trim()
  if (!v) return null
  if (!/^https?:\/\//i.test(v)) v = `https://${v}`
  v = v.replace(/^http:\/\//i, 'https://')
  try {
    const u = new URL(v)
    const clean = `https://${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/, '')}`
    return MEET_RE.test(clean) ? clean : null
  } catch {
    return null
  }
}

const roomKey = (ws: string) => ['live-rooms', ws] as const

function useRooms() {
  const { workspaceId } = useCurrentWorkspace()
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: roomKey(workspaceId),
    // Realtime invalidates on every change, so mounting another reader needn't refetch.
    staleTime: 60_000,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await requireSupabase()
        .from('live_rooms')
        .select('id, project_id, meet_url, is_active, started_by, started_at')
      if (error) throw toAppError(error)
      return data
    },
  })
  useEffect(() => {
    const client = requireSupabase()
    const channel = client
      .channel(`live-rooms:${workspaceId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_rooms',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => void qc.invalidateQueries({ queryKey: roomKey(workspaceId) }),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [qc, workspaceId])
  return query
}

function useToState() {
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  return (row: Row | undefined): MeetState =>
    row
      ? {
          isActive: row.is_active,
          meetUrl: row.meet_url,
          ...(row.started_at
            ? {
                startedAt: new Date(row.started_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              }
            : {}),
          ...(row.started_by
            ? {
                startedBy:
                  members.data?.find((m) => m.userId === row.started_by)?.displayName ??
                  'A teammate',
              }
            : {}),
        }
      : { isActive: false, meetUrl: NEW_MEET_URL }
}

/** The room of a project, or of the workspace Studio when projectId is null. */
export function useLiveRoom(projectId: string | null) {
  const { workspaceId } = useCurrentWorkspace()
  const qc = useQueryClient()
  const rooms = useRooms()
  const toState = useToState()
  const row = rooms.data?.find((r) => r.project_id === projectId)
  const save = useMutation({
    mutationFn: async (next: { meetUrl?: string; isActive?: boolean }) => {
      const db = requireSupabase()
      const patch: { meet_url?: string; is_active?: boolean } = {}
      if (next.meetUrl !== undefined) {
        const url = normaliseMeetUrl(next.meetUrl)
        if (!url) throw new AppError('Use a Google Meet link, like meet.google.com/abc-defg-hij.')
        patch.meet_url = url
      }
      if (next.isActive !== undefined) patch.is_active = next.isActive
      const { error } = row
        ? await db.from('live_rooms').update(patch).eq('id', row.id)
        : await db
            .from('live_rooms')
            .insert({ workspace_id: workspaceId, project_id: projectId, ...patch })
      if (error) throw toAppError(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: roomKey(workspaceId) }),
  })
  return { state: toState(row), save, isPending: rooms.isPending }
}

/** Meetings live right now anywhere in the workspace. */
export function useActiveLiveRooms(): (MeetState & { projectId: string | null })[] {
  const rooms = useRooms()
  const toState = useToState()
  return (rooms.data ?? [])
    .filter((r) => r.is_active)
    .map((r) => ({ ...toState(r), projectId: r.project_id }))
}
