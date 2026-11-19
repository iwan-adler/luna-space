import { CountdownRing } from '@/components/patterns/CountdownRing'
import { litPath } from '@/lib/moon'
import { gradientFor } from '@/lib/visuals'
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

function MoonDot({ phase, active, size = 18 }: { phase: number; active: boolean; size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <circle cx="10" cy="10" r="8" fill="var(--moon-shade)" stroke="var(--color-border)" />
      {phase > 0.02 ? (
        <path d={litPath(Math.min(phase, 0.5), 10, 10, 8)} fill={active ? '#fff3f9' : '#d7b8cb'} />
      ) : null}
      {active ? (
        <circle
          cx="10"
          cy="10"
          r="9.3"
          fill="none"
          stroke="var(--color-highlight)"
          strokeWidth="1.2"
          style={{ filter: 'drop-shadow(0 0 3px var(--color-highlight))' }}
        />
      ) : null}
    </svg>
  )
}

/** Idea 🌑 → Presenting 🌕: where the project is, drawn as moon phases (ADR 0019). */
export function StageTrack({ stage, compact = false }: { stage: ProjectStage; compact?: boolean }) {
  const at = TRACK.indexOf(stage)
  const finished = stage === 'completed'
  return (
    <ol
      className={`flex items-center ${compact ? 'gap-1' : 'gap-1.5'}`}
      aria-label={`Project journey, now at ${STAGE_LABELS[stage]}`}
      data-testid="stage-track"
    >
      {TRACK.map((s, i) => {
        const reached = finished || (at >= 0 && i <= at)
        const phase = (i / (TRACK.length - 1)) * 0.5
        return (
          <li key={s} className="flex items-center gap-1" title={STAGE_LABELS[s]}>
            <span className={reached ? '' : 'opacity-35'}>
              <MoonDot phase={phase} active={i === at} size={compact ? 14 : 20} />
            </span>
            {!compact && i === at ? (
              <span className="text-caption font-medium text-highlight">{STAGE_LABELS[s]}</span>
            ) : null}
            {i < TRACK.length - 1 ? (
              <span
                aria-hidden
                className={`h-px ${compact ? 'w-1.5' : 'w-3'} ${reached && (finished || i < at) ? 'bg-[var(--color-highlight)]' : 'bg-hairline'}`}
              />
            ) : null}
          </li>
        )
      })}
      {finished ? <li className="ml-1 text-caption font-medium text-success">Completed</li> : null}
    </ol>
  )
}

/** A project's cover: a gradient generated from its name, with a few stars. */
export function ProjectCover({ name, className = '' }: { name: string; className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden ${className}`}
      style={{ background: gradientFor(name) }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_80%_0%,rgb(255_255_255/0.28),transparent_55%)]" />
      <div className="ambient__stars !opacity-70" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/35 to-transparent" />
    </div>
  )
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
