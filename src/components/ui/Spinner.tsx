export function Spinner({ className = 'size-5', label }: { className?: string; label?: string }) {
  return (
    <span role={label ? 'status' : undefined} className="inline-flex items-center gap-2">
      <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.25"
          strokeWidth="4"
        />
        <path
          d="M22 12a10 10 0 0 0-10-10"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  )
}

export function PageSpinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-muted">
      <Spinner className="size-6" label={label} />
    </div>
  )
}
