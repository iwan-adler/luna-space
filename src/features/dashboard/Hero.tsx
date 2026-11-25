import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { useViewerTimeZone } from '@/features/profile'
import { getLocalHour, getTimeBucket, pickGreeting, type GreetingConfig } from './greetings'

const SESSION_KEY = 'luna.greeting.session'
const LAST_GREETING_KEY = 'luna.greeting.last'
const LAST_VISIT_KEY = 'luna.greeting.last_visit'

function getInitialGreeting(
  name?: string,
  timeZone?: string,
  deadlineDays?: number,
): GreetingConfig {
  const now = new Date()
  const hour = getLocalHour(now, timeZone)
  const currentBucket = getTimeBucket(hour)

  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as GreetingConfig & { hour?: number; name?: string }
      if (parsed.bucket === currentBucket && parsed.name === name && parsed.greeting) {
        return {
          greeting: parsed.greeting,
          subtitle: parsed.subtitle,
          bucket: parsed.bucket,
        }
      }
    }
  } catch {
    // sessionStorage unavailable (private browsing)
  }

  // Calculate days since last visit
  let daysSinceLastVisit: number | undefined
  try {
    const lastVisitStr = localStorage.getItem(LAST_VISIT_KEY)
    if (lastVisitStr) {
      const diffMs = Date.now() - parseInt(lastVisitStr, 10)
      daysSinceLastVisit = diffMs / (1000 * 60 * 60 * 24)
    }
    localStorage.setItem(LAST_VISIT_KEY, Date.now().toString())
  } catch {
    // localStorage unavailable
  }

  let lastGreeting: string | undefined
  try {
    lastGreeting = localStorage.getItem(LAST_GREETING_KEY) || undefined
  } catch {
    // ignore
  }

  const generated = pickGreeting({
    date: now,
    timeZone,
    name,
    lastGreeting,
    daysSinceLastVisit,
    deadlineDays,
  })

  try {
    localStorage.setItem(LAST_GREETING_KEY, generated.greeting)
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...generated, hour, name }))
  } catch {
    // ignore
  }

  return generated
}

/** The dashboard opening: Claude-style dynamic greeting and high-priority vital stats. */
export function Hero({
  name,
  timeZone,
  deadlineDays,
  view,
  onViewChange,
}: {
  name: string | undefined
  workspaceName?: string
  greeting?: string
  today?: string
  timeZone?: string
  deadlineDays?: number
  view?: 'shared' | 'me'
  onViewChange?: (v: 'shared' | 'me') => void
}) {
  const viewerTz = useViewerTimeZone()
  const activeTz = timeZone ?? viewerTz

  const [prevKey, setPrevKey] = useState(() => `${name ?? ''}|${activeTz}|${deadlineDays ?? ''}`)
  const [config, setConfig] = useState<GreetingConfig>(() =>
    getInitialGreeting(name, activeTz, deadlineDays),
  )

  const currentKey = `${name ?? ''}|${activeTz}|${deadlineDays ?? ''}`
  if (prevKey !== currentKey) {
    setPrevKey(currentKey)
    setConfig(getInitialGreeting(name, activeTz, deadlineDays))
  }

  useEffect(() => {
    // Check every minute for time bucket transitions
    const interval = setInterval(() => {
      const currentHour = getLocalHour(new Date(), activeTz)
      const currentBucket = getTimeBucket(currentHour)
      if (currentBucket !== config.bucket) {
        const next = getInitialGreeting(name, activeTz, deadlineDays)
        setConfig(next)
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [activeTz, config.bucket, deadlineDays, name])

  return (
    <section aria-labelledby="home-title" className="border-b border-border pb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <motion.div
          key={config.greeting}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0 flex-1"
        >
          <h1
            id="home-title"
            className="text-[clamp(24px,3.5vw,36px)] font-semibold tracking-tight text-text leading-tight"
          >
            {config.greeting}
          </h1>
        </motion.div>

        {view && onViewChange ? (
          <div
            role="group"
            aria-label="Dashboard view"
            className="relative self-start sm:self-auto flex rounded-lg border border-border bg-surface p-1 shadow-sm shrink-0"
          >
            <span
              aria-hidden
              className="nav-active absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-md transition-transform duration-[var(--motion-slow)] ease-[var(--ease-standard)]"
              style={{ transform: view === 'me' ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {(['shared', 'me'] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => onViewChange(v)}
                className={`relative z-10 min-w-18 rounded-md px-3.5 py-1 text-caption font-medium transition-colors ${
                  view === v ? 'text-text' : 'text-muted hover:text-text'
                }`}
              >
                {v === 'shared' ? 'Shared' : 'Me'}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
