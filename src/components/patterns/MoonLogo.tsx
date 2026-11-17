interface MoonLogoProps {
  className?: string
}

/** Decorative logo mark; the adjacent text provides the accessible name. */
export function MoonLogo({ className }: MoonLogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" fill="#14172E" />
      <path d="M16 2a14 14 0 0 1 0 28a9 14 0 0 0 0-28z" fill="var(--color-accent)" />
    </svg>
  )
}
