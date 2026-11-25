import { useId, type CSSProperties } from 'react'
import { cn } from '@/lib/utils'

/**
 * Procedural solar corona loader (From Uiverse.io by andrew-manzyk).
 * Seamlessly scales from inline buttons (16-24px) up to full-page loading states.
 */
export function Spinner({
  className = 'size-5',
  label,
  size,
}: {
  className?: string
  label?: string
  size?: number
}) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const maskId = `clipping_${rawId}`

  let px = size
  if (!px) {
    if (className.includes('size-3')) px = 12
    else if (className.includes('size-4')) px = 16
    else if (className.includes('size-5')) px = 20
    else if (className.includes('size-6')) px = 24
    else if (className.includes('size-7')) px = 28
    else if (className.includes('size-8')) px = 32
    else if (className.includes('size-10')) px = 40
    else if (className.includes('size-12')) px = 48
    else px = 24
  }

  const scale = px / 100
  const isCompact = px <= 32

  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label}
      className={`inline-flex shrink-0 items-center justify-center ${className}`}
      style={{ width: px, height: px }}
    >
      <div
        className="uiverse-loader"
        data-compact={isCompact}
        style={
          {
            '--size': scale,
            '--mask-url': `url(#${maskId})`,
          } as CSSProperties
        }
      >
        <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <polygon points="0,0 100,0 100,100 0,100" fill="black" />
              <polygon points="25,25 75,25 50,75" fill="white" />
              <polygon points="50,25 75,75 25,75" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
              <polygon points="35,35 65,35 50,65" fill="white" />
            </mask>
          </defs>
        </svg>
        <div className="box" />
      </div>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

export function PageSpinner({
  label = 'Loading',
  size = 80,
  className = '',
  fullScreen = false,
}: {
  label?: string
  size?: number
  className?: string
  fullScreen?: boolean
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 text-muted my-auto self-center',
        fullScreen
          ? 'fixed inset-0 z-50 min-h-dvh bg-bg/90 backdrop-blur-xs'
          : 'flex-1 min-h-[60vh] sm:min-h-[70vh]',
        className,
      )}
    >
      <Spinner size={size} label={label} />
      {label ? (
        <p className="text-body-sm font-medium tracking-wide text-muted animate-pulse">
          {label}...
        </p>
      ) : null}
    </div>
  )
}
