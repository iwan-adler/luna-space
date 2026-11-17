import type { HTMLAttributes } from 'react'

type Tone = 'neutral' | 'primary' | 'success' | 'info' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-bg text-muted border border-border',
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success/15 text-success',
  info: 'bg-info/15 text-info',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-danger/15 text-danger',
}

export function Badge({
  tone = 'neutral',
  className = '',
  ...rest
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption font-medium whitespace-nowrap ${tones[tone]} ${className}`}
      {...rest}
    />
  )
}
