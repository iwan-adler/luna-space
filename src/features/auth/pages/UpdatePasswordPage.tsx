import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { requireSupabase } from '@/lib/supabase'
import { useAuth } from '../AuthProvider'
import { newPasswordSchema, type NewPasswordValues } from '../schemas'

export function UpdatePasswordPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const form = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema) })

  if (!loading && !user) return <Navigate to="/auth/reset" replace />

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null)
    const { error: err } = await requireSupabase().auth.updateUser({ password })
    if (err) {
      setError('Could not update the password. Request a new reset link and try again.')
      return
    }
    navigate('/', { replace: true })
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <h1 className="text-h1 font-semibold">Choose a new password</h1>
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        error={form.formState.errors.password?.message}
        {...form.register('password')}
      />
      <TextField
        label="Repeat new password"
        type="password"
        autoComplete="new-password"
        error={form.formState.errors.confirm?.message}
        {...form.register('confirm')}
      />
      <Button type="submit" className="w-full" loading={form.formState.isSubmitting}>
        Save password
      </Button>
    </form>
  )
}
