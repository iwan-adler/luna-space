import { useLocation } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { primaryNav } from './navigation'

/** Placeholder for modules that later phases deliver; keeps navigation complete from Phase 1. */
export function ComingSoonPage() {
  const { pathname } = useLocation()
  const item = primaryNav.find((i) => i.to !== '/' && pathname.startsWith(i.to))
  return (
    <section aria-labelledby="soon-title" className="mx-auto max-w-md py-16 text-center">
      <MoonLogo className="mx-auto mb-5 size-12 opacity-80" />
      <h1 id="soon-title" className="font-display text-h1">
        {item?.label ?? 'Coming soon'}
      </h1>
      <p className="mt-2 text-muted">
        This module arrives in {item?.phase ?? 'a later phase'} of the build plan.
      </p>
    </section>
  )
}
