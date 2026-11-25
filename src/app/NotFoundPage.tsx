import { Link } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-8">
      <section
        aria-labelledby="not-found-title"
        className="panel relative w-full max-w-md overflow-hidden rounded-[28px] border border-border/80 bg-surface/90 p-8 text-center shadow-card backdrop-blur-xl sm:p-10"
      >
        {/* Soft celestial ambient glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-12 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />

        <div className="relative flex flex-col items-center space-y-5">
          {/* iOS Icon badge */}
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/25 bg-primary/10 shadow-inner">
            <MoonLogo className="h-10 w-10 text-primary-ink" />
          </div>

          <div className="space-y-2">
            <span className="inline-block rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold tracking-wider text-muted uppercase">
              Error 404
            </span>
            <h1
              id="not-found-title"
              className="text-2xl font-bold tracking-[-0.03em] text-text sm:text-3xl"
            >
              Lost in Orbit
            </h1>
            <p className="text-sm leading-relaxed text-muted">
              The page you are looking for has drifted out of reach or doesn&apos;t exist yet.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-8 text-sm font-semibold text-text-inverse shadow-sm transition-all duration-200 hover:brightness-105 active:scale-[0.97]"
            >
              Return Home
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
