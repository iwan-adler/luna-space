import { MessageCircle, Plus, Search, UserPlus, Users, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { SkeletonList } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { ProfileCard } from '@/features/profile'
import { formatDateTime } from '@/lib/format'
import { gradientFor } from '@/lib/visuals'
import { CLOSED_STATUSES, TYPE_HUE } from '../constants'
import { useOpportunities, useViewerTimeZone } from '../hooks'
import {
  useCloseTeamPost,
  useCreateTeamPost,
  useTeamPosts,
  useTeamPostsRealtime,
  type TeamPost,
  type TeamPostKind,
} from './hooks'

const parseSkills = (v: string) =>
  [
    ...new Set(
      v
        .split(',')
        .map((s) => s.trim().toLowerCase().slice(0, 30))
        .filter(Boolean),
    ),
  ].slice(0, 12)

function PostCard({
  post,
  showOpportunity,
  onInvite,
}: {
  post: TeamPost
  showOpportunity: boolean
  onInvite?: (name: string) => void
}) {
  const { user } = useAuth()
  const tz = useViewerTimeZone()
  const close = useCloseTeamPost()
  const mine = post.user_id === user?.id
  const name = post.author?.display_name ?? 'Someone'
  const skills = post.skills.length ? post.skills : (post.author?.skills ?? [])
  const hue = TYPE_HUE[post.opportunity?.type ?? 'other'] ?? '#bba5b5'
  return (
    <li className="panel space-y-3 p-4" data-testid="team-post">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-10 shrink-0 place-items-center rounded-full text-body-sm font-semibold text-white"
          style={{ background: gradientFor(name) }}
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body-sm">
            <ProfileCard userId={post.user_id} label={name}>
              <span className="font-semibold">{mine ? 'You' : name}</span>
            </ProfileCard>{' '}
            <span className="text-muted">
              {post.kind === 'seeking_team'
                ? 'is looking for a team'
                : `${mine ? 'need' : 'needs'} ${post.spots ?? 'more'} ${post.spots === 1 ? 'teammate' : 'teammates'}`}
            </span>
          </p>
          {showOpportunity && post.opportunity ? (
            <Link
              to={`/opportunities/${post.opportunity.id}`}
              className="mt-0.5 inline-flex items-center gap-1.5 text-caption text-muted hover:text-text"
            >
              <span className="size-1.5 rounded-full" style={{ background: hue }} aria-hidden />
              {post.opportunity.title}
            </Link>
          ) : null}
        </div>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-caption font-medium ${post.kind === 'seeking_team' ? 'bg-info/15 text-info' : 'bg-primary-subtle text-primary-ink'}`}
        >
          {post.kind === 'seeking_team' ? 'Free agent' : 'Recruiting'}
        </span>
      </div>
      {post.note ? <p className="text-body-sm whitespace-pre-line">{post.note}</p> : null}
      {skills.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {skills.map((s) => (
            <li key={s} className="rounded-full bg-hairline px-2.5 py-0.5 text-caption">
              {s}
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex items-center gap-2">
        <span className="flex-1 text-caption text-muted">
          {formatDateTime(post.created_at, tz)}
        </span>
        {mine ? (
          <Button
            size="sm"
            variant="ghost"
            icon={<X className="size-4" aria-hidden />}
            loading={close.isPending}
            onClick={() => close.mutate(post.id)}
          >
            Close
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<UserPlus className="size-4" aria-hidden />}
              onClick={() => onInvite?.(name)}
            >
              Invite
            </Button>
            <Link to="/chat">
              <Button
                size="sm"
                variant="ghost"
                icon={<MessageCircle className="size-4" aria-hidden />}
              >
                Message
              </Button>
            </Link>
          </div>
        )}
      </div>
    </li>
  )
}

function InviteDialog({
  open,
  onClose,
  targetName,
}: {
  open: boolean
  onClose: () => void
  targetName: string
}) {
  const opps = useOpportunities()
  const toast = useToast()
  const [opp, setOpp] = useState('')
  const [role, setRole] = useState('Fullstack Developer')
  const [note, setNote] = useState('')
  const options = (opps.data ?? []).filter((o) => !CLOSED_STATUSES.includes(o.status))

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault()
    toast.show(`Team invite sent to ${targetName} for ${role}!`, 'success')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (!o ? onClose() : null)}
      title={`Invite ${targetName} to Hackathon Team`}
    >
      <form onSubmit={handleSend} className="space-y-4">
        <SelectField
          label="Hackathon Opportunity"
          value={opp}
          onChange={(e) => setOpp(e.target.value)}
          options={[
            { value: '', label: 'Select a hackathon' },
            ...options.map((o) => ({ value: o.id, label: o.title })),
          ]}
        />
        <SelectField
          label="Role Slot"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          options={[
            { value: 'Frontend Developer', label: 'Frontend Developer' },
            { value: 'AI / Backend Engineer', label: 'AI / Backend Engineer' },
            { value: 'UI/UX Designer', label: 'UI/UX Designer' },
            { value: 'Product & Pitch Lead', label: 'Product & Pitch Lead' },
            { value: 'Smart Contract / Web3', label: 'Smart Contract / Web3' },
          ]}
        />
        <TextField
          label="Personal note (optional)"
          placeholder="Hey! Want to team up for this buildathon?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Send Invite</Button>
        </div>
      </form>
    </Dialog>
  )
}

/** Post "looking for a team" or "our team needs people". Mount with a key to reset. */
function PostDialog({
  open,
  onClose,
  opportunityId,
}: {
  open: boolean
  onClose: () => void
  opportunityId: string | null
}) {
  const opps = useOpportunities()
  const create = useCreateTeamPost()
  const toast = useToast()
  const [opp, setOpp] = useState(opportunityId ?? '')
  const [kind, setKind] = useState<TeamPostKind>('seeking_team')
  const [skills, setSkills] = useState('')
  const [spots, setSpots] = useState('1')
  const [note, setNote] = useState('')
  const options = (opps.data ?? []).filter((o) => !CLOSED_STATUSES.includes(o.status))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!opp) return
    create.mutate(
      {
        opportunityId: opp,
        kind,
        skills: parseSkills(skills),
        note: note.trim() || null,
        spots: kind === 'seeking_members' ? Number(spots) : null,
      },
      { onSuccess: () => (toast.show('Posted to the team finder', 'success'), onClose()) },
    )
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? null : onClose())}
      title="Post to the team finder"
    >
      <form onSubmit={submit} className="space-y-4">
        <div
          role="radiogroup"
          aria-label="What are you posting?"
          className="grid grid-cols-2 gap-2"
        >
          {(
            [
              ['seeking_team', 'I need a team', Users],
              ['seeking_members', 'We need people', UserPlus],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => setKind(k)}
              className={`flex items-center gap-2 rounded-[14px] border p-3 text-body-sm ${kind === k ? 'border-primary/60 bg-primary-subtle' : 'border-hairline'}`}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </button>
          ))}
        </div>
        {opportunityId ? null : (
          <SelectField
            label="Opportunity"
            value={opp}
            onChange={(e) => setOpp(e.target.value)}
            options={[
              { value: '', label: 'Choose an opportunity' },
              ...options.map((o) => ({ value: o.id, label: o.title })),
            ]}
          />
        )}
        <TextField
          label={kind === 'seeking_team' ? 'Your skills' : 'Skills you need'}
          hint="Separate with commas, e.g. react, design, ml"
          value={skills}
          onChange={(e) => setSkills(e.target.value)}
        />
        {kind === 'seeking_members' ? (
          <SelectField
            label="How many people"
            value={spots}
            onChange={(e) => setSpots(e.target.value)}
            options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          />
        ) : null}
        <TextField
          label="A short note"
          placeholder="Online, weekend availability, idea in mind…"
          maxLength={280}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {create.error ? <Alert tone="danger">{create.error.message}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={create.isPending} disabled={!opp}>
            Post
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** The team finder for one opportunity (on its page) or the whole workspace (/teams). */
export function TeamFinder({ opportunityId = null }: { opportunityId?: string | null }) {
  const posts = useTeamPosts(opportunityId)
  useTeamPostsRealtime()
  const [posting, setPosting] = useState(0)
  const [inviteTarget, setInviteTarget] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'seeking_team' | 'seeking_members'>('all')

  const filtered = (posts.data ?? []).filter((p) => {
    if (filter !== 'all' && p.kind !== filter) return false
    if (!query.trim()) return true
    const q = query.toLowerCase()
    const name = (p.author?.display_name ?? '').toLowerCase()
    const skills = (p.skills.length ? p.skills : (p.author?.skills ?? [])).map((s) =>
      s.toLowerCase(),
    )
    const note = (p.note ?? '').toLowerCase()
    return name.includes(q) || skills.some((s) => s.includes(q)) || note.includes(q)
  })

  return (
    <section aria-labelledby="team-finder-title" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="team-finder-title" className="text-h2 font-semibold">
          Team finder
        </h2>
        <Button
          size="sm"
          icon={<Plus className="size-4" aria-hidden />}
          onClick={() => setPosting((n) => n + 1)}
        >
          Post to finder
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-64 flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search @username, builder or skill (e.g. react, python, ai)..."
            className="w-full rounded-lg border border-border bg-surface pl-9 pr-3 py-2 text-body-sm text-text placeholder:text-muted focus:border-primary outline-none"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
          {(['all', 'seeking_team', 'seeking_members'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-md px-3 py-1 text-caption font-medium transition-colors ${
                filter === k ? 'bg-surface-raised text-primary-ink' : 'text-muted hover:text-text'
              }`}
            >
              {k === 'all' ? 'All' : k === 'seeking_team' ? 'Free agents' : 'Recruiting'}
            </button>
          ))}
        </div>
      </div>

      {posts.isPending ? (
        <SkeletonList label="Loading the team finder" rows={2} />
      ) : posts.error ? (
        <Alert tone="danger">Couldn&apos;t load the team finder.</Alert>
      ) : filtered.length === 0 ? (
        <div className="panel">
          <EmptyState title={query ? 'No matching builders' : 'No one is looking yet'}>
            {query
              ? `No builders or teams matched "${query}". Try searching another skill or @username.`
              : 'Say you need a team, or that your team needs people. Everyone in this workspace sees it.'}
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="team-posts">
          {filtered.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              showOpportunity={!opportunityId}
              onInvite={(name) => setInviteTarget(name)}
            />
          ))}
        </ul>
      )}

      {posting ? (
        <PostDialog
          key={posting}
          open
          opportunityId={opportunityId}
          onClose={() => setPosting(0)}
        />
      ) : null}

      {inviteTarget ? (
        <InviteDialog open targetName={inviteTarget} onClose={() => setInviteTarget(null)} />
      ) : null}
    </section>
  )
}

