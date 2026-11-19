/** A shimmering placeholder block (decorative). */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`skeleton block ${className}`} />
}

/** Placeholder cards for a list that is loading; announced once to screen readers. */
export function SkeletonList({
  label,
  rows = 3,
  variant = 'card',
}: {
  label: string
  rows?: number
  variant?: 'card' | 'line'
}) {
  return (
    <div role="status" aria-label={label} className="space-y-2.5">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) =>
        variant === 'line' ? (
          <div key={i} className="flex items-center gap-2.5">
            <Skeleton className="size-6 rounded-full" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="h-3.5 w-12" />
          </div>
        ) : (
          <div key={i} className="panel space-y-2.5 p-4">
            <div className="flex items-center gap-3">
              <Skeleton className="size-10 rounded-[12px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
            <Skeleton className="h-3 w-4/5" />
          </div>
        ),
      )}
    </div>
  )
}
