import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useCurrentWorkspace } from '@/features/workspace'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { SearchHit, SearchKind } from './model'

/** One search across the workspace; the database applies visibility (FR-PLAT-11). */
export function useSearch(q: string, kinds?: SearchKind[], limit = 40) {
  const { workspaceId } = useCurrentWorkspace()
  const term = q.trim()
  return useQuery({
    queryKey: ['search', workspaceId, term, kinds?.join(',') ?? '', limit],
    enabled: term.length >= 2,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<SearchHit[]> => {
      const { data, error } = await requireSupabase().rpc('search_workspace', {
        p_q: term,
        ...(kinds ? { p_kinds: kinds } : {}),
        p_limit: limit,
      })
      if (error) throw toAppError(error)
      return data as SearchHit[]
    },
  })
}

/** The value once it has stopped changing for `ms` (search as you type). */
export function useDebounced<T>(value: T, ms = 220): T {
  const [settled, setSettled] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setSettled(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return settled
}
