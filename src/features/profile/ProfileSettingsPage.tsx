import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { readThemePreference, saveThemePreference, type ThemePreference } from '@/lib/theme'
import { timeZoneOptions } from '@/lib/timezones'
import { useMyProfile, useUpdateProfile } from './hooks'

const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(60),
  timezone: z.string().min(1),
  availability: z.enum(['available', 'busy', 'focus', 'away']),
})

const availabilityOptions = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'focus', label: 'Focusing' },
  { value: 'away', label: 'Away' },
]

export function ProfileSettingsPage() {
  const profile = useMyProfile()
  const update = useUpdateProfile()
  const toast = useToast()
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference)
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: profile.data
      ? {
          displayName: profile.data.display_name,
          timezone: profile.data.timezone,
          availability: profile.data.availability,
        }
      : undefined,
  })

  if (profile.isPending) return <PageSpinner />
  if (profile.error) return <Alert tone="danger">{profile.error.message}</Alert>

  return (
    <section aria-labelledby="profile-title" className="max-w-2xl space-y-6">
      <h1 id="profile-title" className="text-h1 font-bold">
        Profile settings
      </h1>
      <Card>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((v) =>
            update.mutate(
              { display_name: v.displayName, timezone: v.timezone, availability: v.availability },
              { onSuccess: () => toast.show('Profile saved', 'success') },
            ),
          )}
        >
          {update.error ? <Alert tone="danger">{update.error.message}</Alert> : null}
          <TextField
            label="Display name"
            error={form.formState.errors.displayName?.message}
            {...form.register('displayName')}
          />
          <SelectField
            label="Time zone"
            hint="Used for deadlines and reminders."
            options={timeZoneOptions(profile.data.timezone)}
            {...form.register('timezone')}
          />
          <SelectField
            label="Availability"
            hint="Your partner sees this next to your name."
            options={availabilityOptions}
            {...form.register('availability')}
          />
          <Button type="submit" loading={update.isPending}>
            Save profile
          </Button>
        </form>
      </Card>

      <Card>
        <fieldset>
          <legend className="mb-2 text-h3 font-semibold">Appearance</legend>
          <div className="flex flex-wrap gap-4">
            {(['system', 'light', 'dark'] as const).map((t) => (
              <label key={t} className="flex items-center gap-2 text-body-sm">
                <input
                  type="radio"
                  name="theme"
                  value={t}
                  checked={theme === t}
                  onChange={() => {
                    setTheme(t)
                    saveThemePreference(t)
                  }}
                />
                {t === 'system' ? 'Match device' : t === 'light' ? 'Light' : 'Dark'}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>
    </section>
  )
}
