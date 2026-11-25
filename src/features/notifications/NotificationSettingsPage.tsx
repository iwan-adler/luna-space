import { Check, ChevronLeft } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Switch } from '@/components/ui/Switch'
import { useToast } from '@/components/ui/Toast'
import { format12HourTime } from '@/lib/dates'
import { pushState, type PushState } from '@/lib/push'
import { DEFAULT_PREFS, useDevicePush, usePreferences, useSavePreferences } from './hooks'

const DAY_OPTIONS = [
  { value: 14, label: '2 weeks before' },
  { value: 7, label: '1 week before' },
  { value: 3, label: '3 days before' },
  { value: 1, label: 'The day before' },
  { value: 0, label: 'On the day' },
]

const MINUTE_OPTIONS = [
  { value: 10080, label: '1 week before' },
  { value: 1440, label: '1 day before' },
  { value: 120, label: '2 hours before' },
  { value: 60, label: '1 hour before' },
  { value: 15, label: '15 minutes before' },
]

const HOURS = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

/**
 * Compressed iOS-style Notification Settings sub-page under /more/notifications.
 */
export function NotificationSettingsPage() {
  const [state, setState] = useState<PushState | null>(null)
  const { enable, disable } = useDevicePush()
  const prefs = usePreferences()
  const save = useSavePreferences()
  const toast = useToast()

  const [saved, setSaved] = useState(false)
  const savedTimer = useRef<number | null>(null)
  const triggerSaved = useCallback(() => {
    setSaved(true)
    if (savedTimer.current) window.clearTimeout(savedTimer.current)
    savedTimer.current = window.setTimeout(() => setSaved(false), 1600)
  }, [])

  useEffect(() => {
    void pushState().then(setState)
    return () => {
      if (savedTimer.current) window.clearTimeout(savedTimer.current)
    }
  }, [])

  const quietStart = (prefs.data?.quiet_start ?? '23:00:00').slice(0, 5)
  const quietEnd = (prefs.data?.quiet_end ?? '07:00:00').slice(0, 5)
  const days = prefs.data?.deadline_reminder_days ?? DEFAULT_PREFS.deadline_reminder_days
  const minutes = prefs.data?.timed_reminder_minutes ?? DEFAULT_PREFS.timed_reminder_minutes

  const toggle = (list: number[], v: number) =>
    list.includes(v) ? list.filter((x) => x !== v) : [...list, v].sort((a, b) => b - a)

  return (
    <section aria-labelledby="notification-settings-title" className="space-y-6 pb-32">
      {/* Header with back button, 17px font-medium title, and tiny Saved indicator */}
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <Link
            to="/more"
            className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-surface-raised hover:text-text transition-colors -ml-1 outline-none focus-visible:ring-2 focus-visible:ring-amber-500/40"
            aria-label="Back to More"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <h1 id="notification-settings-title" className="text-[17px] font-medium text-text">
            Notifications
          </h1>
        </div>
        <span
          aria-live="polite"
          className={`text-[12px] font-medium text-amber-400 transition-opacity duration-300 ${
            saved ? 'opacity-100' : 'opacity-0'
          }`}
        >
          Saved
        </span>
      </div>

      {/* Group 1: Device */}
      <div className="space-y-2">
        <p className="px-1 text-[12px] font-medium tracking-wider text-muted uppercase">Device</p>
        <div className="divide-y divide-border overflow-hidden p-0 rounded-2xl border border-border bg-surface shadow-card">
          {/* Row 1: Push notifications */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <span className="block text-[14px] text-text font-normal">Push notifications</span>
              {state === 'unsupported' ? (
                <p className="mt-0.5 text-[12px] text-muted">
                  On iPhone, add Luna Space to your Home Screen first.
                </p>
              ) : null}
            </div>
            <Switch
              checked={state === 'on'}
              disabled={state === 'unsupported' || enable.isPending || disable.isPending}
              aria-label="Toggle push notifications"
              onCheckedChange={(checked) => {
                if (checked) {
                  enable.mutate(undefined, {
                    onSuccess: () => {
                      setState('on')
                      triggerSaved()
                      toast.show('Notifications turned on', 'success', { tag: 'notifications' })
                    },
                    onError: (e) => {
                      void pushState().then(setState)
                      toast.show(
                        e instanceof Error ? e.message : "Couldn't turn on notifications.",
                        'error',
                      )
                    },
                  })
                } else {
                  disable.mutate(undefined, {
                    onSuccess: () => {
                      setState('off')
                      triggerSaved()
                      toast.show('Notifications turned off', 'success', { tag: 'notifications' })
                    },
                    onError: (e) => {
                      void pushState().then(setState)
                      toast.show(
                        e instanceof Error ? e.message : "Couldn't turn off notifications.",
                        'error',
                      )
                    },
                  })
                }
              }}
            />
          </div>

          {/* Row 2: Quiet hours */}
          <div className="flex items-center justify-between gap-3 px-4 py-3.5">
            <span className="text-[14px] text-text font-normal">Quiet hours</span>
            <div className="flex items-center gap-1.5 shrink-0">
              <CustomSelect
                ariaLabel="Quiet hours start"
                className="w-[98px]"
                buttonClassName="flex h-8 w-[98px] items-center justify-between gap-1 rounded-lg border border-border bg-surface-raised px-2 text-[12.5px] font-medium text-text transition-all hover:bg-surface-hover focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none [&_svg]:size-3.5"
                align="right"
                value={quietStart}
                onChange={(val) => {
                  save.mutate({ quiet_start: val }, { onSuccess: triggerSaved })
                }}
                options={HOURS.map((h) => ({ value: h, label: format12HourTime(h) }))}
              />
              <span className="text-muted text-[13px] font-medium">–</span>
              <CustomSelect
                ariaLabel="Quiet hours end"
                className="w-[98px]"
                buttonClassName="flex h-8 w-[98px] items-center justify-between gap-1 rounded-lg border border-border bg-surface-raised px-2 text-[12.5px] font-medium text-text transition-all hover:bg-surface-hover focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/40 outline-none [&_svg]:size-3.5"
                align="right"
                value={quietEnd}
                onChange={(val) => {
                  save.mutate({ quiet_end: val }, { onSuccess: triggerSaved })
                }}
                options={HOURS.map((h) => ({ value: h, label: format12HourTime(h) }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Group 2: Deadline reminders */}
      <div className="space-y-2">
        <p className="px-1 text-[12px] font-medium tracking-wider text-muted uppercase">
          Reminders
        </p>
        <div className="divide-y divide-border overflow-hidden p-0 rounded-2xl border border-border bg-surface shadow-card">
          {/* Sub-label 1: Date-only deadlines */}
          <div className="p-4 space-y-2.5">
            <span className="block text-[12px] text-muted">Date-only deadlines</span>
            <div className="flex flex-wrap gap-1.5">
              {DAY_OPTIONS.map((o) => {
                const isSelected = days.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      const next = toggle(days, o.value)
                      save.mutate({ deadline_reminder_days: next }, { onSuccess: triggerSaved })
                    }}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isSelected
                        ? 'border border-primary/50 bg-primary-subtle text-primary-ink'
                        : 'border border-border bg-transparent text-muted hover:border-border-strong hover:text-text'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="size-3 text-primary-ink shrink-0" strokeWidth={2.5} />
                    ) : null}
                    <span>{o.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Sub-label 2: Deadlines with a time */}
          <div className="p-4 space-y-2.5">
            <span className="block text-[12px] text-muted">Deadlines with a time</span>
            <div className="flex flex-wrap gap-1.5">
              {MINUTE_OPTIONS.map((o) => {
                const isSelected = minutes.includes(o.value)
                return (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => {
                      const next = toggle(minutes, o.value)
                      save.mutate({ timed_reminder_minutes: next }, { onSuccess: triggerSaved })
                    }}
                    className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                      isSelected
                        ? 'border border-primary/50 bg-primary-subtle text-primary-ink'
                        : 'border border-border bg-transparent text-muted hover:border-border-strong hover:text-text'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="size-3 text-primary-ink shrink-0" strokeWidth={2.5} />
                    ) : null}
                    <span>{o.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
