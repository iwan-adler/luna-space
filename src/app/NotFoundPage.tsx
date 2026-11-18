import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section aria-labelledby="not-found-title" className="space-y-3">
      <h1 id="not-found-title" className="text-h1 font-semibold">
        Page not found
      </h1>
      <p className="text-muted">This page doesn&apos;t exist (yet).</p>
      <Link to="/" className="text-primary underline-offset-2 hover:underline">
        Go to home
      </Link>
    </section>
  )
}
