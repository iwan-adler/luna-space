import { Outlet } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'

export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2 text-h2 font-bold">
        <MoonLogo className="size-8" />
        Luna Space
      </div>
      <main
        id="main"
        className="w-full max-w-sm rounded-lg border border-border bg-surface p-6 shadow-2"
      >
        <Outlet />
      </main>
    </div>
  )
}
