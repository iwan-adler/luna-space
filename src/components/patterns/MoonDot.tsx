import { litPath } from '@/lib/moon'

/** Renders a waxing moon phase dot adapting cleanly to light and dark themes. */
export function MoonDot({
  phase,
  active,
  completed = false,
  size = 22,
}: {
  phase: number
  active: boolean
  completed?: boolean
  size?: number
}) {
  const isInactive = !active && !completed

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      className="overflow-visible"
    >
      {/* Outer ambient amber ring when active */}
      {active ? (
        <>
          <circle
            cx="12"
            cy="12"
            r="10.5"
            fill="none"
            stroke="#f5a524"
            strokeWidth="1.5"
            style={{
              filter: 'drop-shadow(0 0 3px rgba(245, 165, 36, 0.45))',
            }}
          />
          <circle cx="12" cy="12" r="8" fill="rgba(245, 165, 36, 0.12)" />
        </>
      ) : null}

      {/* Crater surface circle: #d4d4d8 on light for inactive, #18181b for completed */}
      <circle
        cx="12"
        cy="12"
        r="8"
        className={
          isInactive
            ? 'fill-[#d4d4d8] stroke-[rgba(0,0,0,0.12)] dark:fill-[#141620] dark:stroke-[rgba(255,255,255,0.14)]'
            : 'fill-[#18181b] stroke-[rgba(245,165,36,0.5)]'
        }
        strokeWidth={isInactive ? 1 : 0.8}
      />

      {/* Lit Moon Part with visible outline */}
      {phase > 0.02 ? (
        <path
          d={litPath(Math.min(phase, 0.5), 12, 12, 8)}
          fill={active ? '#FFFBEB' : completed ? '#CBD5E1' : '#9ca3af'}
          stroke="rgba(0, 0, 0, 0.18)"
          strokeWidth="0.5"
          style={
            active
              ? {
                  filter: 'drop-shadow(0 0 2px rgba(255, 250, 220, 0.9))',
                }
              : undefined
          }
        />
      ) : null}
    </svg>
  )
}
