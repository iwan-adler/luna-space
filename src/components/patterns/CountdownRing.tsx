/**
 * A ring that drains as a deadline gets closer (decorative; the label carries the meaning).
 * `fraction` is the share of the window still left (1 = plenty of time, 0 = due now).
 */
export function CountdownRing({
  fraction,
  label,
  sub,
  tone = 'calm',
  size = 56,
}: {
  fraction: number
  label: string
  sub?: string
  tone?: 'calm' | 'soon' | 'urgent' | 'passed'
  size?: number
}) {
  const r = 22
  const c = 2 * Math.PI * r
  const f = Math.max(0, Math.min(1, fraction))
  const colour =
    tone === 'urgent'
      ? 'var(--color-danger)'
      : tone === 'soon'
        ? 'var(--color-warning)'
        : tone === 'passed'
          ? 'var(--color-neutral)'
          : 'var(--color-highlight)'
  return (
    <span
      className="relative inline-grid shrink-0 place-items-center"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 56 56" className="absolute inset-0 size-full -rotate-90" aria-hidden="true">
        <circle cx="28" cy="28" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="4" />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - f)}
          style={{
            filter: `drop-shadow(0 0 4px ${colour})`,
            transition: 'stroke-dashoffset 600ms var(--ease-standard)',
          }}
        />
      </svg>
      <span className="relative text-center leading-none">
        <span className="stat-number block text-[15px]">{label}</span>
        {sub ? (
          <span className="block text-[9px] tracking-wide text-muted uppercase">{sub}</span>
        ) : null}
      </span>
    </span>
  )
}
