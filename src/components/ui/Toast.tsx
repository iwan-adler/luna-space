import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type Tone = 'success' | 'info' | 'warning' | 'error'

export interface ToastOptions {
  description?: string
  duration?: number
  tag?: string
}

export interface ToastItem {
  id: number
  tone: Tone
  message: string
  description?: string
  duration: number
  tag?: string
  timestamp: number
}

export interface ToastApi {
  show: (message: string, tone?: Tone, options?: ToastOptions | string) => void
  dismiss: (id: number) => void
}

const ToastContext = createContext<ToastApi | null>(null)

function inferTag(message: string): string | undefined {
  if (message.startsWith('Accent changed')) return 'accent'
  if (message.startsWith('Theme set to')) return 'theme'
  if (message.startsWith('Notifications')) return 'notifications'
  if (message.startsWith('Profile')) return 'profile'
  if (message.startsWith('Workspace')) return 'workspace'
  if (message.startsWith('Your data')) return 'data'
  if (message.startsWith('Restored')) return 'recycle'
  return undefined
}

function ToastIcon({ tone }: { tone: Tone }) {
  if (tone === 'success') {
    return (
      <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-success text-white shadow-sm">
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
          <motion.path
            d="M4.5 10.5l3.5 3.5 7.5-7.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          />
        </svg>
      </div>
    )
  }

  if (tone === 'error') {
    return (
      <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-danger text-white shadow-sm">
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
          <circle cx="10" cy="14.5" r="1.25" fill="currentColor" />
          <path d="M10 5.5v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  if (tone === 'warning') {
    return (
      <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-warning text-white shadow-sm">
        <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
          <circle cx="10" cy="14.5" r="1.25" fill="currentColor" />
          <path d="M10 5.5v6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
    )
  }

  return (
    <div className="flex size-[22px] shrink-0 items-center justify-center rounded-full bg-info text-white shadow-sm">
      <svg viewBox="0 0 20 20" className="size-3.5" fill="none">
        <circle cx="10" cy="5.5" r="1.25" fill="currentColor" />
        <path d="M10 9v5.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </div>
  )
}

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const [isPaused, setIsPaused] = useState(false)
  const reducedMotion = useReducedMotion()

  // Auto-dismiss timer with pause on hover / touch
  useEffect(() => {
    if (isPaused) return
    const timer = window.setTimeout(() => {
      onDismiss()
    }, item.duration)
    return () => window.clearTimeout(timer)
  }, [item.id, item.timestamp, item.duration, isPaused, onDismiss])

  const hasDescription = Boolean(item.description)

  return (
    <motion.div
      layout
      initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.96 }}
      animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={
        reducedMotion
          ? { opacity: 0 }
          : {
              opacity: 0,
              y: -14,
              scale: 0.96,
              transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
            }
      }
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.6}
      onDragEnd={(_e, info) => {
        if (Math.abs(info.offset.y) > 25 || Math.abs(info.velocity.y) > 200) {
          onDismiss()
        }
      }}
      onClick={onDismiss}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      role={item.tone === 'error' ? 'alert' : 'status'}
      aria-live={item.tone === 'error' ? 'assertive' : 'polite'}
      className={`pointer-events-auto group relative flex max-w-[360px] cursor-pointer select-none items-center gap-3 border border-white/12 dark:border-white/12 bg-[var(--glass-bg)] shadow-[var(--shadow-card)] backdrop-blur-[24px] backdrop-saturate-[180%] transition-shadow hover:shadow-2 ${
        hasDescription ? 'rounded-[20px] px-4 py-2.5' : 'rounded-full px-4 py-2'
      }`}
    >
      <ToastIcon tone={item.tone} />
      <div className="flex-1 min-w-0">
        <p className="line-clamp-2 text-[14px] sm:text-[15px] font-semibold text-text leading-tight">
          {item.message}
        </p>
        {item.description && (
          <p className="line-clamp-2 text-[13px] text-muted leading-tight mt-0.5">
            {item.description}
          </p>
        )}
      </div>
    </motion.div>
  )
}

/** Premium iOS-style confirmation toast system. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: Tone = 'info', options?: ToastOptions | string) => {
      const opts = typeof options === 'string' ? { description: options } : options
      const tag = opts?.tag ?? inferTag(message)
      const isInstant = tag === 'accent' || tag === 'theme'
      const duration = opts?.duration ?? (tone === 'error' ? 5000 : isInstant ? 1800 : 2500)
      const timestamp = Date.now()

      setItems((list) => {
        // If a toast from the same settings area is already visible, update it in place
        if (tag) {
          const index = list.findIndex((t) => t.tag === tag)
          if (index !== -1) {
            const updated = [...list]
            updated[index] = {
              ...updated[index]!,
              message,
              tone,
              description: isInstant ? undefined : opts?.description,
              duration,
              timestamp,
            }
            return updated
          }
        }

        const id = timestamp + Math.random()
        const newItem: ToastItem = {
          id,
          tone,
          message,
          description: isInstant ? undefined : opts?.description,
          duration,
          tag,
          timestamp,
        }

        // Keep at most 2 toasts at once
        return [...list.slice(-1), newItem]
      })
    },
    [],
  )

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top,0px)+12px)] z-50 flex flex-col items-center gap-2 px-4"
      >
        <AnimatePresence mode="popLayout">
          {items.map((t) => (
            <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastApi {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
