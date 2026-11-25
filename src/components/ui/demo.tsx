import React from 'react'
import { MenuToggleIcon } from '@/components/ui/menu-toggle-icon'

export default function DemoOne() {
  const [open, setOpen] = React.useState(false)

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h2 className="text-h2 font-semibold text-text">MenuToggleIcon Demo</h2>
        <p className="mt-1 text-caption text-muted">
          Click the button below to test the morphing hamburger SVG animation
        </p>
      </div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex size-28 items-center justify-center rounded-2xl border border-border bg-surface-raised p-4 text-primary-ink shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="Toggle menu"
      >
        <MenuToggleIcon open={open} className="size-20" duration={500} />
      </button>
      <span className="text-caption text-muted">
        State:{' '}
        <strong className={open ? 'text-primary-ink' : 'text-text'}>
          {open ? 'OPEN' : 'CLOSED'}
        </strong>
      </span>
    </div>
  )
}
