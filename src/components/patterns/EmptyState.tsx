import type { ReactNode } from 'react'

/** Moon-phase empty state (UI spec §24): illustration, title, one sentence, primary action. */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-12 text-center">
      <div
        aria-hidden
        className="size-12 rounded-full"
        style={{ background: '#14172E', boxShadow: 'inset -14px 0 0 var(--color-accent)' }}
      />
      <h2 className="text-h2 font-semibold">{title}</h2>
      {children ? <div className="text-body-sm text-muted">{children}</div> : null}
      {action}
    </div>
  )
}
