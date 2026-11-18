import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth'
import { useCurrentWorkspace } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

export type Note = Omit<Database['public']['Tables']['notes']['Row'], 'search'>
export type NoteSummary = Pick<
  Note,
  'id' | 'title' | 'body_md' | 'pinned' | 'visibility' | 'owner_id' | 'updated_at' | 'updated_by'
>

export type SaveResult =
  | { ok: true; version: number }
  | {
      ok: false
      code: 'VERSION_CONFLICT'
      version: number
      title: string
      body_md: string
      updated_by: string | null
    }
  | { ok: false; code: 'NOT_FOUND' }

export const noteKeys = {
  all: ['notes'] as const,
  list: (q: string) => ['notes', 'list', q] as const,
  one: (id: string) => ['notes', 'one', id] as const,
}

const db = () => requireSupabase()

/** Notes, pinned first then most recently edited; `q` searches titles and text (FR-VAULT-06). */
export function useNotes(q: string) {
  return useQuery({
    queryKey: noteKeys.list(q),
    queryFn: async (): Promise<NoteSummary[]> => {
      let query = db()
        .from('notes')
        .select('id, title, body_md, pinned, visibility, owner_id, updated_at, updated_by')
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(300)
      const term = q.trim()
      if (term) query = query.textSearch('search', term, { type: 'websearch', config: 'english' })
      const { data, error } = await query
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useNote(id: string | null) {
  return useQuery({
    queryKey: noteKeys.one(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<Note | null> => {
      const { data, error } = await db()
        .from('notes')
        .select(
          'id, workspace_id, owner_id, visibility, folder_id, project_id, kind, title, body_md, version, pinned, tags, guest_visible, client_id, updated_by, created_at, updated_at, deleted_at, deleted_by',
        )
        .eq('id', id!)
        .is('deleted_at', null)
        .maybeSingle()
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useCreateNote() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (input: { title?: string; isPrivate?: boolean } = {}) => {
      const { data, error } = await db()
        .from('notes')
        .insert({
          workspace_id: workspaceId,
          owner_id: user!.id,
          title: input.title?.trim() || 'Untitled note',
          visibility: input.isPrivate ? 'private' : 'shared',
          client_id: crypto.randomUUID(),
        })
        .select('id')
        .single()
      if (error) throw toAppError(error)
      return data.id
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
  })
}

/** Conflict-safe save: refused when someone else saved after `version` was loaded. */
export async function saveNote(
  id: string,
  title: string,
  body: string,
  version: number,
): Promise<SaveResult> {
  const { data, error } = await db().rpc('save_note', {
    p_id: id,
    p_title: title.trim() || 'Untitled note',
    p_body: body,
    p_version: version,
  })
  if (error) throw toAppError(error)
  return data as unknown as SaveResult
}

export function useUpdateNoteMeta() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (args: {
      id: string
      patch: { pinned?: boolean; visibility?: 'shared' | 'private'; deleted?: boolean }
    }) => {
      const { deleted, ...rest } = args.patch
      const patch =
        deleted === undefined
          ? rest
          : {
              ...rest,
              deleted_at: deleted ? new Date().toISOString() : null,
              deleted_by: deleted ? user!.id : null,
            }
      const { error } = await db().from('notes').update(patch).eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
  })
}

/** Live list and note updates from the partner (TRD §9). */
export function useNotesRealtime(onNoteChange?: (id: string) => void) {
  const qc = useQueryClient()
  useEffect(() => {
    const client = db()
    const channel = client
      .channel(`notes:${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
        void qc.invalidateQueries({ queryKey: ['notes', 'list'] })
        const id = (payload.new as { id?: string } | null)?.id
        if (id) onNoteChange?.(id)
      })
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [qc, onNoteChange])
}
