import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { requireSupabase } from '@/lib/supabase'
import { authRedirectUrl } from '../redirect'
import { resetSchema, type ResetValues } from '../schemas'

export function ResetPasswordPage() {
  const [sent, setSent] = useState(false)
  const form = useForm<ResetValues>({ resolver: zodResolver(resetSchema) })

  const onSubmit = form.handleSubmit(async ({ email }) => {
    await requireSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl('/auth/callback?next=/auth/update-password'),
    })
    setSent(true) // identical response whether or not the account exists
  })

  return (
    <div className="space-y-4">
      <h1 className="font-sans text-h1">Reset password</h1>
      {sent ? (
        <Alert tone="success">
          If an account exists for that email, a reset link is on its way.
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
            Send reset link
          </Button>
        </form>
      )}
      <Link
        to="/auth/sign-in"
        className="block text-center text-body-sm text-primary-ink hover:underline"
      >
        Back to sign in
      </Link>
    </div>
  )
}
