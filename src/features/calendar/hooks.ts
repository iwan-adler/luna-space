import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useCurrentWorkspace } from '@/features/workspace'
import { zonedLocalToUtcIso, type DateOnly } from '@/lib/dates'
import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { addDays, expandRecurring, toFeedItem, type CalendarEvent, type FeedItem } from './model'

type EventInsert = Database['public']['Tables']['calendar_events']['Insert']
export type EventInput = Pick<
  EventInsert,
  | 'title'
  | 'kind'
  | 'description'
  | 'location'
  | 'all_day'
  | 'start_date'
  | 'end_date'
  | 'starts_at'
  | 'ends_at'
  | 'timezone'
  | 'visibility'
  | 'reminder_offsets'
  | 'rrule'
  | 'exdates'
>

export const calendarKeys = {
  all: ['calendar'] as const,
  feed: (from: DateOnly, to: DateOnly, tz: string) => ['calendar', 'feed', from, to, tz] as const,
  event: (id: string) => ['calendar', 'event', id] as const,
}

/** Everything on the calendar between two dates (inclusive) in the viewer's zone. */
export function useCalendarFeed(from: DateOnly, to: DateOnly, viewerTz: string) {
  return useQuery({
    queryKey: calendarKeys.feed(from, to, viewerTz),
    queryFn: async (): Promise<FeedItem[]> => {
      const startIso = zonedLocalToUtcIso(`${from}T00:00`, viewerTz)
      const endIso = zonedLocalToUtcIso(`${addDays(to, 1)}T00:00`, viewerTz)
      const { data, error } = await requireSupabase()
        .from('calendar_feed')
        .select('*')
        .or(
          [
            `and(start_date.gte.${from},start_date.lte.${to})`,
            `and(start_date.lt.${from},end_date.gte.${from})`,
            `and(starts_at.gte.${startIso},starts_at.lt.${endIso})`,
            'rrule.not.is.null',
          ].join(','),
        )
        .limit(2000)
      if (error) throw toAppError(error)
      const items = data.flatMap((r) => {
        const item = toFeedItem(r)
        return item ? [item] : []
      })
      return expandRecurring(items, from, to)
    },
  })
}

export function useCalendarEvent(id: string | null) {
  return useQuery({
    queryKey: calendarKeys.event(id ?? ''),
    enabled: Boolean(id),
    queryFn: async (): Promise<CalendarEvent | null> => {
      const { data, error } = await requireSupabase()
        .from('calendar_events')
        .select('*')
        .eq('id', id!)
        .maybeSingle()
      if (error) throw toAppError(error)
      return data
    },
  })
}

export function useSaveEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: { id: string | null; input: EventInput }) => {
      const db = requireSupabase()
      const { error } = args.id
        ? await db.from('calendar_events').update(args.input).eq('id', args.id)
        : await db
            .from('calendar_events')
            .insert({ ...args.input, workspace_id: workspaceId, owner_id: user!.id })
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.all }),
  })
}

export function useDeleteEvent() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await requireSupabase()
        .from('calendar_events')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user!.id })
        .eq('id', id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.all }),
  })
}

/** Moves a single (non-repeating) event by whole minutes, keeping its duration (drag in the grid). */
export function useMoveEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: {
      id: string
      startsAt: string
      endsAt: string | null
      deltaMinutes: number
    }) => {
      const shift = (iso: string) =>
        new Date(Date.parse(iso) + args.deltaMinutes * 60_000).toISOString()
      const { error } = await requireSupabase()
        .from('calendar_events')
        .update({
          starts_at: shift(args.startsAt),
          ends_at: args.endsAt ? shift(args.endsAt) : null,
        })
        .eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.all }),
  })
}

/** Leaves out one date of a repeating event ("skip this date"). */
export function useSkipOccurrence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: { id: string; exdates: string[]; date: string }) => {
      const { error } = await requireSupabase()
        .from('calendar_events')
        .update({ exdates: [...new Set([...args.exdates, args.date])].sort() })
        .eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: calendarKeys.all }),
  })
}
