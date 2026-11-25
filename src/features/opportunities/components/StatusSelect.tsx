import { CustomSelect } from '@/components/ui/CustomSelect'
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
    <div className="inline-flex items-center gap-2 text-body-sm">
      <span className={compact ? 'sr-only' : 'text-muted'}>Status</span>
      <CustomSelect
        value={status}
        disabled={setStatus.isPending}
        align="right"
        ariaLabel="Status"
        buttonClassName="flex items-center justify-between gap-1.5 rounded-full border border-hairline bg-surface-raised px-3 py-1 text-caption font-medium text-text hover:border-border-hover hover:bg-surface focus:border-primary outline-none"
        onChange={(next) => {
          setStatus.mutate(
            { id, status: next as OpportunityStatus },
            {
              onSuccess: () =>
                toast.show(`Status: ${STATUS_LABELS[next as OpportunityStatus]}`, 'success'),
              onError: (err) => toast.show(err.message, 'error'),
            },
          )
        }}
        groups={STATUS_GROUPS.map((g) => ({
          label: g.label,
          options: g.statuses.map((s) => ({
            value: s,
            label: STATUS_LABELS[s],
          })),
        }))}
      />
    </div>
  )
}
