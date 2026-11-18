import { z } from 'zod'
import { AppError, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

export interface Membership {
  workspaceId: string
  workspaceName: string
  seat: number
}

export interface Member {
  userId: string
  seat: number
  joinedAt: string
  displayName: string
  avatarPath: string | null
}

export interface OpenInvitation {
  id: string
  createdAt: string
  expiresAt: string
}

const rpcResult = z.object({
  ok: z.boolean(),
  code: z.string().optional(),
  token: z.string().optional(),
  expires_at: z.string().optional(),
  workspace_id: z.string().optional(),
})

function parseRpc(data: unknown) {
  const parsed = rpcResult.safeParse(data)
  if (!parsed.success) throw new AppError('Unexpected response from the server.')
  if (!parsed.data.ok) throw toAppError({ code: parsed.data.code })
  return parsed.data
}

export async function fetchMembership(userId: string): Promise<Membership | null> {
  const { data, error } = await requireSupabase()
    .from('workspace_members')
    .select('seat, workspace:workspaces!inner(id, name)')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw toAppError(error)
  if (!data) return null
  return { workspaceId: data.workspace.id, workspaceName: data.workspace.name, seat: data.seat }
}

/** Whether the person is an active guest of any project room (routes guest-only accounts). */
export async function fetchHasGuestRooms(userId: string): Promise<boolean> {
  const { count, error } = await requireSupabase()
    .from('project_guest_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('removed_at', null)
  if (error) throw toAppError(error)
  return (count ?? 0) > 0
}

export async function fetchMembers(workspaceId: string): Promise<Member[]> {
  const { data, error } = await requireSupabase()
    .from('workspace_members')
    .select('seat, user_id, joined_at, profile:profiles!inner(display_name, avatar_path)')
    .eq('workspace_id', workspaceId)
    .order('seat')
  if (error) throw toAppError(error)
  return data.map((m) => ({
    userId: m.user_id,
    seat: m.seat,
    joinedAt: m.joined_at,
    displayName: m.profile.display_name,
    avatarPath: m.profile.avatar_path,
  }))
}

export async function fetchOpenInvitation(workspaceId: string): Promise<OpenInvitation | null> {
  const { data, error } = await requireSupabase()
    .from('workspace_invitations')
    .select('id, created_at, expires_at')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  if (error) throw toAppError(error)
  return data ? { id: data.id, createdAt: data.created_at, expiresAt: data.expires_at } : null
}

export async function createWorkspace(name: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_workspace', { p_name: name })
  if (error) throw toAppError(error)
  return data
}

export async function renameWorkspace(workspaceId: string, name: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('workspaces')
    .update({ name })
    .eq('id', workspaceId)
  if (error) throw toAppError(error)
}

/** Returns the full invitation link. The token is shown once and never stored in plain text. */
export async function createInvitation(): Promise<{ url: string; expiresAt: string }> {
  const { data, error } = await requireSupabase().rpc('create_workspace_invitation')
  if (error) throw toAppError(error)
  const result = parseRpc(data)
  if (!result.token || !result.expires_at)
    throw new AppError('Unexpected response from the server.')
  return { url: invitationUrl(result.token), expiresAt: result.expires_at }
}

export async function revokeInvitation(): Promise<void> {
  const { data, error } = await requireSupabase().rpc('revoke_workspace_invitation')
  if (error) throw toAppError(error)
  parseRpc(data)
}

export async function acceptInvitation(token: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('accept_workspace_invitation', {
    p_token: token,
  })
  if (error) throw toAppError(error)
  const result = parseRpc(data)
  if (!result.workspace_id) throw new AppError('Unexpected response from the server.')
  return result.workspace_id
}

export function invitationUrl(token: string) {
  return `${window.location.origin}/invite/${encodeURIComponent(token)}`
}
