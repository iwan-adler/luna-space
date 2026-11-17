import { Link, Outlet } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'

/** Phase 0 shell. The full sidebar / bottom-bar navigation arrives in Phase 1 (UI spec §8–11). */
export function AppShell() {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="flex h-14 items-center border-b border-border bg-surface px-4">
        <Link to="/" className="flex items-center gap-2 text-h3 font-bold text-text">
          <MoonLogo className="size-6" />
          Luna Space
        </Link>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
