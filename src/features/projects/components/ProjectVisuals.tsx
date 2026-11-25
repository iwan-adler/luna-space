import { AtmosphericCover } from '@/components/patterns/AtmosphericCover'
import { CountdownRing } from '@/components/patterns/CountdownRing'
import { MoonDot } from '@/components/patterns/MoonDot'
import { STAGE_LABELS, type ProjectStage } from '../constants'

/** The working stages as the moon waxes: new moon at Idea, full moon at Presenting. */
const TRACK: ProjectStage[] = [
  'idea',
  'planning',
  'building',
  'testing',
  'submitting',
  'presenting',
]

/** Idea 🌑 → Presenting 🌕: where the project is, drawn as moon phases (ADR 0019). */
export function StageTrack({ stage, compact = false }: { stage: ProjectStage; compact?: boolean }) {
  const at = TRACK.indexOf(stage)
  const finished = stage === 'completed'
  return (
    <ol
      className={`flex items-center ${compact ? 'gap-1 sm:gap-1.5' : 'gap-2'}`}
      aria-label={`Project journey, now at ${STAGE_LABELS[stage]}`}
      data-testid="stage-track"
    >
      {TRACK.map((s, i) => {
        const reached = finished || (at >= 0 && i <= at)
        const phase = (i / (TRACK.length - 1)) * 0.5
        return (
          <li key={s} className="flex items-center gap-1 sm:gap-1.5" title={STAGE_LABELS[s]}>
            <span className={reached ? '' : 'opacity-40'}>
              <MoonDot phase={phase} active={i === at} size={compact ? 22 : 28} />
            </span>
            {!compact && i === at ? (
              <span className="text-caption font-semibold text-highlight drop-shadow-[0_0_8px_rgba(240,168,52,0.5)]">
                {STAGE_LABELS[s]}
              </span>
            ) : null}
            {i < TRACK.length - 1 ? (
              <span
                aria-hidden
                className={`h-0.5 rounded-full ${compact ? 'w-2 sm:w-2.5' : 'w-3.5 sm:w-4'} ${
                  reached && (finished || i < at)
                    ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_6px_rgba(240,168,52,0.6)]'
                    : 'bg-white/10'
                }`}
              />
            ) : null}
          </li>
        )
      })}
      {finished ? <li className="ml-1 text-caption font-medium text-success">Completed</li> : null}
    </ol>
  )
}

/** A project's cover: atmospheric WebGL cloud shader with subtle star shimmer. */
export function ProjectCover({ className = '', name }: { name?: string; className?: string }) {
  return <AtmosphericCover className={className} name={name} />
}

export function ProgressRing({
  done,
  total,
  size = 52,
}: {
  done: number
  total: number
  size?: number
}) {
  const f = total ? done / total : 0
  return (
    <span title={`${done} of ${total} tasks done`} className="inline-flex">
      <CountdownRing
        fraction={f}
        label={`${Math.round(f * 100)}%`}
        sub={total ? `${done}/${total}` : 'no tasks'}
        size={size}
      />
    </span>
  )
}
