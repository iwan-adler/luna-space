import { RefreshCw, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { applyUpdate, UPDATE_EVENT } from '@/lib/push'

/** "A new version is ready" with a Reload button, when a deployment has installed (ADR 0022). */
export function UpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null)
  useEffect(() => {
    const on = (e: Event) => setWaiting((e as CustomEvent<ServiceWorker>).detail)
    window.addEventListener(UPDATE_EVENT, on)
    return () => window.removeEventListener(UPDATE_EVENT, on)
  }, [])
  if (!waiting) return null
  return (
    <div
      role="status"
      className="fixed inset-x-4 bottom-[calc(88px+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-2xl backdrop-blur-none lg:bottom-6"
      data-testid="update-prompt"
    >
      <span className="icon-bubble size-8 shrink-0">
        <RefreshCw className="size-4" aria-hidden />
      </span>
      <p className="flex-1 text-body-sm">A new version of Luna Space is ready.</p>
      <button
        type="button"
        className="btn-primary rounded-full px-3.5 py-1.5 text-body-sm font-medium"
        onClick={() => applyUpdate(waiting)}
      >
        Reload
      </button>
      <button
        type="button"
        className="icon-btn size-8 shrink-0"
        aria-label="Later"
        onClick={() => setWaiting(null)}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
