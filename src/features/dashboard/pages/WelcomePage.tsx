import { Link } from 'react-router'
import { publicEnv } from '@/lib/env'

/** Phase 0 landing page. Replaced by the real dashboard (FR-DASH-01…06) in Phase 8. */
export function WelcomePage() {
  return (
    <section aria-labelledby="welcome-title" className="space-y-6">
      <div className="space-y-2">
        <p className="text-caption font-semibold tracking-widest text-primary uppercase">
          Walking skeleton · Phase 0
        </p>
        <h1 id="welcome-title" className="text-display font-bold">
          Welcome to Luna Space
        </h1>
        <p className="max-w-prose text-muted">
          A private workspace for two collaborators: opportunities, projects, deadlines, chat and
          knowledge in one place. This page confirms the app builds, deploys and can reach its
          configuration.
        </p>
      </div>

      <div className="rounded-md border border-border bg-surface p-4 shadow-1">
        <h2 className="mb-3 text-h3 font-semibold">System status</h2>
        <dl className="grid gap-3 text-body-sm sm:grid-cols-[12rem_1fr]">
          <dt className="font-medium">Backend configuration</dt>
          <dd data-testid="backend-status">
            {publicEnv.ok ? (
              <span className="text-success">
                ✓ Configured — {new URL(publicEnv.env.supabaseUrl).host}
              </span>
            ) : (
              <span className="text-warning">
                ! Not configured: {publicEnv.problems.join('; ')}. Copy <code>.env.example</code> to{' '}
                <code>.env.local</code>.
              </span>
            )}
          </dd>
          <dt className="font-medium">Sign-in</dt>
          <dd>
            <Link to="/auth/sign-in" className="text-primary underline-offset-2 hover:underline">
              Placeholder
            </Link>{' '}
            — real authentication arrives in Phase 1.
          </dd>
        </dl>
      </div>
    </section>
  )
}
