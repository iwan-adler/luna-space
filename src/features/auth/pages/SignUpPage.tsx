import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { requireSupabase } from '@/lib/supabase'
import { authRedirectUrl } from '../redirect'
import { useAuth } from '../AuthProvider'
import { ResumeAfterAuth } from '../ResumeAfterAuth'
import { signUpSchema, type SignUpValues } from '../schemas'

export function SignUpPage() {
  const { user } = useAuth()
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema) })

  if (user) return <ResumeAfterAuth />

  const onSubmit = form.handleSubmit(async ({ displayName, email, password }) => {
    setError(null)
    const { error: err } = await requireSupabase().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: authRedirectUrl(), data: { display_name: displayName } },
    })
    if (err) {
      setError(
        err.code === 'weak_password'
          ? 'That password is too easy to guess. Try a longer one.'
          : err.status === 429
            ? 'Too many attempts. Please wait a few minutes.'
            : 'Could not create the account. Please try again.',
      )
      return
    }
    setSentTo(email)
  })

  if (sentTo) {
    return (
      <div className="space-y-4">
        <h1 className="font-sans text-h1">Check your email</h1>
        <p className="text-body-sm text-muted">
          We sent a confirmation link to <strong className="text-text">{sentTo}</strong>. Open it on
          this device to finish creating your account.
        </p>
        <Link to="/auth/sign-in" className="text-body-sm text-primary-ink hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h1 className="font-sans text-h1">Create your account</h1>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <TextField
        label="Your name"
        autoComplete="name"
        error={form.formState.errors.displayName?.message}
        {...form.register('displayName')}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={form.formState.errors.email?.message}
        {...form.register('email')}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters."
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
        Create account
      </Button>
      <p className="text-center text-body-sm text-muted">
        Already have an account?{' '}
        <Link to="/auth/sign-in" className="font-medium text-primary-ink hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  )
}
