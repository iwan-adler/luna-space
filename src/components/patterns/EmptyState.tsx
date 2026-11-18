import type { ReactNode } from 'react'
import { MoonLogo } from './MoonLogo'

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
      <MoonLogo className="size-12 opacity-80" />
      <h2 className="font-display text-[28px] leading-8">{title}</h2>
      {children ? <div className="text-body-sm text-muted">{children}</div> : null}
      {action}
    </div>
  )
}
