import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { controlClass, inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { addHoursLocal, utcIsoToZonedLocal, zonedLocalToUtcIso, type DateOnly } from '@/lib/dates'
import { messageForCode, toAppError } from '@/lib/errors'
import { timeZoneOptions } from '@/lib/timezones'
import { useDeleteEvent, useSaveEvent, type EventInput } from './hooks'
import { KIND_LABELS, REMINDER_OPTIONS, type CalendarEvent, type EventKind } from './model'

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
}

function draftFrom(event: CalendarEvent | null, day: DateOnly, tz: string): Draft {
  if (!event) {
    return {
      title: '',
      kind: 'meeting',
      allDay: false,
      startDate: day,
      endDate: '',
      start: `${day}T10:00`,
      end: `${day}T11:00`,
      timezone: tz,
      location: '',
      description: '',
      isPrivate: false,
      reminder: '60',
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
  }
}

/** Create or edit a calendar event (FR-CAL-04/05). */
export function EventDialog({
  open,
  onOpenChange,
  event,
  day,
  viewerTz,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  event: CalendarEvent | null
  day: DateOnly
  viewerTz: string
}) {
  const [draft, setDraft] = useState(() => draftFrom(event, day, viewerTz))
  const [error, setError] = useState<string>()
  const save = useSaveEvent()
  const remove = useDeleteEvent()
  const toast = useToast()
  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }))
    setError(undefined)
  }

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
              Delete
            </Button>
          ) : (
            <span />
          )}
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
