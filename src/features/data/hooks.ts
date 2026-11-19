import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentWorkspace } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

export type BinKind =
  'opportunity' | 'project' | 'task' | 'note' | 'bookmark' | 'folder' | 'file' | 'event'

export interface BinItem {
  kind: BinKind
  id: string
  title: string
  deleted_at: string
  deleted_by: string | null
  project_id: string | null
  purge_at: string
}

const db = () => requireSupabase()

/** Deleted items still restorable (FR-PLAT-10). */
export function useRecycleBin() {
  const { workspaceId } = useCurrentWorkspace()
  return useQuery({
    queryKey: ['recycle-bin', workspaceId],
    refetchOnMount: 'always',
    queryFn: async (): Promise<BinItem[]> => {
      const { data, error } = await db().rpc('recycle_bin')
      if (error) throw toAppError(error)
      return data as BinItem[]
    },
  })
}

export function useRestore() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (item: BinItem) => {
      const { error } = await db().rpc('restore_item', { p_kind: item.kind, p_id: item.id })
      if (error) throw toAppError(error)
    },
    // Restored items reappear everywhere: refresh every cached list.
    onSuccess: () => qc.invalidateQueries(),
  })
}
