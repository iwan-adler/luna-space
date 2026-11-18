import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'btn-primary',
  secondary:
    'border border-hairline bg-surface text-text backdrop-blur-md hover:border-border hover:bg-surface-raised',
  ghost: 'text-muted hover:bg-hairline hover:text-text',
  danger: 'bg-danger/90 text-bg hover:bg-danger',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-body-sm',
  md: 'h-10 px-5 text-body-sm',
  lg: 'h-12 px-6 text-body',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-[-0.005em] transition-all duration-[var(--motion-base)] ease-[var(--ease-standard)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}
