import { deadlineInfo, formatDated, type DatedValue, type Urgency } from '@/lib/dates'

const tones: Record<Urgency, string> = {
  passed: 'bg-bg text-muted line-through',
  today: 'bg-danger/15 text-danger',
  soon: 'bg-danger/15 text-danger',
  week: 'bg-warning/15 text-warning',
  later: 'bg-primary-subtle text-primary',
}

/** Deadline chip with relative text and the absolute date in a tooltip (UI spec §7). */
export function DeadlineBadge({
  value,
  viewerTz,
  prefix,
}: {
  value: DatedValue
  viewerTz: string
  prefix?: string
}) {
  const info = deadlineInfo(value, viewerTz)
  const absolute = formatDated(value)
  return (
    <span
      title={absolute}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap ${tones[info.urgency]}`}
    >
      {prefix ? `${prefix} ` : ''}
      {info.relative}
      <span className="sr-only"> ({absolute})</span>
    </span>
  )
}
