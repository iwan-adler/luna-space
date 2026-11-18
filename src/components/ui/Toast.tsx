import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type Tone = 'success' | 'info' | 'warning' | 'error'
interface ToastItem {
  id: number
  tone: Tone
  message: string
}

interface ToastApi {
  show: (message: string, tone?: Tone) => void
}

const ToastContext = createContext<ToastApi | null>(null)

/** Minimal toast system; messages are announced through an aria-live region (UI spec §7). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const show = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list.slice(-2), { id, tone, message }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 5000)
  }, [])

  const api = useMemo(() => ({ show }), [show])
  const tones: Record<Tone, string> = {
    success: 'bg-success',
    info: 'bg-info',
    warning: 'bg-warning',
    error: 'bg-danger',
  }

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-full border border-hairline bg-surface-raised/95 px-5 py-3 text-body-sm shadow-2 backdrop-blur"
          >
            <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${tones[t.tone]}`} />
            {t.message}
          </div>
        ))}
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
