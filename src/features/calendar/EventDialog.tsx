import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { controlClass, inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { addHoursLocal, utcIsoToZonedLocal, zonedLocalToUtcIso, type DateOnly } from '@/lib/dates'
import { messageForCode, toAppError } from '@/lib/errors'
import { timeZoneOptions } from '@/lib/timezones'
import { useDeleteEvent, useSaveEvent, useSkipOccurrence, type EventInput } from './hooks'
import { formatDateOnly } from '@/lib/dates'
import {
  KIND_LABELS,
  REMINDER_OPTIONS,
  type CalendarEvent,
  type EventKind,
  type FeedItem,
} from './model'
import { buildRule, parseRule, WEEKDAY_CODES, type Freq, type WeekdayCode } from './recurrence'

interface Draft {
  title: string
  kind: EventKind
  allDay: boolean
  startDate: string
  endDate: string
  start: string // local "YYYY-MM-DDTHH:mm"
  end: string
  timezone: string
  location: string
  description: string
  isPrivate: boolean
  reminder: string // '' = none, else minutes
  repeat: 'none' | Freq
  interval: number
  byDay: WeekdayCode[]
  ends: 'never' | 'until' | 'count'
  until: string
  count: number
}

const DAY_SHORT: Record<WeekdayCode, string> = {
  MO: 'M',
  TU: 'T',
  WE: 'W',
  TH: 'T',
  FR: 'F',
  SA: 'S',
  SU: 'S',
}
const DAY_LONG: Record<WeekdayCode, string> = {
  MO: 'Monday',
  TU: 'Tuesday',
  WE: 'Wednesday',
  TH: 'Thursday',
  FR: 'Friday',
  SA: 'Saturday',
  SU: 'Sunday',
}
const weekdayOf = (d: string): WeekdayCode =>
  WEEKDAY_CODES[(new Date(`${d}T00:00:00Z`).getUTCDay() + 6) % 7]!
const pad = (n: number) => String(n).padStart(2, '0')

function repeatFields(rrule: string | null, firstDay: string) {
  const r = parseRule(rrule)
  return {
    repeat: (r?.freq ?? 'none') as Draft['repeat'],
    interval: r?.interval ?? 1,
    byDay: r?.byDay.length ? r.byDay : [weekdayOf(firstDay)],
    ends: (r?.until ? 'until' : r?.count ? 'count' : 'never') as Draft['ends'],
    until: r?.until ?? '',
    count: r?.count ?? 10,
  }
}

function draftFrom(
  event: CalendarEvent | null,
  day: DateOnly,
  tz: string,
  startMinutes: number | null,
): Draft {
  if (!event) {
    const m = startMinutes ?? 600
    const start = `${day}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`
    return {
      title: '',
      kind: 'meeting',
      allDay: false,
      startDate: day,
      endDate: '',
      start,
      end: addHoursLocal(start, 1),
      timezone: tz,
      location: '',
      description: '',
      isPrivate: false,
      reminder: '60',
      ...repeatFields(null, day),
    }
  }
  const zone = event.timezone ?? tz
  return {
    title: event.title,
    kind: event.kind,
    allDay: event.all_day,
    startDate: event.start_date ?? day,
    endDate: event.end_date ?? '',
    start: event.starts_at ? utcIsoToZonedLocal(event.starts_at, zone) : `${day}T10:00`,
    end: event.ends_at ? utcIsoToZonedLocal(event.ends_at, zone) : '',
    timezone: zone,
    location: event.location ?? '',
    description: event.description ?? '',
    isPrivate: event.visibility === 'private',
    reminder: event.reminder_offsets[0] !== undefined ? String(event.reminder_offsets[0]) : '',
    ...repeatFields(
      event.rrule,
      event.start_date ??
        (event.starts_at ? utcIsoToZonedLocal(event.starts_at, zone).slice(0, 10) : day),
    ),
  }
}

/** Create or edit a calendar event (FR-CAL-04/05). */
export function EventDialog({
  open,
  onOpenChange,
  event,
  day,
  viewerTz,
  startMinutes = null,
  occurrence = null,
  others = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  day: DateOnly
  viewerTz: string
  /** Start time chosen by clicking an empty slot in the hour grid. */
  startMinutes?: number | null
  /** The date of the occurrence that was opened, for a repeating event. */
  occurrence?: DateOnly | null
  /** Other timed events around this date, for the overlap warning (FR-CAL-07). */
  others?: FeedItem[]
}) {
  const [draft, setDraft] = useState(() => draftFrom(event, day, viewerTz, startMinutes))
  const skip = useSkipOccurrence()
  const [error, setError] = useState<string>()
  const save = useSaveEvent()
  const remove = useDeleteEvent()
  const toast = useToast()
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setError(undefined)
  }

  const overlaps = (() => {
    if (draft.allDay || !draft.start || !draft.end) return []
    let a: number
    let b: number
    try {
      a = Date.parse(zonedLocalToUtcIso(draft.start, draft.timezone))
      b = Date.parse(zonedLocalToUtcIso(draft.end, draft.timezone))
    } catch {
      return []
    }
    return others.filter(
      (o) =>
        o.sourceType === 'event' &&
        o.sourceId !== event?.id &&
        !o.allDay &&
        o.startsAt &&
        Date.parse(o.startsAt) < b &&
        Date.parse(o.endsAt ?? o.startsAt) > a,
    )
  })()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const title = draft.title.trim()
    if (!title) return setError('Give the event a title.')
    if (draft.allDay && draft.endDate && draft.endDate < draft.startDate)
      return setError('The end date is before the start date.')
    if (!draft.allDay && draft.end && draft.end < draft.start)
      return setError('The event ends before it starts.')
    const input: EventInput = {
      title,
      kind: draft.kind,
      description: draft.description.trim() || null,
      location: draft.location.trim() || null,
      all_day: draft.allDay,
      start_date: draft.allDay ? draft.startDate : null,
      end_date: draft.allDay && draft.endDate ? draft.endDate : null,
      starts_at: draft.allDay ? null : zonedLocalToUtcIso(draft.start, draft.timezone),
      ends_at: !draft.allDay && draft.end ? zonedLocalToUtcIso(draft.end, draft.timezone) : null,
      timezone: draft.allDay ? null : draft.timezone,
      visibility: draft.isPrivate ? 'private' : 'shared',
      reminder_offsets: draft.reminder === '' ? [] : [Number(draft.reminder)],
      rrule:
        draft.repeat === 'none'
          ? null
          : buildRule({
              freq: draft.repeat,
              interval: Math.min(30, Math.max(1, Math.round(draft.interval) || 1)),
              byDay: draft.repeat === 'WEEKLY' ? draft.byDay : [],
              until: draft.ends === 'until' && draft.until ? draft.until : null,
              count:
                draft.ends === 'count'
                  ? Math.min(366, Math.max(1, Math.round(draft.count) || 1))
                  : null,
            }),
    }
    save.mutate(
      { id: event?.id ?? null, input },
      {
        onSuccess: () => {
          toast.show(event ? 'Event updated' : 'Event added', 'success')
          onOpenChange(false)
        },
        onError: (err) =>
          setError(messageForCode(toAppError(err).code, "Couldn't save the event.")),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={event ? 'Edit event' : 'New event'}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="Title"
          value={draft.title}
          maxLength={200}
          autoFocus
          onChange={(e) => set({ title: e.target.value })}
          placeholder="Team sync, mentor call, exam…"
        />
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Kind"
            value={draft.kind}
            onChange={(e) => set({ kind: e.target.value as EventKind })}
            options={Object.entries(KIND_LABELS).map(([value, label]) => ({ value, label }))}
          />
          <SelectField
            label="Reminder"
            value={draft.reminder}
            onChange={(e) => set({ reminder: e.target.value })}
            options={REMINDER_OPTIONS.map((o) => ({
              value: o.value === null ? '' : String(o.value),
              label: o.label,
            }))}
          />
        </div>
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-primary)]"
            checked={draft.allDay}
            onChange={(e) => set({ allDay: e.target.checked })}
          />
          All day
        </label>
        {draft.allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <TextField
              label="Date"
              type="date"
              value={draft.startDate}
              onChange={(e) => set({ startDate: e.target.value })}
            />
            <TextField
              label="Until (optional)"
              type="date"
              value={draft.endDate}
              min={draft.startDate}
              onChange={(e) => set({ endDate: e.target.value })}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Starts"
                type="datetime-local"
                value={draft.start}
                onChange={(e) =>
                  set({
                    start: e.target.value,
                    end:
                      e.target.value && (!draft.end || draft.end <= e.target.value)
                        ? addHoursLocal(e.target.value, 1)
                        : draft.end,
                  })
                }
              />
              <TextField
                label="Ends"
                type="datetime-local"
                value={draft.end}
                min={draft.start}
                onChange={(e) => set({ end: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="event-tz" className="block text-body-sm font-medium text-muted">
                Time zone
              </label>
              <select
                id="event-tz"
                className={`${controlClass} w-full`}
                value={draft.timezone}
                onChange={(e) => set({ timezone: e.target.value })}
              >
                {timeZoneOptions(draft.timezone).map((z) => (
                  <option key={z.value} value={z.value}>
                    {z.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        <fieldset className="space-y-2 rounded-[14px] border border-hairline p-3">
          <legend className="px-1 text-body-sm font-medium text-muted">Repeat</legend>
          <div className="flex flex-wrap items-center gap-2 text-body-sm">
            <select
              aria-label="Repeat"
              className={controlClass}
              value={draft.repeat}
              onChange={(e) => set({ repeat: e.target.value as Draft['repeat'] })}
            >
              <option value="none">Does not repeat</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="MONTHLY">Monthly</option>
            </select>
            {draft.repeat !== 'none' ? (
              <label className="flex items-center gap-2">
                every
                <input
                  type="number"
                  min={1}
                  max={30}
                  aria-label="Repeat interval"
                  className={`${controlClass} w-16`}
                  value={draft.interval}
                  onChange={(e) => set({ interval: Number(e.target.value) })}
                />
                {draft.repeat === 'DAILY' ? 'days' : draft.repeat === 'WEEKLY' ? 'weeks' : 'months'}
              </label>
            ) : null}
          </div>
          {draft.repeat === 'WEEKLY' ? (
            <div className="flex gap-1.5" role="group" aria-label="Repeat on">
              {WEEKDAY_CODES.map((c) => {
                const on = draft.byDay.includes(c)
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={on}
                    aria-label={DAY_LONG[c]}
                    onClick={() =>
                      set({
                        byDay: on
                          ? draft.byDay.filter((x) => x !== c).length
                            ? draft.byDay.filter((x) => x !== c)
                            : draft.byDay
                          : [...draft.byDay, c],
                      })
                    }
                    className={`grid size-8 place-items-center rounded-full text-caption ${on ? 'nav-active' : 'border border-border text-muted'}`}
                  >
                    {DAY_SHORT[c]}
                  </button>
                )
              })}
            </div>
          ) : null}
          {draft.repeat !== 'none' ? (
            <div className="flex flex-wrap items-center gap-2 text-body-sm">
              <select
                aria-label="Ends"
                className={controlClass}
                value={draft.ends}
                onChange={(e) => set({ ends: e.target.value as Draft['ends'] })}
              >
                <option value="never">Never ends</option>
                <option value="until">Ends on</option>
                <option value="count">Ends after</option>
              </select>
              {draft.ends === 'until' ? (
                <input
                  type="date"
                  aria-label="Repeat until"
                  className={controlClass}
                  value={draft.until}
                  min={draft.allDay ? draft.startDate : draft.start.slice(0, 10)}
                  onChange={(e) => set({ until: e.target.value })}
                />
              ) : draft.ends === 'count' ? (
                <label className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={366}
                    aria-label="Number of times"
                    className={`${controlClass} w-20`}
                    value={draft.count}
                    onChange={(e) => set({ count: Number(e.target.value) })}
                  />
                  times
                </label>
              ) : null}
            </div>
          ) : null}
        </fieldset>
        {overlaps.length ? (
          <p
            role="status"
            className="rounded-[12px] bg-warning/12 px-3 py-2 text-body-sm text-warning"
            data-testid="overlap-warning"
          >
            Overlaps with {overlaps.map((o) => o.title).join(', ')}.
          </p>
        ) : null}
        <TextField
          label="Location (optional)"
          value={draft.location}
          maxLength={300}
          onChange={(e) => set({ location: e.target.value })}
          placeholder="Library, Google Meet link…"
        />
        <div className="space-y-1">
          <label htmlFor="event-notes" className="block text-body-sm font-medium text-muted">
            Notes (optional)
          </label>
          <textarea
            id="event-notes"
            rows={3}
            maxLength={5000}
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
            className={inputClass}
          />
        </div>
        <label className="flex items-center gap-2 text-body-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-primary)]"
            checked={draft.isPrivate}
            onChange={(e) => set({ isPrivate: e.target.checked })}
          />
          Private (only you can see it)
        </label>
        {error ? (
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {event && event.rrule && occurrence ? (
              <Button
                variant="ghost"
                loading={skip.isPending}
                onClick={() =>
                  skip.mutate(
                    { id: event.id, exdates: event.exdates, date: occurrence },
                    {
                      onSuccess: () => {
                        toast.show(`Skipped ${formatDateOnly(occurrence)}`, 'success')
                        onOpenChange(false)
                      },
                    },
                  )
                }
              >
                Skip this date
              </Button>
            ) : null}
            {event ? (
              <Button
                variant="ghost"
                loading={remove.isPending}
                onClick={() =>
                  remove.mutate(event.id, {
                    onSuccess: () => {
                      toast.show('Event deleted', 'success')
                      onOpenChange(false)
                    },
                  })
                }
              >
                {event.rrule ? 'Delete series' : 'Delete'}
              </Button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={save.isPending}>
              {event ? 'Save' : 'Add event'}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  )
}
