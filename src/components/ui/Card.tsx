import type { HTMLAttributes } from 'react'

/** Quiet, bordered surface for related content. */
export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`panel rounded-2xl sm:rounded-[20px] p-5 sm:p-6 ${className}`} {...rest} />
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
      className={`flex items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3 text-body-sm text-text ${className}`}
      {...rest}
    >
      <span aria-hidden className={`mt-1.5 size-1.5 shrink-0 rounded-full ${toneDot[tone]}`} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}
