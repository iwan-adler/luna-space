import type { HTMLAttributes } from 'react'

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-md border border-border bg-surface p-4 shadow-1 ${className}`}
      {...rest}
    />
  )
}

export function Alert({
  tone = 'info',
  className = '',
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  const tones = {
    info: 'border-info/40 text-text',
    success: 'border-success/40 text-text',
    warning: 'border-warning/40 text-text',
    danger: 'border-danger/40 text-text',
  }
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-md border-l-4 border bg-surface px-3 py-2 text-body-sm ${tones[tone]} ${className}`}
      {...rest}
    />
  )
}
