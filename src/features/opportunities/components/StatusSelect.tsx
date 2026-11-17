import { useToast } from '@/components/ui/Toast'
import { STATUS_GROUPS, STATUS_LABELS, type OpportunityStatus } from '../constants'
import { useSetStatus } from '../hooks'

/** Status menu (FR-OPP-04). Any status may be chosen; the groups show the normal path. */
export function StatusSelect({
  id,
  status,
  compact = false,
}: {
  id: string
  status: OpportunityStatus
  compact?: boolean
}) {
  const setStatus = useSetStatus()
  const toast = useToast()
  return (
    <label className="inline-flex items-center gap-2 text-body-sm">
      <span className={compact ? 'sr-only' : 'text-muted'}>Status</span>
      <select
        value={status}
        disabled={setStatus.isPending}
        onChange={(e) => {
          // Capture now: the controlled select re-renders with the old value until the refetch lands.
          const next = e.target.value as OpportunityStatus
          setStatus.mutate(
            { id, status: next },
            {
              onSuccess: () => toast.show(`Status: ${STATUS_LABELS[next]}`, 'success'),
              onError: (err) => toast.show(err.message, 'error'),
            },
          )
        }}
        className="rounded-sm border border-border bg-surface px-2 py-1 text-body-sm"
      >
        {STATUS_GROUPS.map((g) => (
          <optgroup key={g.id} label={g.label}>
            {g.statuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}
