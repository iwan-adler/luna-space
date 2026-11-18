interface MoonLogoProps {
  className?: string
}

/** Decorative logo mark; the adjacent text provides the accessible name. */
export function MoonLogo({ className }: MoonLogoProps) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="13" fill="var(--color-accent)" opacity="0.18" />
      <path
        d="M20.5 4.2A12 12 0 1 0 27.8 19.6 9.5 9.5 0 1 1 20.5 4.2Z"
        fill="var(--color-accent)"
      />
    </svg>
  )
}
