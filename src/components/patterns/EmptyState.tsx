import type { ReactNode } from 'react'
import { litPath } from '@/lib/moon'

const PHASES = [0.08, 0.18, 0.32, 0.5, 0.68, 0.82, 0.92]

/** A row of moon phases waxing to full and waning again; the full moon glows and floats. */
function MoonPhases() {
  return (
    <div className="flex items-center gap-2.5" aria-hidden="true">
      {PHASES.map((p, i) => {
        const full = i === 3
        const size = full ? 44 : i === 2 || i === 4 ? 26 : 18
        return (
          <svg
            key={p}
            viewBox="0 0 40 40"
            width={size}
            height={size}
            className={full ? 'logo-glow float' : ''}
            style={{ opacity: full ? 1 : 0.35 + 0.15 * (3 - Math.abs(3 - i)) }}
          >
            <circle cx="20" cy="20" r="17" fill="var(--moon-shade)" stroke="var(--color-border)" />
            <path d={litPath(p, 20, 20, 17)} fill={full ? '#fff3f9' : 'var(--color-accent)'} />
          </svg>
        )
      })}
    </div>
  )
}

/** Moon-phase empty state (UI spec §24): illustration, title, one sentence, primary action. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <MoonPhases />
      <h2 className="mt-2 text-h2">{title}</h2>
      {children ? <div className="text-body-sm text-muted">{children}</div> : null}
      {action}
    </div>
  )
}
