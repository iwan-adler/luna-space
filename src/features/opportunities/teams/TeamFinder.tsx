import { MessageCircle, Plus, UserPlus, Users, X } from 'lucide-react'
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

function PostCard({ post, showOpportunity }: { post: TeamPost; showOpportunity: boolean }) {
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
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-caption font-medium ${post.kind === 'seeking_team' ? 'bg-info/15 text-info' : 'bg-primary-subtle text-primary'}`}
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
          <Link to="/chat">
            <Button
              size="sm"
              variant="secondary"
              icon={<MessageCircle className="size-4" aria-hidden />}
            >
              Message
            </Button>
          </Link>
        )}
      </div>
    </li>
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
  return (
    <section aria-labelledby="team-finder-title" className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 id="team-finder-title" className="flex-1 text-h2">
          Team finder
        </h2>
        <Button
          size="sm"
          icon={<Plus className="size-4" aria-hidden />}
          onClick={() => setPosting((n) => n + 1)}
        >
          Post
        </Button>
      </div>
      {posts.isPending ? (
        <SkeletonList label="Loading the team finder" rows={2} />
      ) : posts.error ? (
        <Alert tone="danger">Couldn&apos;t load the team finder.</Alert>
      ) : posts.data.length === 0 ? (
        <div className="panel">
          <EmptyState title="No one is looking yet">
            Say you need a team, or that your team needs people. Everyone in this workspace sees it.
          </EmptyState>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="team-posts">
          {posts.data.map((p) => (
            <PostCard key={p.id} post={p} showOpportunity={!opportunityId} />
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
    </section>
  )
}

/** /teams — every open team-finder post in the workspace. */
export function TeamFinderPage() {
  return (
    <div className="space-y-2">
      <h1 className="text-h1">Find your team</h1>
      <p className="text-body-sm text-muted">
        Free agents and teams that need people, for the opportunities in this workspace.
      </p>
      <div className="pt-3">
        <TeamFinder />
      </div>
    </div>
  )
}
