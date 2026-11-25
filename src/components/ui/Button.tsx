import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variants: Record<Variant, string> = {
  primary:
    'border border-transparent bg-btn-primary text-on-btn-primary hover:bg-btn-primary-hover font-semibold shadow-sm active:scale-[0.97]',
  secondary:
    'border border-border/80 bg-surface-raised text-text hover:bg-surface-hover hover:border-border active:scale-[0.97] shadow-xs',
  ghost: 'text-primary-ink hover:bg-primary-subtle active:scale-[0.97]',
  danger:
    'border border-transparent bg-danger text-white hover:bg-danger/90 active:scale-[0.97] shadow-sm',
}

const sizes: Record<Size, string> = {
  sm: 'min-h-[36px] h-9 px-3.5 text-caption font-semibold rounded-full',
  md: 'min-h-[44px] h-11 px-5 text-body-sm font-semibold rounded-xl',
  lg: 'min-h-[48px] h-12 px-6 text-body font-semibold rounded-2xl',
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
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all duration-[var(--motion-fast)] ease-[var(--ease-spring)] disabled:cursor-not-allowed disabled:opacity-45 ${variants[variant]} ${sizes[size]} ${className}`}
      {...rest}
    >
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  )
}
