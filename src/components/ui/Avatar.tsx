import { useState } from 'react'

export interface AvatarProps {
  src?: string | null
  name?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number
  className?: string
  alt?: string
  focalPoint?: { x: number; y: number }
  onClick?: () => void
  'aria-hidden'?: boolean
  variant?: 'solid' | 'soft'
}

const SIZE_MAP: Record<string, { sizeClass: string; textClass: string; px: number }> = {
  xs: { sizeClass: 'size-6', textClass: 'text-[10px]', px: 24 },
  sm: { sizeClass: 'size-8', textClass: 'text-caption font-semibold', px: 32 },
  md: { sizeClass: 'size-10', textClass: 'text-body font-bold', px: 40 },
  lg: { sizeClass: 'size-12', textClass: 'text-h3 font-bold', px: 48 },
  xl: { sizeClass: 'size-16', textClass: 'text-h2 font-bold', px: 64 },
  '2xl': { sizeClass: 'size-28 sm:size-30', textClass: 'text-3xl sm:text-4xl font-bold', px: 116 },
}

/**
 * Universal iOS-inspired Avatar component for Luna Space.
 * Supports static images, animated GIFs (with object-fit: cover), and initial fallbacks on the theme accent.
 */
export function Avatar({
  src,
  name,
  size = 'md',
  className = '',
  alt,
  focalPoint,
  onClick,
  'aria-hidden': ariaHidden,
  variant = 'solid',
}: AvatarProps) {
  const [loadError, setLoadError] = useState(false)

  const sizeInfo = typeof size === 'string' ? (SIZE_MAP[size] ?? SIZE_MAP.md) : null
  const initial = (name?.trim() || '?').slice(0, 1).toUpperCase()
  const customStyle = typeof size === 'number' ? { width: size, height: size } : undefined

  const hasValidImage = Boolean(src) && !loadError

  return (
    <div
      style={customStyle}
      onClick={onClick}
      aria-hidden={ariaHidden}
      className={`relative inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full ${
        sizeInfo?.sizeClass ?? ''
      } ${
        hasValidImage
          ? 'bg-surface-raised border border-border/80'
          : variant === 'soft'
            ? 'bg-primary/20 text-primary-ink border border-primary/25 font-bold shadow-xs'
            : 'bg-primary text-on-primary font-bold shadow-sm'
      } ${className}`}
    >
      {hasValidImage ? (
        <img
          src={src!}
          alt={alt ?? `${name ?? 'User'}'s avatar`}
          onError={() => setLoadError(true)}
          style={focalPoint ? { objectPosition: `${focalPoint.x}% ${focalPoint.y}%` } : undefined}
          className="size-full object-cover"
          loading="eager"
        />
      ) : (
        <span className={sizeInfo?.textClass ?? 'text-body font-bold'} aria-hidden="true">
          {initial}
        </span>
      )}
    </div>
  )
}
