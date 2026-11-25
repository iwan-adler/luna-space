import * as RadixDialog from '@radix-ui/react-dialog'
import type { ReactNode } from 'react'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
}

/** Accessible modal (focus trap, Esc, focus return) built on Radix (TRD §3). */
export function Dialog({ open, onOpenChange, title, description, children, footer }: DialogProps) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity" />
        <RadixDialog.Content className="fixed bottom-0 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 max-h-[90dvh] overflow-y-auto rounded-t-[24px] border border-border bg-[var(--color-surface)] sm:bg-[var(--glass-bg)] p-6 shadow-2xl backdrop-blur-[20px] backdrop-saturate-[180%] sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:w-[min(92vw,30rem)] sm:rounded-[24px] transition-all">
          <div
            className="mx-auto -mt-2 mb-4 h-1.5 w-12 rounded-full bg-muted/30 sm:hidden"
            aria-hidden
          />
          <RadixDialog.Title className="text-h2 font-semibold text-text">{title}</RadixDialog.Title>
          {description ? (
            <RadixDialog.Description className="mt-1 text-body-sm text-muted">
              {description}
            </RadixDialog.Description>
          ) : (
            <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
          )}
          {children ? <div className="mt-4">{children}</div> : null}
          {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}
