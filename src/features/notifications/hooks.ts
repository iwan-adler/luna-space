import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
export type Notification = Tables['notifications']['Row']
export type Preferences = Tables['notification_preferences']['Row']

export const notificationKeys = {
  all: (userId: string | undefined) => ['notifications', userId] as const,
  list: (userId: string | undefined) => ['notifications', userId, 'list'] as const,
  unread: (userId: string | undefined) => ['notifications', userId, 'unread'] as const,
  prefs: (userId: string | undefined) => ['notifications', userId, 'prefs'] as const,
}

export function useUnreadCount() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.unread(user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { count, error } = await requireSupabase()
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .is('read_at', null)
      if (error) throw toAppError(error)
      return count ?? 0
    },
  })
}

export function useNotifications() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.list(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await requireSupabase()
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase()
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', id)
        .is('read_at', null)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all(user?.id) }),
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async () => {
      const { error } = await requireSupabase().rpc('mark_all_notifications_read')
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all(user?.id) }),
  })
}

export const DEFAULT_PREFS = {
  deadline_reminder_days: [7, 1, 0],
  timed_reminder_minutes: [1440, 60],
}

export function usePreferences() {
  const { user } = useAuth()
  return useQuery({
    queryKey: notificationKeys.prefs(user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<Preferences | null> => {
      const { data, error } = await requireSupabase()
        .from('notification_preferences')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useSavePreferences() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (patch: {
      deadline_reminder_days?: number[]
      timed_reminder_minutes?: number[]
      quiet_start?: string
      quiet_end?: string
      lockscreen_details?: boolean
    }) => {
      const { error } = await requireSupabase()
        .from('notification_preferences')
        .upsert({ user_id: user!.id, ...patch }, { onConflict: 'user_id' })
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.prefs(user?.id) }),
  })
}

/** New notifications appear without reloading (TRD §9); RLS limits events to the recipient. */
export function useNotificationsRealtime() {
  const qc = useQueryClient()
  const { user } = useAuth()
  useEffect(() => {
    if (!user) return
    const client = requireSupabase()
    const channel = client
      .channel(`notifications:${user.id}:${crypto.randomUUID()}`) // unique per subscriber
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${user.id}`,
        },
        () => void qc.invalidateQueries({ queryKey: notificationKeys.all(user.id) }),
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [user, qc])
}

/** Registers or removes this browser for Web Push (FR-PLAT-08). */
export function useDevicePush() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const enable = useMutation({
    mutationFn: async () => {
      const { subscribeThisDevice } = await import('@/lib/push')
      const sub = await subscribeThisDevice()
      const { error } = await requireSupabase().rpc('save_push_subscription', {
        p_endpoint: sub.endpoint,
        p_p256dh: sub.p256dh,
        p_auth: sub.auth,
        p_user_agent: navigator.userAgent,
      })
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.prefs(user?.id) }),
  })
  const disable = useMutation({
    mutationFn: async () => {
      const { currentSubscription } = await import('@/lib/push')
      const sub = await currentSubscription()
      if (!sub) return
      const { error } = await requireSupabase()
        .from('push_subscriptions')
        .delete()
        .eq('endpoint', sub.endpoint)
      if (error) throw toAppError(error)
      await sub.unsubscribe()
    },
  })
  const test = useMutation({
    mutationFn: async () => {
      const { data, error } = await requireSupabase().rpc('send_test_notification')
      if (error) throw toAppError(error)
      const result = data as { ok?: boolean; code?: string } | null
      if (!result?.ok) throw toAppError({ code: result?.code })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notificationKeys.all(user?.id) }),
  })
  return { enable, disable, test }
}
