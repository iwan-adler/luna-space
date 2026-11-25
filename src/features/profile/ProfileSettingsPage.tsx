import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { motion } from 'motion/react'
import { Check, Monitor, Moon, Pencil, Sun, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/features/auth'
import { Avatar } from '@/components/ui/Avatar'
import { AvatarCropModal } from '@/components/ui/AvatarCropModal'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { StaggeredDropdown } from '@/components/ui/StaggeredDropdown'
import { useToast } from '@/components/ui/Toast'
import {
  applyPalette,
  readPalette,
  readThemePreference,
  savePalette,
  saveThemePreference,
  type Palette,
  type ThemePreference,
} from '@/lib/theme'
import { deviceTimeZone, timeZoneOptions } from '@/lib/timezones'
import { AboutYouCard } from './AboutYouCard'
import { useMyProfile, useUpdateProfile } from './hooks'
import { parseGithub } from './links'

const schema = z.object({
  displayName: z.string().trim().min(1, 'Enter your name').max(60),
  handle: z
    .string()
    .trim()
    .refine(
      (v) => {
        if (!v) return true
        return parseGithub(v).ok
      },
      { message: 'Enter a GitHub username, like ana-dev' },
    )
    .optional(),
  timezone: z.string().min(1),
  availability: z.enum(['available', 'busy', 'focus', 'away']),
})

const availabilityOptions = [
  { value: 'available', label: 'Available' },
  { value: 'busy', label: 'Busy' },
  { value: 'focus', label: 'Focusing' },
  { value: 'away', label: 'Away' },
]

interface PaletteOption {
  id: Palette
  label: string
  color: string
  gradient: string
  desc: string
  onColor?: string
}

const PALETTES: PaletteOption[] = [
  {
    id: 'gold',
    label: 'Moonlight Gold',
    color: '#f0a834',
    gradient: 'radial-gradient(circle at 35% 30%, #ffd074 0%, #f0a834 65%, #c87c12 100%)',
    desc: 'Warm amber',
    onColor: '#18181b',
  },
  {
    id: 'rose-moon',
    label: 'Golden Pink',
    color: '#f472b6',
    gradient: 'radial-gradient(circle at 35% 30%, #fbcfe8 0%, #f472b6 65%, #db2777 100%)',
    desc: 'Rose Moon blush',
    onColor: '#ffffff',
  },
  {
    id: 'lunar-red',
    label: 'Lunar Red',
    color: '#f43f5e',
    gradient: 'radial-gradient(circle at 35% 30%, #fda4af 0%, #f43f5e 65%, #be123c 100%)',
    desc: 'Blood Moon red',
    onColor: '#ffffff',
  },
  {
    id: 'blue-moon',
    label: 'Blue Moon',
    color: '#0a84ff',
    gradient: 'radial-gradient(circle at 35% 30%, #70b8ff 0%, #0a84ff 65%, #0056b3 100%)',
    desc: 'Electric azure',
    onColor: '#ffffff',
  },
]

const THEME_OPTIONS = [
  { id: 'dark', label: 'Soft night', icon: Moon },
  { id: 'light', label: 'Soft day', icon: Sun },
  { id: 'system', label: 'Match device', icon: Monitor },
] as const

export function ProfileSettingsPage() {
  const { user } = useAuth()
  const profile = useMyProfile()
  const update = useUpdateProfile()
  const toast = useToast()
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference)
  const [palette, setPalette] = useState<Palette>(readPalette)
  const localTz = deviceTimeZone()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)

  const defaultDisplayName = profile.data?.display_name || user?.email?.split('@')[0] || ''

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: profile.data
      ? {
          displayName: defaultDisplayName,
          handle: profile.data.github_username ?? '',
          timezone:
            profile.data.timezone && profile.data.timezone !== 'UTC'
              ? profile.data.timezone
              : localTz,
          availability: (['available', 'busy', 'focus', 'away'].includes(profile.data.availability)
            ? profile.data.availability
            : 'available') as 'available' | 'busy' | 'focus' | 'away',
        }
      : undefined,
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setFileError(null)

    const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setFileError("That file isn't an image. Please choose a PNG, JPEG, WebP, or GIF.")
      return
    }

    const isGif = file.type === 'image/gif'
    const maxSize = isGif ? 200 * 1024 : 5 * 1024 * 1024
    if (file.size > maxSize) {
      setFileError(
        isGif
          ? 'Animated GIFs can be at most 200 KB. Try a smaller GIF or a still image.'
          : 'Image is too large, max 5MB.',
      )
      return
    }

    if (isGif) {
      // GIFs: preserve animation frames by reading original file directly without canvas redraw
      setIsUploadingPhoto(true)
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        update.mutate(
          { avatar_path: result },
          {
            onSuccess: () => {
              setIsUploadingPhoto(false)
              toast.show('Profile photo updated', 'success')
            },
            onError: (err) => {
              setIsUploadingPhoto(false)
              toast.show(err.message, 'error')
            },
          },
        )
      }
      reader.onerror = () => {
        setIsUploadingPhoto(false)
        setFileError('Failed to read GIF file.')
      }
      reader.readAsDataURL(file)
    } else {
      // Static images: open circular crop modal
      const reader = new FileReader()
      reader.onload = () => {
        setCropImageSrc(reader.result as string)
        setCropModalOpen(true)
      }
      reader.onerror = () => {
        setFileError('Failed to read image file.')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCropComplete = (croppedDataUrl: string) => {
    setCropModalOpen(false)
    setCropImageSrc(null)
    setIsUploadingPhoto(true)
    update.mutate(
      { avatar_path: croppedDataUrl },
      {
        onSuccess: () => {
          setIsUploadingPhoto(false)
          toast.show('Profile photo updated', 'success')
        },
        onError: (err) => {
          setIsUploadingPhoto(false)
          toast.show(err.message, 'error')
        },
      },
    )
  }

  const handleRemovePhoto = () => {
    setIsUploadingPhoto(true)
    update.mutate(
      { avatar_path: null },
      {
        onSuccess: () => {
          setIsUploadingPhoto(false)
          toast.show('Profile photo removed', 'success')
        },
        onError: (err) => {
          setIsUploadingPhoto(false)
          toast.show(err.message, 'error')
        },
      },
    )
  }

  if (profile.isPending) return <PageSpinner />
  if (profile.error) return <Alert tone="danger">{profile.error.message}</Alert>

  return (
    <section aria-labelledby="profile-title" className="max-w-2xl space-y-6 pb-28 sm:pb-32">
      <h1 id="profile-title" className="font-sans text-h1">
        Edit Profile
      </h1>
      <Card>
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit((v) => {
            const parsedHandle = parseGithub(v.handle ?? '')
            update.mutate(
              {
                display_name: v.displayName,
                github_username: parsedHandle.ok ? parsedHandle.value : null,
                timezone: v.timezone,
                availability: v.availability,
              },
              { onSuccess: () => toast.show('Profile updated', 'success') },
            )
          })}
        >
          {update.error ? <Alert tone="danger">{update.error.message}</Alert> : null}

          {/* Avatar Section */}
          <div className="flex flex-col items-center justify-center pb-2 pt-1 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              aria-label="Profile photo"
              className="sr-only"
              onChange={handleFileChange}
              tabIndex={-1}
            />

            <StaggeredDropdown
              align="center"
              customTrigger={(open, toggle) => (
                <div className="flex flex-col items-center">
                  <div className="relative group inline-block">
                    <button
                      type="button"
                      onClick={toggle}
                      disabled={isUploadingPhoto}
                      aria-label="Change profile photo"
                      aria-expanded={open}
                      className="relative block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-4 focus-visible:ring-offset-surface transition-transform active:scale-[0.98] cursor-pointer"
                    >
                      <Avatar
                        src={profile.data?.avatar_path}
                        name={defaultDisplayName}
                        size="2xl"
                        className="size-[116px] text-4xl shadow-md border-2 border-border/60 group-hover:border-primary/60 transition-colors"
                      />

                      {/* Subtle dim hover overlay with pencil icon */}
                      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity backdrop-blur-[2px]">
                        <Pencil className="size-6 text-white stroke-[2]" />
                      </div>

                      {/* Loading spinner overlay */}
                      {isUploadingPhoto && (
                        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                          <Spinner size={28} label="Saving photo..." />
                        </div>
                      )}
                    </button>

                    {/* Small accent-colored pencil badge at bottom-right */}
                    <button
                      type="button"
                      onClick={toggle}
                      disabled={isUploadingPhoto}
                      aria-label="Change profile photo"
                      className="absolute bottom-1 right-1 flex size-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg ring-3 ring-surface hover:scale-105 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      <Pencil className="size-4 stroke-[2.5]" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={toggle}
                    disabled={isUploadingPhoto}
                    className="mt-3.5 text-body-sm font-semibold text-primary-ink hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-2 py-0.5 cursor-pointer"
                  >
                    Change profile photo
                  </button>
                </div>
              )}
              options={[
                {
                  text: profile.data?.avatar_path ? 'Change photo' : 'Upload photo',
                  icon: Upload,
                  onClick: () => fileInputRef.current?.click(),
                },
                ...(profile.data?.avatar_path
                  ? [
                      {
                        text: 'Remove photo',
                        icon: Trash2,
                        danger: true,
                        onClick: handleRemovePhoto,
                      },
                    ]
                  : []),
              ]}
            />

            {fileError && (
              <p className="mt-2 text-caption text-danger" role="alert">
                {fileError}
              </p>
            )}
          </div>

          <TextField
            label="Display name"
            error={form.formState.errors.displayName?.message}
            {...form.register('displayName')}
          />
          <TextField
            label="GitHub username"
            placeholder="your-github-name"
            error={form.formState.errors.handle?.message}
            {...form.register('handle')}
          />
          <Controller
            control={form.control}
            name="timezone"
            render={({ field }) => (
              <SelectField
                label="Time zone"
                options={timeZoneOptions(field.value || localTz)}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
          <Controller
            control={form.control}
            name="availability"
            render={({ field }) => (
              <SelectField
                label="Availability"
                hint="Shows your status to your team."
                options={availabilityOptions}
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
              />
            )}
          />
          <Button type="submit" loading={update.isPending}>
            Save profile
          </Button>
        </form>
      </Card>

      {profile.data ? <AboutYouCard key={profile.data.id} profile={profile.data} /> : null}

      <Card className="space-y-6">
        <div>
          <h2 className="text-h3 font-semibold text-text">Appearance</h2>
          <p className="mt-1 text-body-sm text-text-secondary">
            Customize how Luna Space looks on your device
          </p>
          <div
            role="radiogroup"
            aria-label="Theme preference"
            className="relative mt-4 grid grid-cols-3 rounded-[14px] border border-border/60 bg-black/5 dark:bg-white/[0.04] p-1 backdrop-blur-md"
          >
            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => {
              const isSelected = theme === id
              return (
                <label
                  key={id}
                  className={`relative flex min-h-[44px] cursor-pointer select-none items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-body-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 focus-within:ring-offset-surface ${
                    isSelected
                      ? 'font-semibold text-text'
                      : 'font-medium text-text-secondary hover:text-text'
                  }`}
                >
                  <input
                    type="radio"
                    name="theme"
                    value={id}
                    checked={isSelected}
                    onChange={() => {
                      if (theme !== id) {
                        setTheme(id)
                        saveThemePreference(id)
                        toast.show(`Theme set to ${label}`, 'info', {
                          duration: 1800,
                          tag: 'theme',
                        })
                      }
                    }}
                    className="sr-only"
                  />
                  {isSelected && (
                    <motion.div
                      layoutId="activeThemeThumb"
                      className="absolute inset-0 rounded-[10px] border border-black/[0.08] bg-white shadow-sm dark:border-white/[0.12] dark:bg-white/[0.14] dark:shadow-[0_2px_8px_rgba(0,0,0,0.36)]"
                      transition={{
                        duration: 0.3,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    <Icon className="size-4 shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{label}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border/60 pt-6">
          <h2 className="text-h3 font-semibold text-text">Lunar Accent</h2>

          <div
            role="radiogroup"
            aria-label="Lunar Accent"
            className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {PALETTES.map((p) => {
              const isSelected = palette === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${p.label}: ${p.desc}`}
                  onClick={() => {
                    if (palette !== p.id) {
                      setPalette(p.id)
                      savePalette(p.id)
                      applyPalette(p.id)
                      toast.show(`Accent changed to ${p.label}`, 'info', {
                        duration: 1800,
                        tag: 'accent',
                      })
                    }
                  }}
                  style={{
                    borderColor: isSelected ? p.color : undefined,
                    backgroundColor: isSelected ? `${p.color}18` : undefined,
                  }}
                  className={`group relative flex min-h-[136px] w-full flex-col items-center justify-center gap-2.5 rounded-2xl border-2 p-4 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
                    isSelected
                      ? 'shadow-sm'
                      : 'border-border/60 bg-surface-raised/40 hover:-translate-y-0.5 hover:border-border hover:bg-surface-raised/70 active:scale-[0.98]'
                  }`}
                >
                  {isSelected && (
                    <motion.span
                      key={p.id}
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                      className="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full shadow-sm"
                      style={{
                        backgroundColor: p.color,
                        color: p.onColor || '#ffffff',
                      }}
                    >
                      <Check className="size-3 stroke-[2.5]" />
                    </motion.span>
                  )}

                  <div
                    className="size-10 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-105 sm:size-11"
                    style={{
                      background: p.gradient,
                      boxShadow: isSelected
                        ? `0 0 24px ${p.color}66, 0 4px 12px ${p.color}40`
                        : `0 0 16px ${p.color}33`,
                    }}
                  />

                  <div className="w-full min-w-0">
                    <span className="block text-[13px] font-semibold text-text leading-tight sm:text-body-sm">
                      {p.label}
                    </span>
                    <span className="mt-1 block text-[11px] text-text-secondary dark:text-zinc-300 leading-tight sm:text-caption line-clamp-2">
                      {p.desc}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </Card>

      <AvatarCropModal
        isOpen={cropModalOpen}
        imageSrc={cropImageSrc}
        onClose={() => {
          setCropModalOpen(false)
          setCropImageSrc(null)
        }}
        onCropComplete={handleCropComplete}
      />
    </section>
  )
}
