import type { HTMLAttributes } from 'react'

/** Rounded panel with a soft sheen (Soft night). */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`panel p-5 ${className}`} {...rest} />
}

const toneDot = {
  info: 'bg-info',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
}

export function Alert({
  tone = 'info',
  className = '',
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & { tone?: 'info' | 'success' | 'warning' | 'danger' }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-[14px] border border-hairline bg-surface-raised/80 px-4 py-3 text-body-sm text-text ${className}`}
      {...rest}
    >
      <span aria-hidden className={`mt-1.5 size-1.5 shrink-0 rounded-full ${toneDot[tone]}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
