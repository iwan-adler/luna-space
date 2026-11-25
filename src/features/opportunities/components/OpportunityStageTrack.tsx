import { MoonDot } from '@/components/patterns/MoonDot'
import { STATUS_LABELS, type OpportunityStatus } from '../constants'

/** The opportunity stages as the moon waxes: Saved/Interested → Planning → Registered → In progress → Submitted → Won */
const OPP_TRACK = [
  { id: 'interested', label: 'Interested', matches: ['saved', 'interested'] },
  { id: 'planning', label: 'Planning', matches: ['planning'] },
  { id: 'registered', label: 'Registered', matches: ['registered'] },
  { id: 'in_progress', label: 'In progress', matches: ['in_progress'] },
  { id: 'submitted', label: 'Submitted', matches: ['submitted', 'awaiting_result'] },
  { id: 'won', label: 'Won', matches: ['won'] },
] as const

export function OpportunityStageTrack({
  status,
  compact = true,
}: {
  status: OpportunityStatus
  compact?: boolean
}) {
  const at = OPP_TRACK.findIndex((s) => (s.matches as readonly string[]).includes(status))
  const finished = status === 'won'
  return (
    <ol
      className={`flex items-center ${compact ? 'gap-1 sm:gap-1.5' : 'gap-2'}`}
      aria-label={`Opportunity journey, now at ${STATUS_LABELS[status] ?? status}`}
      data-testid="opportunity-stage-track"
    >
      {OPP_TRACK.map((s, i) => {
        const reached = finished || (at >= 0 && i <= at)
        const isCurrent = i === at
        const isCompleted = reached && !isCurrent
        const phase = (i / (OPP_TRACK.length - 1)) * 0.5
        return (
          <li key={s.id} className="flex items-center gap-1 sm:gap-1.5" title={s.label}>
            <span>
              <MoonDot
                phase={phase}
                active={isCurrent}
                completed={isCompleted}
                size={compact ? 22 : 28}
              />
            </span>
            {!compact && isCurrent ? (
              <span className="text-caption font-semibold text-highlight drop-shadow-[0_0_8px_rgba(240,168,52,0.5)]">
                {s.label}
              </span>
            ) : null}
            {i < OPP_TRACK.length - 1 ? (
              <span
                aria-hidden
                className={`h-0.5 rounded-full ${compact ? 'w-2 sm:w-2.5' : 'w-3.5 sm:w-4'} ${
                  reached && (finished || i < at)
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_6px_rgba(240,168,52,0.6)]'
                    : 'bg-[#d4d4d8] dark:bg-white/10'
                }`}
              />
            ) : null}
          </li>
        )
      })}
    </ol>
  )
}
