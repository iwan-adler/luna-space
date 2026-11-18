import { MoonLogo } from '@/components/patterns/MoonLogo'
import { Alert } from '@/components/ui/Card'
import { publicEnv } from '@/lib/env'

/** Shown for every route when VITE_SUPABASE_* are missing (fresh clone, misconfigured deploy). */
export function ConfigMissingPage() {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4">
      <div className="flex items-center gap-2 text-h2 font-bold">
        <MoonLogo className="size-8" />
        Luna Space
      </div>
      <h1 className="font-display text-h1">Backend not configured</h1>
      <Alert tone="warning" data-testid="backend-status">
        {publicEnv.ok ? 'Configured.' : publicEnv.problems.join('; ')}
      </Alert>
      <p className="text-body-sm text-muted">
        Copy <code>.env.example</code> to <code>.env.local</code> and fill in the Supabase URL and
        publishable key, or set them in the hosting provider&apos;s environment variables.
      </p>
    </main>
  )
}
