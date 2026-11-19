import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '@/features/auth'
import { useNavigate } from 'react-router'
import { getWorkspaceHeader, setWorkspaceHeader } from '@/lib/supabase'
import {
  acceptInvitation,
  createInvitation,
  createWorkspace,
  fetchMembers,
  fetchMyWorkspaces,
  fetchOpenInvitation,
  leaveWorkspace,
  removeMember,
  renameWorkspace,
  revokeInvitation,
  setActiveWorkspace,
  updateWorkspace,
  type Membership,
} from './api'

const TAB_KEY = 'luna.workspace'

function readTabChoice(): string | null {
  try {
    return new URLSearchParams(window.location.search).get('ws') ?? sessionStorage.getItem(TAB_KEY)
  } catch {
    return null
  }
}
function saveTabChoice(id: string) {
  try {
    sessionStorage.setItem(TAB_KEY, id)
  } catch {
    // Per-tab memory is a convenience; the server remembers the last choice too.
  }
}

/**
 * Picks this tab's workspace: a `?ws=` link or the tab's own choice, else the one last chosen
 * on any device, else the oldest. Sets the request header before any other query runs.
 */
export function chooseWorkspace(list: Membership[], wanted: string | null): Membership | null {
  return (
    list.find((w) => w.workspaceId === wanted) ??
    list.find((w) => w.workspaceId === getWorkspaceHeader()) ??
    list.find((w) => w.isActive) ??
    list[0] ??
    null
  )
}

export const workspaceKeys = {
  membership: (userId: string | undefined) => ['workspace', 'membership', userId] as const,
  list: (userId: string | undefined) => ['workspace', 'list', userId] as const,
  members: (workspaceId: string) => ['workspace', 'members', workspaceId] as const,
  invitation: (workspaceId: string) => ['workspace', 'invitation', workspaceId] as const,
}

export function useMembership() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useQuery({
    queryKey: workspaceKeys.membership(user?.id),
    queryFn: async (): Promise<Membership | null> => {
      const list = await fetchMyWorkspaces()
      qc.setQueryData(workspaceKeys.list(user?.id), list)
      const current = chooseWorkspace(list, readTabChoice())
      setWorkspaceHeader(current?.workspaceId ?? null)
      if (current) {
        saveTabChoice(current.workspaceId)
        // Live updates and reminders follow the workspace opened last.
        if (!current.isActive) void setActiveWorkspace(current.workspaceId).catch(() => undefined)
      }
      return current
    },
    enabled: Boolean(user),
  })
}

/** All my workspaces, for the switcher. */
export function useMyWorkspaces() {
  const { user } = useAuth()
  return useQuery({
    queryKey: workspaceKeys.list(user?.id),
    queryFn: fetchMyWorkspaces,
    enabled: Boolean(user),
  })
}

/** Opens another workspace in this tab: everything cached for the old one is dropped. */
export function useSwitchWorkspace() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  return async (id: string, to = '/') => {
    saveTabChoice(id)
    setWorkspaceHeader(id)
    await setActiveWorkspace(id).catch(() => undefined)
    // Switch the current workspace in place, then drop everything cached for the old one.
    await qc.refetchQueries({ queryKey: ['workspace', 'membership'] })
    qc.removeQueries({
      predicate: (q) => q.queryKey[0] !== 'auth' && q.queryKey[0] !== 'workspace',
    })
    await qc.invalidateQueries({ queryKey: ['workspace'] })
    await navigate(to)
  }
}

export function useLeaveWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await leaveWorkspace(id)
      if (getWorkspaceHeader() === id) setWorkspaceHeader(null)
      try {
        if (sessionStorage.getItem(TAB_KEY) === id) sessionStorage.removeItem(TAB_KEY)
      } catch {
        // ignore
      }
    },
    onSuccess: async () => {
      await qc.refetchQueries({ queryKey: ['workspace', 'membership'] })
      qc.removeQueries({
        predicate: (q) => q.queryKey[0] !== 'auth' && q.queryKey[0] !== 'workspace',
      })
      await qc.invalidateQueries({ queryKey: ['workspace'] })
    },
  })
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: removeMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) }),
  })
}

export function useUpdateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: updateWorkspace,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workspace'] }),
  })
}

/**
 * For components rendered inside RequireWorkspace, where a membership is guaranteed. While the
 * workspace is being switched or left, the previous one is returned for that render.
 */
export function useCurrentWorkspace(): Membership {
  const { data } = useMembership()
  const [last, setLast] = useState(data)
  if (data && data !== last) setLast(data)
  const ws = data ?? last
  if (!ws) throw new Error('useCurrentWorkspace used outside RequireWorkspace')
  return ws
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
