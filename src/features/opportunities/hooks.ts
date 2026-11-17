import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profile'
import { deviceTimeZone } from '@/lib/timezones'
import {
  getOpportunity,
  listHistory,
  listOpportunities,
  listProvenance,
  listSources,
  saveOpportunity,
  setDeleted,
  setStatus,
} from './api'
import type { OpportunityStatus } from './constants'
import type { SavePayload } from './form'

export const oppKeys = {
  all: ['opp'] as const,
  list: () => ['opp', 'list'] as const,
  detail: (id: string) => ['opp', 'detail', id] as const,
  sources: (id: string) => ['opp', 'sources', id] as const,
  provenance: (id: string) => ['opp', 'provenance', id] as const,
  history: (id: string) => ['opp', 'history', id] as const,
}

/** The viewer's time zone from their profile (falls back to the device). */
export function useViewerTimeZone(): string {
  const profile = useMyProfile()
  return profile.data?.timezone ?? deviceTimeZone()
}

export function useOpportunities() {
  return useQuery({ queryKey: oppKeys.list(), queryFn: listOpportunities })
}

export function useOpportunity(id: string) {
  return useQuery({
    queryKey: oppKeys.detail(id),
    queryFn: () => getOpportunity(id),
    enabled: Boolean(id),
  })
}

export function useOpportunitySources(id: string) {
  return useQuery({ queryKey: oppKeys.sources(id), queryFn: () => listSources(id) })
}

export function useOpportunityProvenance(id: string) {
  return useQuery({ queryKey: oppKeys.provenance(id), queryFn: () => listProvenance(id) })
}

export function useOpportunityHistory(id: string) {
  return useQuery({ queryKey: oppKeys.history(id), queryFn: () => listHistory(id) })
}

export function useSaveOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string | null; payload: SavePayload; sourceUrl: string | null }) =>
      saveOpportunity(args.id, args.payload, args.sourceUrl),
    onSuccess: () => qc.invalidateQueries({ queryKey: oppKeys.all }),
  })
}

export function useSetStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; status: OpportunityStatus }) =>
      setStatus(args.id, args.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: oppKeys.all }),
  })
}

export function useSetDeleted() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (args: { id: string; deleted: boolean }) =>
      setDeleted(args.id, args.deleted, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: oppKeys.all }),
  })
}
