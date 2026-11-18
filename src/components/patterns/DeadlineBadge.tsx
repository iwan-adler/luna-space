import { deadlineInfo, formatDated, type DatedValue, type Urgency } from '@/lib/dates'

const tones: Record<Urgency, string> = {
  passed: 'bg-hairline text-muted line-through',
  today: 'bg-danger/12 text-danger',
  soon: 'bg-danger/12 text-danger',
  week: 'bg-warning/12 text-warning',
  later: 'bg-hairline text-muted',
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-caption font-medium whitespace-nowrap ${tones[info.urgency]}`}
    >
      {prefix ? `${prefix} ` : ''}
      {info.relative}
      <span className="sr-only"> ({absolute})</span>
    </span>
  )
}
