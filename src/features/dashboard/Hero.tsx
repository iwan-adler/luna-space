import { CheckSquare, Bell, MessageCircle, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useChatUnread } from '@/features/chat'
import { useUnreadCount } from '@/features/notifications'
import { useMyTasks } from '@/features/projects'
import { illumination, litPath, moonPhase, moonPhaseName } from './moon'

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** A number that counts up to its value once it is known. */
function CountUp({ value }: { value: number | undefined }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    if (value === undefined) return
    if (reducedMotion() || value === 0) {
      const id = requestAnimationFrame(() => setShown(value))
      return () => cancelAnimationFrame(id)
    }
    const start = performance.now()
    let id = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 900)
      setShown(Math.round(value * (1 - Math.pow(1 - k, 3))))
      if (k < 1) id = requestAnimationFrame(step)
    }
    id = requestAnimationFrame(step)
    return () => cancelAnimationFrame(id)
  }, [value])
  return <>{value === undefined ? '–' : shown}</>
}

function Stat({
  to,
  icon: Icon,
  label,
  value,
  testId,
}: {
  to: string
  icon: LucideIcon
  label: string
  value: number | undefined
  testId: string
}) {
  return (
    <Link
      to={to}
      className="lift group flex flex-col gap-1 rounded-[18px] border border-hairline bg-[var(--control-fill)] px-3 py-3 backdrop-blur-md xl:flex-row xl:items-center xl:gap-3 xl:px-4"
    >
      <span className="icon-bubble hidden size-9 shrink-0 xl:grid">
        <Icon className="size-4" aria-hidden />
      </span>
      <span>
        <span className="stat-number block text-[26px] leading-7" data-testid={testId}>
          <CountUp value={value} />
        </span>
        <span className="block text-caption leading-4 text-muted group-hover:text-text">
          {label}
        </span>
      </span>
    </Link>
  )
}

/** Today's real moon phase in a slowly turning orbit, with twinkling stars (decorative). */
function MoonArt() {
  const p = moonPhase(new Date())
  const lit = litPath(p, 100, 100, 54)
  return (
    <div
      className="pointer-events-none absolute top-2 right-2 aspect-square w-16 md:pointer-events-auto md:relative md:inset-auto md:mx-auto md:w-52"
      aria-hidden="true"
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <radialGradient id="moon-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-highlight)" stopOpacity="0.45" />
            <stop offset="55%" stopColor="var(--color-highlight)" stopOpacity="0.08" />
            <stop offset="100%" stopColor="var(--color-highlight)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="moon-lit" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#fff9fc" />
            <stop offset="60%" stopColor="#f2d6e7" />
            <stop offset="100%" stopColor="#c99ab8" />
          </radialGradient>
          <clipPath id="moon-disc">
            <circle cx="100" cy="100" r="54" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#moon-halo)" />
        <circle cx="100" cy="100" r="54" fill="var(--moon-shade)" opacity="0.92" />
        <path d={lit} fill="url(#moon-lit)" />
        <g clipPath="url(#moon-disc)" opacity="0.18" fill="#7a5a6f">
          <circle cx="82" cy="84" r="9" />
          <circle cx="116" cy="118" r="12" />
          <circle cx="112" cy="76" r="5" />
          <circle cx="78" cy="122" r="6" />
        </g>
        <circle
          cx="100"
          cy="100"
          r="54"
          fill="none"
          stroke="rgb(255 255 255 / 0.18)"
          strokeWidth="0.75"
        />
      </svg>
      <div className="orbit absolute inset-1" style={{ animation: 'orbit 40s linear infinite' }}>
        <svg viewBox="0 0 200 200" className="size-full overflow-visible">
          <ellipse
            cx="100"
            cy="100"
            rx="94"
            ry="94"
            fill="none"
            stroke="var(--color-highlight)"
            strokeOpacity="0.28"
            strokeDasharray="2 7"
          />
          <circle cx="194" cy="100" r="4" fill="var(--color-highlight)">
            <animate attributeName="r" values="3;4.5;3" dur="3s" repeatCount="indefinite" />
          </circle>
        </svg>
      </div>
      {[
        [8, 22, 0],
        [88, 10, 1.2],
        [96, 78, 2.1],
        [4, 84, 0.6],
      ].map(([x, y, d], i) => (
        <span
          key={i}
          className="absolute size-1 rounded-full bg-[var(--color-highlight)] shadow-[0_0_8px_2px_var(--color-highlight)]"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            animation: `twinkle 2.6s ease-in-out ${d}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

/** The dashboard's opening card: greeting, moon and three live counts. */
export function Hero({
  name,
  workspaceName,
  greeting,
  today,
}: {
  name: string | undefined
  workspaceName: string
  greeting: string
  today: string
}) {
  const tasks = useMyTasks()
  const chat = useChatUnread()
  const notes = useUnreadCount()
  const p = moonPhase(new Date())
  return (
    <section
      aria-labelledby="home-title"
      className="panel panel-glow rise relative overflow-hidden p-6 sm:p-8"
    >
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-[radial-gradient(circle,var(--aurora-2),transparent_65%)] blur-2xl" />
      <div className="relative grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-5">
          <p className="eyebrow pr-20 tracking-[0.18em] uppercase md:pr-0">
            {today} · {moonPhaseName(p)}, {Math.round(illumination(p) * 100)}% lit
          </p>
          <div>
            <h1
              id="home-title"

              className="text-[clamp(32px,5vw,52px)] leading-[1.05] font-semibold tracking-[-0.035em]"
            >
              Welcome{name ? ', ' : ''}
              {name ? <span className="text-gradient">{name}</span> : null}
            </h1>
            <p className="mt-2 text-body text-muted">
              {greeting} · here&apos;s your {workspaceName} overview
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
            <Stat
              to="/tasks"
              icon={CheckSquare}
              label="Open tasks for you"
              value={tasks.data?.length}
              testId="stat-tasks"
            />
            <Stat
              to="/chat"
              icon={MessageCircle}
              label="Unread messages"
              value={chat.data}
              testId="stat-chat"
            />
            <Stat
              to="/notifications"
              icon={Bell}
              label="Notifications"
              value={notes.data}
              testId="stat-notifications"
            />
          </div>
        </div>
        <MoonArt />
      </div>
    </section>
  )
}
