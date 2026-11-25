import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { peekPendingRoute } from '@/lib/pendingRoute'
import { requireSupabase } from '@/lib/supabase'
import { authRedirectUrl } from '../redirect'
import { useAuth } from '../AuthProvider'
import { ResumeAfterAuth } from '../ResumeAfterAuth'
import { magicLinkSchema, signInSchema, type MagicLinkValues, type SignInValues } from '../schemas'

type Method = 'password' | 'magic'

export function SignInPage() {
  const { user } = useAuth()
  const [method, setMethod] = useState<Method>('password')
  const [error, setError] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const inviting = peekPendingRoute()?.startsWith('/invite/')

  const passwordForm = useForm<SignInValues>({ resolver: zodResolver(signInSchema) })
  const magicForm = useForm<MagicLinkValues>({ resolver: zodResolver(magicLinkSchema) })

  if (user) return <ResumeAfterAuth />

  const onPassword = passwordForm.handleSubmit(async (values) => {
    setError(null)
    const { error: err } = await requireSupabase().auth.signInWithPassword(values)
    if (err) {
      // Never reveal whether an account exists (Flow §5).
      setError(
        err.code === 'email_not_confirmed'
          ? 'Please confirm your email first — check your inbox for the link.'
          : 'Email or password is incorrect.',
      )
      return
    }
    // Navigation happens via <ResumeAfterAuth /> once the session state updates.
  })

  const onMagic = magicForm.handleSubmit(async ({ email }) => {
    setError(null)
    const { error: err } = await requireSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: authRedirectUrl(), shouldCreateUser: false },
    })
    if (err && err.status === 429) {
      setError('Too many emails requested. Please wait a few minutes.')
      return
    }
    setMagicSent(true) // same message whether or not the account exists
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-sans text-h1">Sign in</h1>
        {inviting ? (
          <p className="mt-1 text-body-sm text-muted">
            Sign in or create an account to accept your invitation.
          </p>
        ) : null}
      </div>

      <div
        role="tablist"
        aria-label="Sign-in method"
        className="grid grid-cols-2 rounded-full border border-hairline bg-surface-raised p-1"
      >
        {(['password', 'magic'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={method === m}
            onClick={() => {
              setMethod(m)
              setError(null)
            }}
            className={`rounded-full px-3 py-1.5 text-body-sm ${method === m ? 'bg-hairline text-text' : 'text-muted hover:text-text'}`}
          >
            {m === 'password' ? 'Password' : 'Email link'}
          </button>
        ))}
      </div>

      {error ? <Alert tone="danger">{error}</Alert> : null}

      {method === 'password' ? (
        <form onSubmit={onPassword} className="space-y-4" noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={passwordForm.formState.errors.email?.message}
            {...passwordForm.register('email')}
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            error={passwordForm.formState.errors.password?.message}
            {...passwordForm.register('password')}
          />
          <Button type="submit" className="w-full" loading={passwordForm.formState.isSubmitting}>
            Sign in
          </Button>
          <p className="text-center text-body-sm">
            <Link to="/auth/reset" className="text-primary-ink hover:underline">
              Forgot password?
            </Link>
          </p>
        </form>
      ) : magicSent ? (
        <Alert tone="success">
          If an account exists for that email, a sign-in link is on its way.
        </Alert>
      ) : (
        <form onSubmit={onMagic} className="space-y-4" noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={magicForm.formState.errors.email?.message}
            {...magicForm.register('email')}
          />
          <Button type="submit" className="w-full" loading={magicForm.formState.isSubmitting}>
            Email me a sign-in link
          </Button>
        </form>
      )}

      <p className="text-center text-body-sm text-muted">
        New here?{' '}
        <Link to="/auth/sign-up" className="font-medium text-primary-ink hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  )
}
