import * as RadixDialog from '@radix-ui/react-dialog'
import { Globe, Trophy, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'
import { Skeleton } from '@/components/ui/Skeleton'
import { gradientFor } from '@/lib/visuals'
import { useProfile } from './hooks'
import { devpostUrl, githubUrl } from './links'

export function GithubMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  )
}

export function LinkedinMark({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={className} fill="currentColor" aria-hidden="true">
      <path d="M0 1.15C0 .52.52 0 1.17 0h13.66C15.48 0 16 .52 16 1.15v13.7c0 .63-.52 1.15-1.17 1.15H1.17C.52 16 0 15.48 0 14.85V1.15zm4.94 12.24V6.17H2.54v7.22h2.4zM3.74 5.18c.84 0 1.36-.55 1.36-1.25-.02-.71-.52-1.25-1.34-1.25-.82 0-1.36.54-1.36 1.25 0 .7.52 1.25 1.33 1.25h.01zm4.91 8.21V9.36c0-.22.02-.43.08-.59.17-.43.56-.87 1.22-.87.86 0 1.21.66 1.21 1.62v3.87h2.4V9.25c0-2.22-1.18-3.25-2.76-3.25-1.27 0-1.84.7-2.16 1.19v.02h-.01l.01-.02V6.17H6.25c.03.68 0 7.22 0 7.22h2.4z" />
    </svg>
  )
}

function LinkRow({
  href,
  icon,
  label,
  sub,
}: {
  href: string
  icon: ReactNode
  label: string
  sub: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="lift flex items-center gap-3 rounded-[14px] border border-hairline bg-[var(--control-fill)] px-3 py-2.5 text-body-sm hover:border-border"
    >
      <span className="icon-bubble size-8 shrink-0">{icon}</span>
      <span className="min-w-0">
        <span className="block font-medium">{label}</span>
        <span className="block truncate text-caption text-muted">{sub}</span>
      </span>
    </a>
  )
}

/**
 * Someone's profile card: bio and links (ADR 0021). Wrap any name or avatar with it; clicking
 * opens the card.
 */
export function ProfileCard({
  userId,
  children,
  label,
}: {
  userId: string
  children: ReactNode
  label: string
}) {
  return (
    <RadixDialog.Root>
      <RadixDialog.Trigger asChild>
        <button
          type="button"
          aria-label={`${label}'s profile`}
          className="text-left hover:underline"
        >
          {children}
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-[min(92vw,24rem)] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl backdrop-blur-none"
        >
          <CardBody userId={userId} />
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function CardBody({ userId }: { userId: string }) {
  const profile = useProfile(userId)
  const p = profile.data
  return (
    <>
      <div
        className="h-20"
        style={{ background: gradientFor(p?.display_name ?? userId) }}
        aria-hidden
      />
      <RadixDialog.Close className="icon-btn absolute top-3 right-3 size-8" aria-label="Close">
        <X className="size-4" aria-hidden />
      </RadixDialog.Close>
      <div className="space-y-4 px-5 pb-5">
        <div className="-mt-8 inline-block">
          <Avatar
            src={p?.avatar_path}
            name={p?.display_name}
            size="xl"
            className="ring-4 ring-surface shadow-lg"
          />
        </div>
        {profile.isPending ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        ) : !p ? (
          <p className="text-body-sm text-muted">This profile isn&apos;t available.</p>
        ) : (
          <>
            <div>
              <div className="flex items-baseline gap-2">
                <RadixDialog.Title className="text-h2 font-semibold text-text">
                  {p.display_name}
                </RadixDialog.Title>
                <span className="text-body-sm font-medium text-primary-ink">
                  @{p.github_username ?? p.display_name.toLowerCase().replace(/\s+/g, '_')}
                </span>
              </div>
              {p.bio ? (
                <p className="mt-1 text-body-sm whitespace-pre-line text-muted">{p.bio}</p>
              ) : (
                <p className="mt-1 text-body-sm text-muted/70">Builder on Luna Space.</p>
              )}
            </div>
            {p.skills?.length ? (
              <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
                {p.skills.map((s) => (
                  <li key={s} className="rounded-full bg-hairline px-2.5 py-0.5 text-caption">
                    {s}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="space-y-2" data-testid="profile-links">
              {p.github_username ? (
                <LinkRow
                  href={githubUrl(p.github_username)}
                  icon={<GithubMark />}
                  label="GitHub"
                  sub={`@${p.github_username}`}
                />
              ) : null}
              {p.linkedin_url ? (
                <LinkRow
                  href={p.linkedin_url}
                  icon={<LinkedinMark />}
                  label="LinkedIn"
                  sub={p.linkedin_url.replace(/^https:\/\/(www\.)?/, '').replace(/\/$/, '')}
                />
              ) : null}
              {p.website_url ? (
                <LinkRow
                  href={p.website_url}
                  icon={<Globe className="size-4" aria-hidden />}
                  label="Website"
                  sub={p.website_url.replace(/^https:\/\//, '')}
                />
              ) : null}
              {p.devpost_username ? (
                <LinkRow
                  href={devpostUrl(p.devpost_username)}
                  icon={<Trophy className="size-4" aria-hidden />}
                  label="Devpost"
                  sub={`devpost.com/${p.devpost_username}`}
                />
              ) : null}
            </div>
          </>
        )}
      </div>
    </>
  )
}
