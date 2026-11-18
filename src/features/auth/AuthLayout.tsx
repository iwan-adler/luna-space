import { Outlet } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'

/** Centered auth card on the night-sky background. */
export function AuthLayout() {
  return <AuthFrame />
}

export function AuthFrame({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-12">
      <div className="mb-10 flex flex-col items-center gap-3 text-center">
        <MoonLogo className="size-11" />
        <span className="text-[19px] font-semibold tracking-[-0.02em]">Luna Space</span>
      </div>
      <main id="main" className="panel w-full max-w-[400px] p-7 shadow-3 sm:p-8">
        {children ?? <Outlet />}
      </main>
      <p className="mt-8 text-caption text-muted/70">A quiet place for two.</p>
    </div>
  )
}
