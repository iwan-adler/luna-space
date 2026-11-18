import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { deviceTimeZone } from '@/lib/timezones'
import type { Database } from '@/types/database'

export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfilePatch = Pick<
  Database['public']['Tables']['profiles']['Update'],
  'display_name' | 'timezone' | 'availability' | 'avatar_path'
>

export const profileKeys = {
  me: (userId: string | undefined) => ['profile', 'me', userId] as const,
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
