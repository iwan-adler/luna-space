import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth'
import { useCurrentWorkspace } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

export type TeamPostKind = 'seeking_team' | 'seeking_members'

export interface TeamPost {
  id: string
  opportunity_id: string
  user_id: string
  kind: TeamPostKind
  skills: string[]
  note: string | null
  spots: number | null
  status: 'open' | 'closed'
  created_at: string
  opportunity: { id: string; title: string; type: string } | null
  author: { display_name: string; skills: string[] } | null
}

const db = () => requireSupabase()
const key = (ws: string, opp: string | null) => ['team-posts', ws, opp ?? 'all'] as const

/** Open team-finder posts in the workspace, or for one opportunity (ADR 0021). */
export function useTeamPosts(opportunityId: string | null = null) {
  const { workspaceId } = useCurrentWorkspace()
  return useQuery({
    queryKey: key(workspaceId, opportunityId),
    queryFn: async (): Promise<TeamPost[]> => {
      let q = db()
        .from('team_posts')
        .select(
          'id, opportunity_id, user_id, kind, skills, note, spots, status, created_at, opportunity:opportunities(id, title, type), author:profiles(display_name, skills)',
        )
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(200)
      if (opportunityId) q = q.eq('opportunity_id', opportunityId)
      const { data, error } = await q
      if (error) throw toAppError(error)
      return data as unknown as TeamPost[]
    },
  })
}

export function useCreateTeamPost() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: {
      opportunityId: string
      kind: TeamPostKind
      skills: string[]
      note: string | null
      spots: number | null
    }) => {
      // Re-posting after closing reopens the same post (one per person, kind and opportunity).
      const { data: existing } = await db()
        .from('team_posts')
        .select('id')
        .eq('opportunity_id', args.opportunityId)
        .eq('user_id', user!.id)
        .eq('kind', args.kind)
        .maybeSingle()
      const patch = {
        skills: args.skills,
        note: args.note,
        spots: args.kind === 'seeking_members' ? args.spots : null,
        status: 'open' as const,
      }
      const { error } = existing
        ? await db().from('team_posts').update(patch).eq('id', existing.id)
        : await db()
            .from('team_posts')
            .insert({
              workspace_id: workspaceId,
              opportunity_id: args.opportunityId,
              user_id: user!.id,
              kind: args.kind,
              ...patch,
            })
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-posts'] }),
  })
}

export function useCloseTeamPost() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db().from('team_posts').update({ status: 'closed' }).eq('id', id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-posts'] }),
  })
}

export function useTeamPostsRealtime() {
  const qc = useQueryClient()
  const { workspaceId } = useCurrentWorkspace()
  useEffect(() => {
    const client = db()
    const channel = client
      .channel(`team-posts:${workspaceId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'team_posts',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => void qc.invalidateQueries({ queryKey: ['team-posts'] }),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [qc, workspaceId])
}
