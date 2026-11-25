import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-hairline text-muted',
  primary: 'bg-primary/12 text-primary-ink',
  success: 'bg-success/12 text-success',
  info: 'bg-info/12 text-info',
  warning: 'bg-warning/12 text-warning',
  danger: 'bg-danger/12 text-danger',
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-caption font-medium tracking-tight whitespace-nowrap ${tones[tone]} ${className}`}
      {...rest}
    />
  )
}