const SPOTLIGHT_BUILDERS = [
  {
    name: 'Sam',
    username: 'sam_ts',
    role: 'TypeScript & Systems',
    skills: ['TypeScript', 'Node.js', 'Research'],
    bio: 'Building fast prototypes and fullstack web apps.',
  },
  {
    name: 'Maya',
    username: 'maya_ai',
    role: 'AI & Agent Engineer',
    skills: ['Python', 'LLMs', 'Agents', 'FastAPI'],
    bio: 'Specializing in agent loops, tool calling, and rag architectures.',
  },
  {
    name: 'Elena',
    username: 'elena_design',
    role: 'Product & UI/UX',
    skills: ['Figma', 'UI Design', 'Tailwind', 'Front-end'],
    bio: 'Obsessed with high-craft interfaces, typography, and dark themes.',
  },
]

/** /teams — hackathon social discovery hub for builders and teams. */
export function TeamFinderPage() {
  const [inviteTarget, setInviteTarget] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-sans text-h1 font-semibold text-text">Hackathon Team Finder</h1>
        <p className="text-body-sm text-muted">
          Discover builders by @username, invite free agents to your hackathon, or post your
          team&apos;s open spots.
        </p>
      </div>

      {/* Main Team Finder Posts Stream */}
      <div>
        <TeamFinder />
      </div>

      {/* Featured Builders Spotlight */}
      <section
        aria-labelledby="spotlight-title"
        className="space-y-3 pt-4 border-t border-border/40"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 id="spotlight-title" className="text-h2 font-semibold">
              Available Builders
            </h2>
            <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-caption font-semibold text-primary-ink">
              Free Agents
            </span>
          </div>
          <span className="text-caption text-muted">Open to join teams</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {SPOTLIGHT_BUILDERS.map((b) => (
            <article
              key={b.username}
              className="flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-border-hover hover:bg-surface-raised"
            >
              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-raised font-bold text-text"
                    style={{ background: gradientFor(b.name) }}
                  >
                    {b.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm font-semibold text-text">{b.name}</p>
                    <p className="truncate text-caption text-primary-ink font-medium">
                      @{b.username}
                    </p>
                  </div>
                  <span className="size-2 rounded-full bg-primary" title="Looking for Team" />
                </div>

                <p className="text-caption text-muted line-clamp-2">{b.bio}</p>

                <div className="flex flex-wrap gap-1">
                  {b.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-surface-raised px-2 py-0.5 text-[11px] text-muted font-medium"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 pt-2 border-t border-border/50">
                <Button
                  size="sm"
                  variant="primary"
                  className="flex-1"
                  icon={<UserPlus className="size-3.5" aria-hidden />}
                  onClick={() => setInviteTarget(b.name)}
                >
                  Invite
                </Button>
                <Link to="/chat">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<MessageCircle className="size-3.5" aria-hidden />}
                    title={`Message ${b.name}`}
                  />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {inviteTarget ? (
        <InviteDialog open targetName={inviteTarget} onClose={() => setInviteTarget(null)} />
      ) : null}
    </div>
  )
}
