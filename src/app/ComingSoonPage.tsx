import { useLocation } from 'react-router'
import { primaryNav } from './navigation'

/** Placeholder for modules that later phases deliver; keeps navigation complete from Phase 1. */
export function ComingSoonPage() {
  const { pathname } = useLocation()
  const item = primaryNav.find((i) => i.to !== '/' && pathname.startsWith(i.to))
  return (
    <section aria-labelledby="soon-title" className="mx-auto max-w-md py-16 text-center">
      <div
        aria-hidden
        className="mx-auto mb-4 size-12 rounded-full"
        style={{ background: '#14172E', boxShadow: 'inset -14px 0 0 var(--color-accent)' }}
      />
      <h1 id="soon-title" className="text-h1 font-bold">
        {item?.label ?? 'Coming soon'}
      </h1>
      <p className="mt-2 text-muted">
        This module arrives in {item?.phase ?? 'a later phase'} of the build plan.
      </p>
    </section>
  )
}
