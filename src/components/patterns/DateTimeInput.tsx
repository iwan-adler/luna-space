import { useId } from 'react'
import { controlClass } from '@/components/ui/styles'
import { timeZoneOptions } from '@/lib/timezones'

export interface DateTimeValue {
  date: string
  hasTime: boolean
  time: string
  timezone: string
}

/**
 * DateField (UI spec §7): date-only by default; "Add time" switches to a timed value with an
 * explicit time zone. A date-only value never gets a time invented for it (FR-OPP-03).
 */
export function DateTimeInput({
  label,
  value,
  onChange,
  error,
}: {
  label: string
  value: DateTimeValue
  onChange: (v: DateTimeValue) => void
  error?: string | undefined
}) {
  const id = useId()
  const zones = timeZoneOptions(value.timezone)
  const control = controlClass
  return (
    <fieldset className="space-y-1">
      <legend className="mb-1 text-body-sm font-medium text-muted">{label}</legend>
      <div className="flex flex-wrap items-center gap-2">
        <input
          id={`${id}-date`}
          type="date"
          aria-label={`${label} date`}
          className={control}
          value={value.date}
          onChange={(e) => onChange({ ...value, date: e.target.value })}
        />
        {value.date ? (
          <label className="flex items-center gap-1 text-caption text-muted">
            <input
              type="checkbox"
              checked={value.hasTime}
              onChange={(e) => onChange({ ...value, hasTime: e.target.checked })}
            />
            Specific time
          </label>
        ) : null}
        {value.date && value.hasTime ? (
          <>
            <input
              type="time"
              aria-label={`${label} time`}
              className={control}
              value={value.time}
              onChange={(e) => onChange({ ...value, time: e.target.value })}
            />
            <select
              aria-label={`${label} time zone`}
              className={`${control} max-w-48`}
              value={value.timezone}
              onChange={(e) => onChange({ ...value, timezone: e.target.value })}
            >
              {zones.map((z) => (
                <option key={z.value} value={z.value}>
                  {z.label}
                </option>
              ))}
            </select>
          </>
        ) : value.date ? (
          <span className="text-caption text-muted">All day</span>
        ) : null}
        {value.date ? (
          <button
            type="button"
            className="text-caption text-muted underline"
            onClick={() => onChange({ ...value, date: '', hasTime: false, time: '' })}
          >
            Clear
          </button>
        ) : null}
      </div>
      {error ? <p className="text-caption text-danger">{error}</p> : null}
    </fieldset>
  )
}
