import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary: 'bg-primary text-on-primary hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-primary-subtle',
  ghost: 'text-text hover:bg-primary-subtle',
  danger: 'bg-danger text-white hover:opacity-90',
}
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-body-sm',
  md: 'h-10 px-4 text-body',
  lg: 'h-11 px-5 text-body',
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
      className={`inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-[var(--motion-fast)] disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}
