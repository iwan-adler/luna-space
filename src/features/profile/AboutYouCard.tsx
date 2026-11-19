import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useUpdateProfile, type Profile } from './hooks'
import { parseDevpost, parseGithub, parseLinkedin, parseWebsite, type LinkResult } from './links'

/** Bio and links shown on your profile card (ADR 0021). Mount with a key per profile. */
export function AboutYouCard({ profile }: { profile: Profile }) {
  const update = useUpdateProfile()
  const toast = useToast()
  const [bio, setBio] = useState(profile.bio ?? '')
  const [github, setGithub] = useState(profile.github_username ?? '')
  const [linkedin, setLinkedin] = useState(profile.linkedin_url ?? '')
  const [website, setWebsite] = useState(profile.website_url ?? '')
  const [devpost, setDevpost] = useState(profile.devpost_username ?? '')
  const [skills, setSkills] = useState(profile.skills.join(', '))
  const [errors, setErrors] = useState<Record<string, string>>({})

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const parsed: Record<string, LinkResult> = {
      github: parseGithub(github),
      linkedin: parseLinkedin(linkedin),
      website: parseWebsite(website),
      devpost: parseDevpost(devpost),
    }
    const errs: Record<string, string> = {}
    for (const [k, r] of Object.entries(parsed)) if (!r.ok) errs[k] = r.error
    setErrors(errs)
    if (Object.keys(errs).length) return
    const val = (k: string) => (parsed[k] as { ok: true; value: string | null }).value
    update.mutate(
      {
        bio: bio.trim() || null,
        github_username: val('github'),
        linkedin_url: val('linkedin'),
        website_url: val('website'),
        devpost_username: val('devpost'),
        skills: [
          ...new Set(
            skills
              .split(',')
              .map((x) => x.trim().toLowerCase().slice(0, 30))
              .filter(Boolean),
          ),
        ].slice(0, 12),
      },
      {
        onSuccess: () => {
          if (val('github')) setGithub(val('github')!)
          if (val('linkedin')) setLinkedin(val('linkedin')!)
          if (val('website')) setWebsite(val('website')!)
          if (val('devpost')) setDevpost(val('devpost')!)
          toast.show('Profile updated', 'success')
        },
      },
    )
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="space-y-4">
        <div>
          <h2 className="text-h3 font-semibold">About you</h2>
          <p className="text-body-sm text-muted">
            People in your workspaces see this when they open your profile.
          </p>
        </div>
        <div className="space-y-1">
          <label htmlFor="bio" className="block text-body-sm font-medium text-muted">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            maxLength={280}
            rows={3}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Final-year CS student · loves robotics and hackathons"
            className="w-full resize-y rounded-[12px] border border-hairline bg-surface-raised px-3.5 py-2.5 text-body outline-none placeholder:text-muted/70 focus-visible:border-primary/60"
          />
          <p className="text-right text-caption text-muted">{bio.length}/280</p>
        </div>
        <TextField
          label="Skills"
          hint="Up to 12, separated by commas. Shown in the team finder."
          placeholder="react, ui design, ml, robotics"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="GitHub"
            placeholder="username or github.com/…"
            value={github}
            error={errors.github}
            onChange={(e) => setGithub(e.target.value)}
          />
          <TextField
            label="LinkedIn"
            placeholder="linkedin.com/in/…"
            value={linkedin}
            error={errors.linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
          />
          <TextField
            label="Website"
            placeholder="yourname.dev"
            value={website}
            error={errors.website}
            onChange={(e) => setWebsite(e.target.value)}
          />
          <TextField
            label="Devpost"
            placeholder="username or devpost.com/…"
            value={devpost}
            error={errors.devpost}
            onChange={(e) => setDevpost(e.target.value)}
          />
        </div>
        {update.error ? <Alert tone="danger">{update.error.message}</Alert> : null}
        <Button type="submit" loading={update.isPending}>
          Save about you
        </Button>
      </form>
    </Card>
  )
}
