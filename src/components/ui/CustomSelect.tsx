import { Check, ChevronDown } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { iconVariants, wrapperVariants } from './staggered-variants'

export interface SelectOption {
  value: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
}

export interface SelectGroup {
  label: string
  options: SelectOption[]
}

/**
 * Select-only combobox (WAI-ARIA APG): the button keeps focus, arrow keys move through the
 * options, Enter or Space picks one, Escape closes. The closed list is inert, so screen readers
 * and the Tab key skip it.
 */
export function CustomSelect({
  value,
  onChange,
  options,
  groups,
  placeholder = 'Select an option',
  ariaLabel,
  id,
  ariaDescribedBy,
  invalid,
  className = '',
  buttonClassName,
  align = 'left',
  disabled = false,
}: {
  value: string
  onChange: (value: string) => void
  options?: SelectOption[]
  groups?: SelectGroup[]
  placeholder?: string
  ariaLabel?: string
  id?: string
  ariaDescribedBy?: string | undefined
  invalid?: boolean
  className?: string
  buttonClassName?: string
  align?: 'left' | 'right'
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(-1)
  const [openUpward, setOpenUpward] = useState(false)
  const [maxMenuHeight, setMaxMenuHeight] = useState(300)
  const containerRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  const allOptions: SelectOption[] = options ?? groups?.flatMap((g) => g.options) ?? []
  const selectedIndex = allOptions.findIndex((o) => o.value === value)
  const displayLabel = allOptions[selectedIndex]?.label ?? placeholder
  const optionId = (i: number) => `${listId}-o${i}`

  const openMenu = (index = selectedIndex) => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // Keep clear of the sticky top bar (64 px) and the phone tab bar (~80 px).
      const spaceBelow = window.innerHeight - rect.bottom - 96
      const spaceAbove = rect.top - 80
      const shouldOpenUp = spaceBelow < 200 && spaceAbove > spaceBelow
      setOpenUpward(shouldOpenUp)
      const available = shouldOpenUp ? spaceAbove : spaceBelow
      setMaxMenuHeight(Math.min(440, Math.max(140, Math.floor(available))))
    }
    setActive(index < 0 ? 0 : index)
    setOpen(true)
  }

  const pick = (i: number) => {
    const opt = allOptions[i]
    if (opt) onChange(opt.value)
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Keep the highlighted option in view while moving with the keyboard.
  useEffect(() => {
    if (!open || active < 0) return
    listRef.current
      ?.querySelector<HTMLElement>(`[id="${optionId(active)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active])

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = allOptions.length - 1
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        openMenu(e.key === 'ArrowUp' && selectedIndex < 0 ? last : selectedIndex)
      }
      return
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(last, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(last)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        pick(active)
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        break
      case 'Tab':
        setOpen(false)
        break
    }
  }

  const alignmentClass = align === 'right' ? 'right-0' : 'left-0'
  const positionClass = openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'

  const renderOption = (opt: SelectOption, i: number) => {
    const isSelected = opt.value === value
    const isActive = i === active
    return (
      <li
        key={opt.value}
        id={optionId(i)}
        role="option"
        data-value={opt.value}
        aria-selected={isSelected}
        onMouseDown={(e) => e.preventDefault()}
        onMouseEnter={() => setActive(i)}
        onClick={() => pick(i)}
        className={`flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-2.5 py-1.5 text-body-sm transition-colors ${
          isSelected ? 'bg-primary-subtle font-medium text-primary-ink' : 'text-text'
        } ${isActive ? 'ring-1 ring-primary/40 ring-inset' : ''} ${
          isActive && !isSelected ? 'bg-surface-raised' : ''
        }`}
      >
        <span className="truncate">{opt.label}</span>
        {isSelected ? <Check className="size-4 shrink-0 text-primary-ink" aria-hidden /> : null}
      </li>
    )
  }

  let index = 0
  return (
    <div ref={containerRef} className={`relative text-left ${open ? 'z-50' : 'z-10'} ${className}`}>
      <motion.div animate={open ? 'open' : 'closed'} className="relative w-full">
        <button
          type="button"
          id={id}
          role="combobox"
          data-value={value}
          disabled={disabled}
          onClick={() => (open ? setOpen(false) : openMenu())}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
          aria-label={ariaLabel}
          aria-describedby={ariaDescribedBy}
          aria-invalid={invalid || undefined}
          className={
            buttonClassName ??
            'flex w-full items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3.5 py-2 text-body-sm text-text transition-all outline-none hover:bg-surface-raised focus:border-primary focus:ring-2 focus:ring-primary/25 disabled:opacity-50'
          }
        >
          <span className="truncate">{displayLabel}</span>
          <motion.span variants={iconVariants} className="inline-flex shrink-0">
            <ChevronDown className="size-4 text-muted" aria-hidden />
          </motion.span>
        </button>

        <motion.div
          initial="closed"
          animate={open ? 'open' : 'closed'}
          variants={wrapperVariants}
          inert={!open}
          style={{ originY: openUpward ? 1 : 0, pointerEvents: open ? 'auto' : 'none' }}
          className={`absolute ${positionClass} z-50 w-max max-w-md min-w-full overflow-hidden rounded-2xl border border-border bg-surface/98 p-1.5 shadow-2xl backdrop-blur-2xl ${alignmentClass}`}
        >
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{ maxHeight: `${maxMenuHeight}px` }}
            className="flex flex-col gap-0.5 overflow-x-hidden overflow-y-auto overscroll-contain pr-0.5"
          >
            {groups
              ? groups.map((group) => (
                  <li key={group.label} role="presentation" className="list-none">
                    <span
                      aria-hidden
                      className="block px-2.5 py-1 text-[11px] font-semibold tracking-wider text-muted uppercase select-none"
                    >
                      {group.label}
                    </span>
                    <ul role="group" aria-label={group.label} className="flex flex-col gap-0.5">
                      {group.options.map((opt) => renderOption(opt, index++))}
                    </ul>
                  </li>
                ))
              : allOptions.map((opt, i) => renderOption(opt, i))}
          </ul>
        </motion.div>
      </motion.div>
    </div>
  )
}
