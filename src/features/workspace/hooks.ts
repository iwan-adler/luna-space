import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import {
  acceptInvitation,
  createInvitation,
  createWorkspace,
  fetchMembers,
  fetchMembership,
  fetchOpenInvitation,
  renameWorkspace,
  revokeInvitation,
  type Membership,
} from './api'

export const workspaceKeys = {
  membership: (userId: string | undefined) => ['workspace', 'membership', userId] as const,
  members: (workspaceId: string) => ['workspace', 'members', workspaceId] as const,
  invitation: (workspaceId: string) => ['workspace', 'invitation', workspaceId] as const,
}

export function useMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: workspaceKeys.membership(user?.id),
    queryFn: () => fetchMembership(user!.id),
    enabled: Boolean(user),
  })
}

/** For components rendered inside RequireWorkspace, where a membership is guaranteed. */
export function useCurrentWorkspace(): Membership {
  const { data } = useMembership()
  if (!data) throw new Error('useCurrentWorkspace used outside RequireWorkspace')
  return data
}

export function useMembers(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchMembers(workspaceId),
  })
}

export function useOpenInvitation(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.invitation(workspaceId),
    queryFn: () => fetchOpenInvitation(workspaceId),
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

export function useRenameWorkspace(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => renameWorkspace(workspaceId, name),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

export function useCreateInvitation(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInvitation,
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.invitation(workspaceId) }),
  })
}

export function useRevokeInvitation(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: revokeInvitation,
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.invitation(workspaceId) }),
  })
}

export function useAcceptInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: acceptInvitation,
    // Refetch even inactive membership queries so RequireWorkspace never sees the stale "no workspace".
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'], refetchType: 'all' }),
  })
}
