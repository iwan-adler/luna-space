import { Link } from 'react-router'

/** Placeholder for /auth/sign-in. Implemented in Phase 1 (FR-PLAT-01, Flow §5). */
export function SignInPlaceholderPage() {
  return (
    <section aria-labelledby="sign-in-title" className="max-w-md space-y-3">
      <h1 id="sign-in-title" className="text-h1 font-bold">
        Sign in
      </h1>
      <p className="text-muted">
        Email + password and magic-link sign-in will be available here in Phase 1.
      </p>
      <Link to="/" className="text-primary underline-offset-2 hover:underline">
        ← Back home
      </Link>
    </section>
  )
}
