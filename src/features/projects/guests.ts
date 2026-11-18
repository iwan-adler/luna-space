import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { useAuth } from '@/features/auth'
import { AppError, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { GuestRole, RoomPerson } from './room'

type Tables = Database['public']['Tables']
export type GuestInvitation = Omit<Tables['project_guest_invitations']['Row'], 'token_hash'>
export type GuestMembership = Tables['project_guest_memberships']['Row']
export type GuestSettings = Tables['project_guest_settings']['Row']
export type GuestSettingsPatch = Pick<
  Tables['project_guest_settings']['Update'],
  | 'collaborators_can_upload_files'
  | 'collaborators_can_create_tasks'
  | 'viewers_can_comment'
  | 'guests_see_activity'
  | 'max_guests'
>

const db = () => requireSupabase()

const rpcResult = z.object({ ok: z.boolean(), code: z.string().optional() }).passthrough()

function parse<T extends object = Record<string, unknown>>(data: unknown): T {
  const parsed = rpcResult.safeParse(data)
  if (!parsed.success) throw new AppError('Unexpected response from the server.')
  if (!parsed.data.ok) throw toAppError({ code: parsed.data.code })
  return parsed.data as T
}

export const guestKeys = {
  people: (projectId: string) => ['projects', 'people', projectId] as const,
  invitations: (projectId: string) => ['projects', 'invitations', projectId] as const,
  memberships: (projectId: string) => ['projects', 'guest-memberships', projectId] as const,
  settings: (projectId: string) => ['projects', 'guest-settings', projectId] as const,
  myRooms: (userId: string | undefined) => ['projects', 'my-guest-rooms', userId] as const,
}

/** Invitation status shown in the People tab (FR-GUEST-02). */
export function invitationStatus(inv: GuestInvitation, now = new Date()) {
  if (inv.revoked_at) return 'Revoked'
  if (new Date(inv.expires_at) <= now) return 'Expired'
  if (inv.max_uses !== null && inv.use_count >= inv.max_uses) return 'Used up'
  return 'Active'
}

export function joinUrl(token: string): string {
  return `${window.location.origin}/join#${token}`
}

// Queries -----------------------------------------------------------------------------------

export function useRoomPeople(projectId: string) {
  return useQuery({
    queryKey: guestKeys.people(projectId),
    queryFn: async (): Promise<RoomPerson[]> => {
      const { data, error } = await db().rpc('project_directory', { p_project: projectId })
      if (error) throw toAppError(error)
      return data.map((p) => ({
        userId: p.user_id,
        displayName: p.display_name,
        kind: p.kind === 'guest' ? 'guest' : 'member',
        role: (p.role as GuestRole | null) ?? null,
      }))
    },
  })
}

export function useGuestMemberships(projectId: string, enabled = true) {
  return useQuery({
    queryKey: guestKeys.memberships(projectId),
    enabled,
    queryFn: async () => {
      const { data, error } = await db()
        .from('project_guest_memberships')
        .select('*')
        .eq('project_id', projectId)
        .is('removed_at', null)
        .order('joined_at')
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useInvitations(projectId: string, enabled = true) {
  return useQuery({
    queryKey: guestKeys.invitations(projectId),
    enabled,
    queryFn: async (): Promise<GuestInvitation[]> => {
      const { data, error } = await db()
        .from('project_guest_invitations')
        .select(
          'id, workspace_id, project_id, role, label, created_by, created_at, expires_at, max_uses, use_count, last_used_at, revoked_at, revoked_by',
        )
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useGuestSettings(projectId: string) {
  return useQuery({
    queryKey: guestKeys.settings(projectId),
    queryFn: async () => {
      const { data, error } = await db()
        .from('project_guest_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle()
      if (error) throw toAppError(error)
      return data
    },
  })
}

/** Rooms the signed-in person is an active guest of (guest home, FR-GUEST-11). */
export function useMyGuestRooms() {
  const { user } = useAuth()
  return useQuery({
    queryKey: guestKeys.myRooms(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: memberships, error } = await db()
        .from('project_guest_memberships')
        .select('id, project_id, role, joined_at')
        .eq('user_id', user!.id)
        .is('removed_at', null)
        .order('joined_at', { ascending: false })
      if (error) throw toAppError(error)
      if (memberships.length === 0) return []
      const { data: projects, error: pError } = await db()
        .from('projects')
        .select('id, name, stage, end_date')
        .in(
          'id',
          memberships.map((m) => m.project_id),
        )
      if (pError) throw toAppError(pError)
      return memberships.flatMap((m) => {
        const p = projects.find((x) => x.id === m.project_id)
        return p ? [{ ...m, project: p }] : []
      })
    },
  })
}

// Mutations ---------------------------------------------------------------------------------

export interface NewInvitation {
  role: GuestRole
  expiresHours: 1 | 24 | 168 | 720
  maxUses: number | null
  label: string
}

export function useCreateInvitation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NewInvitation) => {
      const { data, error } = await db().rpc('create_project_invitation', {
        p_project: projectId,
        p_role: input.role,
        p_expires_hours: input.expiresHours,
        p_max_uses: input.maxUses as number,
        p_label: input.label,
      })
      if (error) throw toAppError(error)
      return parse<{ token: string; expires_at: string }>(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.invitations(projectId) }),
  })
}

export function useRevokeInvitation(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await db().rpc('revoke_project_invitation', { p_invitation: id })
      if (error) throw toAppError(error)
      parse(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.invitations(projectId) }),
  })
}

function useGuestChange<A>(
  projectId: string,
  call: (args: A) => PromiseLike<{ data: unknown; error: unknown }>,
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: A) => {
      const { data, error } = await call(args)
      if (error) throw toAppError(error)
      parse(data)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: guestKeys.memberships(projectId) })
      void qc.invalidateQueries({ queryKey: guestKeys.people(projectId) })
    },
  })
}

export function useSetGuestRole(projectId: string) {
  return useGuestChange(projectId, (a: { membershipId: string; role: GuestRole }) =>
    db().rpc('set_guest_role', { p_membership: a.membershipId, p_role: a.role }),
  )
}

export function useRemoveGuest(projectId: string) {
  return useGuestChange(projectId, (membershipId: string) =>
    db().rpc('remove_project_guest', { p_membership: membershipId }),
  )
}

export function useLeaveRoom() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (projectId: string) => {
      const { data, error } = await db().rpc('leave_project', { p_project: projectId })
      if (error) throw toAppError(error)
      parse(data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useAcceptRoomInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (token: string) => {
      const { data, error } = await db().rpc('accept_project_invitation', { p_token: token })
      if (error) throw toAppError(error)
      const parsed = rpcResult.safeParse(data)
      if (!parsed.success) throw new AppError('Unexpected response from the server.')
      const result = parsed.data as {
        ok: boolean
        code?: string
        project_id?: string
        role?: GuestRole
      }
      if (result.ok || result.code === 'ALREADY_MEMBER') return result
      throw toAppError({ code: result.code })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  })
}

export function useUpdateGuestSettings(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: GuestSettingsPatch) => {
      const { error } = await db()
        .from('project_guest_settings')
        .update(patch)
        .eq('project_id', projectId)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: guestKeys.settings(projectId) }),
  })
}
