import type { InputHTMLAttributes, ReactNode } from 'react'

export interface SwitchProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'onChange'
> {
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  onChange?: (checked: boolean) => void
  label?: ReactNode
  description?: ReactNode
  ariaLabel?: string
}

/**
 * Authentic Apple iOS Toggle Switch component.
 * - 51x31px track proportion, 2px inset
 * - 35x27px pill-shaped white thumb with soft layered shadow
 * - Spring-like motion (cubic-bezier(0.22, 1, 0.36, 1), 300ms) with iOS press-stretch feedback
 * - Dynamic theme accent color for ON track, iOS neutral surface for OFF track
 * - Native keyboard accessibility (role="switch"), 44px minimum tap target
 */
export function Switch({
  checked,
  onCheckedChange,
  onChange,
  label,
  description,
  disabled = false,
  className = '',
  id,
  'aria-label': ariaLabelProp,
  ariaLabel,
  ...rest
}: SwitchProps) {
  const switchId =
    id ||
    (typeof label === 'string'
      ? `switch-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
      : undefined)

  const effectiveAriaLabel =
    ariaLabelProp || ariaLabel || (typeof label === 'string' ? label : undefined)

  return (
    <label
      htmlFor={switchId}
      className={`group inline-flex min-h-[44px] cursor-pointer select-none items-center justify-between gap-3 ${
        disabled ? 'cursor-not-allowed opacity-40 pointer-events-none' : ''
      } ${className}`}
    >
      {label || description ? (
        <div className="flex-1 min-w-0 pr-2">
          {label ? (
            <span className="block text-body-sm font-medium text-text leading-snug">{label}</span>
          ) : null}
          {description ? (
            <span className="block text-caption text-text-secondary mt-0.5 leading-snug">
              {description}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="relative inline-flex items-center shrink-0">
        <input
          id={switchId}
          type="checkbox"
          role="switch"
          aria-checked={checked}
          aria-label={effectiveAriaLabel}
          checked={checked}
          disabled={disabled}
          onChange={(e) => {
            if (!disabled) {
              onCheckedChange?.(e.target.checked)
              onChange?.(e.target.checked)
            }
          }}
          className="absolute inset-0 z-10 m-0 size-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
          {...rest}
        />
        <div
          className={`relative inline-flex h-[31px] w-[51px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] focus-within:ring-2 focus-within:ring-[var(--color-primary)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--color-surface)] ${
            checked
              ? 'bg-[var(--color-primary)] border border-[var(--color-primary)]'
              : 'border border-[var(--color-border)] bg-[var(--color-surface-hover)]'
          } ${disabled ? 'transition-none' : ''}`}
          aria-hidden="true"
        >
          <span
            className={`inline-block h-[27px] rounded-full bg-white border border-black/[0.04] shadow-[0_2px_6px_rgba(0,0,0,0.25),0_0_1px_rgba(0,0,0,0.2)] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${
              checked
                ? 'w-[35px] translate-x-[12px] group-active:w-[39px] group-active:translate-x-[8px] motion-reduce:group-active:w-[35px]'
                : 'w-[35px] translate-x-0 group-active:w-[39px] motion-reduce:group-active:w-[35px]'
            }`}
          />
        </div>
      </div>
    </label>
  )
}

/** Reusable alias for Switch */
export const Toggle = Switch
