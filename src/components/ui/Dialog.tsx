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
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm" />
        <RadixDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-hairline bg-surface-raised p-6 shadow-3">
          <RadixDialog.Title className="text-h2 font-semibold">{title}</RadixDialog.Title>
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
