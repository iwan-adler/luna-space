import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { deviceTimeZone } from '@/lib/timezones'
import type { Database } from '@/types/database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfilePatch = Pick<
  Database['public']['Tables']['profiles']['Update'],
  | 'display_name'
  | 'timezone'
  | 'availability'
  | 'avatar_path'
  | 'bio'
  | 'github_username'
  | 'linkedin_url'
  | 'website_url'
  | 'devpost_username'
  | 'skills'
>

export const profileKeys = {
  me: (userId: string | undefined) => ['profile', 'me', userId] as const,
  one: (userId: string) => ['profile', 'one', userId] as const,
}

/** Someone's public profile: name, bio and links (visible to people who share a workspace). */
export function useProfile(userId: string | null) {
  return useQuery({
    queryKey: profileKeys.one(userId ?? ''),
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('profiles')
        .select(
          'id, display_name, avatar_path, bio, skills, github_username, linkedin_url, website_url, devpost_username, availability, timezone',
        )
        .eq('id', userId!)
        .maybeSingle()
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useMyProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: profileKeys.me(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await requireSupabase()
        .from('profiles')
        .select('*')
        .eq('id', user!.id)
        .single()
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useUpdateProfile() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: ProfilePatch) => {
      const { error } = await requireSupabase().from('profiles').update(patch).eq('id', user!.id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['workspace', 'members'] })
    },
  })
}

/** The viewer's time zone from their profile (falls back to the device). */
export function useViewerTimeZone(): string {
  const profile = useMyProfile()
  return profile.data?.timezone ?? deviceTimeZone()
}
