import { ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, useRef, useEffect, type ReactNode } from 'react'
import {
  wrapperVariants,
  iconVariants,
  itemVariants,
  actionIconVariants,
} from './staggered-variants'

export interface DropdownOption {
  text: string
  icon?: React.ComponentType<{ className?: string }>
  onClick: () => void
  danger?: boolean
}

export function StaggeredDropdown({
  triggerLabel,
  triggerIcon: TriggerIcon,
  options,
  align = 'left',
  customTrigger,
}: {
  triggerLabel?: string
  triggerIcon?: React.ComponentType<{ className?: string }>
  options: DropdownOption[]
  align?: 'left' | 'right' | 'center'
  customTrigger?: (open: boolean, toggle: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const alignmentClass =
    align === 'right' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0'

  return (
    <div ref={ref} className="relative inline-block text-left">
      <motion.div animate={open ? 'open' : 'closed'} className="relative">
        {customTrigger ? (
          customTrigger(open, () => setOpen((v) => !v))
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-body-sm font-medium text-text shadow-sm transition-colors hover:border-border-hover hover:bg-surface"
          >
            {TriggerIcon ? <TriggerIcon className="size-4 text-muted" /> : null}
            <span>{triggerLabel}</span>
            <motion.span variants={iconVariants} className="inline-flex">
              <ChevronDown className="size-3.5 text-muted" />
            </motion.span>
          </button>
        )}

        <motion.ul
          role="menu"
          inert={!open}
          initial="closed"
          animate={open ? 'open' : 'closed'}
          variants={wrapperVariants}
          style={{ originY: 'top', pointerEvents: open ? 'auto' : 'none' }}
          className={`absolute top-full z-50 mt-1.5 flex min-w-48 flex-col overflow-hidden rounded-2xl border border-border bg-[var(--glass-bg)] p-[6px] shadow-[var(--shadow-lg)] backdrop-blur-[20px] backdrop-saturate-[180%] ${alignmentClass}`}
        >
          {options.map((opt, i) => {
            const Icon = opt.icon
            const isDanger = Boolean(opt.danger)
            return (
              <li key={i} role="none" className="list-none">
                {isDanger && i > 0 ? (
                  <div role="separator" className="my-1.5 border-t border-border" />
                ) : null}
                <motion.button
                  type="button"
                  role="menuitem"
                  variants={itemVariants}
                  onClick={() => {
                    opt.onClick()
                    setOpen(false)
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 text-left ${
                    isDanger
                      ? 'py-2 text-[15px] font-medium text-danger transition-colors hover:bg-danger-subtle'
                      : 'py-2 text-body-sm font-medium text-text transition-colors hover:bg-surface-raised hover:text-text'
                  }`}
                >
                  {Icon ? (
                    <motion.span variants={actionIconVariants} className="inline-flex shrink-0">
                      <Icon className={isDanger ? 'size-5 text-danger' : 'size-4'} aria-hidden />
                    </motion.span>
                  ) : null}
                  <span className="truncate">{opt.text}</span>
                </motion.button>
              </li>
            )
          })}
        </motion.ul>
      </motion.div>
    </div>
  )
}
