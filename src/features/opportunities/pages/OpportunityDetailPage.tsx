import { AlertTriangle, ExternalLink, Lock, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { DeadlineBadge } from '@/components/patterns/DeadlineBadge'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { ConvertToProjectCard } from '@/features/projects'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { formatDateOnly, formatDated, formatInstant } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import type { ProvenanceRow } from '../api'
import { StatusSelect } from '../components/StatusSelect'
import { DATE_KINDS, FIELD_LABELS, MODE_LABELS, TYPE_LABELS } from '../constants'
import {
  useOpportunity,
  useOpportunityHistory,
  useOpportunityProvenance,
  useOpportunitySources,
  useSetDeleted,
  useViewerTimeZone,
} from '../hooks'
import {
  describeMissing,
  feeLabel,
  missingCriticalFields,
  teamSizeLabel,
  type Opportunity,
} from '../model'

type Tab = 'overview' | 'dates' | 'history'

/** /opportunities/:id — Overview, Dates, Sources & history (UI spec §14). */
export function OpportunityDetailPage() {
  const { id = '' } = useParams()
  const opp = useOpportunity(id)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') ?? 'overview') as Tab
  const tz = useViewerTimeZone()
  const navigate = useNavigate()
  const toast = useToast()
  const setDeleted = useSetDeleted()
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (opp.isPending) return <PageSpinner />
  if (opp.error || !opp.data || opp.data.deleted_at) {
    return (
      <Alert tone="warning">
        This opportunity doesn&apos;t exist, was moved to the recycle bin, or is private to your
        partner.{' '}
        <Link to="/opportunities" className="underline">
          Back to opportunities
        </Link>
      </Alert>
    )
  }
  const o = opp.data
  const missing = missingCriticalFields(o)

  const del = () =>
    setDeleted.mutate(
      { id: o.id, deleted: true },
      {
        onSuccess: () => {
          setConfirmDelete(false)
          toast.show(`"${o.title}" moved to the recycle bin`, 'success')
          navigate('/opportunities', { replace: true })
        },
        onError: (e) => toast.show(e.message, 'error'),
      },
    )

  return (
    <article aria-labelledby="opp-name" className="space-y-4">
      <Link to="/opportunities" className="text-body-sm text-muted hover:underline">
        ← Opportunities
      </Link>
      <header className="flex flex-wrap items-center gap-3">
        <h1 id="opp-name" className="min-w-0 flex-1 font-display text-h1">
          {o.title}
          {o.visibility === 'private' ? (
            <Badge className="ml-2 align-middle">
              <Lock className="size-3" aria-hidden /> Private
            </Badge>
          ) : null}
        </h1>
        <Badge tone="primary">{TYPE_LABELS[o.type]}</Badge>
        <StatusSelect id={o.id} status={o.status} />
        <Link to={`/opportunities/${o.id}/edit`}>
          <Button variant="secondary" size="sm" icon={<Pencil className="size-4" aria-hidden />}>
            Edit
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Move to recycle bin"
          icon={<Trash2 className="size-4" aria-hidden />}
          onClick={() => setConfirmDelete(true)}
        />
      </header>

      {missing.length ? (
        <Alert tone="warning" data-testid="missing-info">
          <AlertTriangle className="mr-1 inline size-4" aria-hidden />
          Missing information: {describeMissing(missing)}.{' '}
          <Link to={`/opportunities/${o.id}/edit`} className="underline">
            Add details
          </Link>
        </Alert>
      ) : null}

      <div
        role="tablist"
        aria-label="Opportunity sections"
        className="flex gap-4 border-b border-border"
      >
        {(
          [
            ['overview', 'Overview'],
            ['dates', 'Dates'],
            ['history', 'Sources & history'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => {
              const next = new URLSearchParams(params)
              if (key === 'overview') next.delete('tab')
              else next.set('tab', key)
              setParams(next, { replace: true })
            }}
            className={`-mb-px border-b-2 px-1 py-2 text-body-sm font-medium ${tab === key ? 'border-primary text-primary' : 'border-transparent text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <Overview o={o} tz={tz} /> : null}
      {tab === 'dates' ? <DatesTab o={o} tz={tz} /> : null}
      {tab === 'history' ? <HistoryTab o={o} /> : null}

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Move "${o.title}" to the recycle bin?`}
        description="It disappears from lists and the calendar. You can restore it for 30 days."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" loading={setDeleted.isPending} onClick={del}>
              Move to recycle bin
            </Button>
          </>
        }
      />
    </article>
  )
}

function ProvenanceChip({ row }: { row: ProvenanceRow | undefined }) {
  if (!row) return null
  if (row.source === 'manual')
    return <Badge title="Entered or verified by a member">✎ Manual</Badge>
  const map = {
    confirmed: ['success', '✓ Confirmed'],
    inferred: ['info', '≈ Inferred'],
    missing: ['neutral', '? Missing'],
    conflicting: ['warning', '! Conflicting'],
  } as const
  const [tone, label] = map[row.status_at_acceptance ?? 'missing']
  return (
    <Badge tone={tone} title={row.evidence ?? undefined}>
      {label}
    </Badge>
  )
}

function Overview({ o, tz }: { o: Opportunity; tz: string }) {
  const provenance = useOpportunityProvenance(o.id)
  const prov = (k: string) => provenance.data?.find((p) => p.field_key === k)
  const facts: [string, string | null, string][] = [
    ['Organizer', o.organizer, 'organizer'],
    ['Mode', o.mode === 'unknown' ? null : MODE_LABELS[o.mode], 'mode'],
    ['Location', o.location, 'location'],
    ['Team size', teamSizeLabel(o.team_min, o.team_max), 'team_min'],
    ['Fee', feeLabel(o), 'fee_amount'],
    ['Eligibility', o.eligibility_text, 'eligibility_text'],
  ]
  const deadlines = o.dates.filter(
    (d) => d.kind === 'registration_deadline' || d.kind === 'submission_deadline',
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <Card>
          <h2 className="mb-3 text-h3 font-semibold">Key facts</h2>
          <dl className="space-y-2" data-testid="key-facts">
            {facts.map(([label, value, key]) => (
              <div
                key={label}
                className="grid grid-cols-[8rem_1fr_auto] items-start gap-2 text-body-sm"
              >
                <dt className="text-muted">{label}</dt>
                <dd className={value ? 'whitespace-pre-line' : 'text-muted italic'}>
                  {value ?? 'Not provided'}
                </dd>
                <dd>
                  {value ? (
                    <ProvenanceChip
                      row={
                        prov(key) ??
                        prov(
                          (
                            { fee_amount: 'is_free', team_min: 'team_max' } as Record<
                              string,
                              string
                            >
                          )[key] ?? '',
                        )
                      }
                    />
                  ) : (
                    <Badge>? Missing</Badge>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        {o.description ? (
          <Card>
            <h2 className="mb-2 text-h3 font-semibold">About</h2>
            <p className="text-body-sm whitespace-pre-line">{o.description}</p>
          </Card>
        ) : null}
        {o.prizes || o.benefits || o.tracks.length || o.required_documents.length ? (
          <Card className="space-y-3">
            {o.tracks.length ? (
              <div>
                <h3 className="text-body-sm font-semibold">Tracks</h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {o.tracks.map((t) => (
                    <Badge key={t} tone="primary">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {o.prizes ? <TextBlock title="Prizes" text={o.prizes} /> : null}
            {o.benefits ? <TextBlock title="Benefits" text={o.benefits} /> : null}
            {o.required_documents.length ? (
              <div>
                <h3 className="text-body-sm font-semibold">Required documents</h3>
                <ul className="mt-1 list-disc pl-5 text-body-sm">
                  {o.required_documents.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Card>
        ) : null}
        {o.rules_text ? (
          <Card>
            <TextBlock title="Rules and guidelines" text={o.rules_text} />
          </Card>
        ) : null}
      </div>
      <aside className="space-y-4">
        <Card>
          <h2 className="mb-2 text-h3 font-semibold">Deadlines</h2>
          {deadlines.length ? (
            <ul className="space-y-2 text-body-sm">
              {deadlines.map((d) => (
                <li key={d.kind} className="flex flex-wrap items-center justify-between gap-2">
                  <span>{FIELD_LABELS[d.kind]}</span>
                  <span className="text-right">
                    <span className="block font-medium">{formatDated(d)}</span>
                    <DeadlineBadge value={d} viewerTz={tz} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body-sm text-muted">No deadlines recorded.</p>
          )}
        </Card>
        <Card>
          <h2 className="mb-2 text-h3 font-semibold">Links</h2>
          <ul className="space-y-1 text-body-sm">
            {[
              ['Official website', o.official_url],
              ['Register', o.registration_url],
              ['Rules', o.rules_url],
            ]
              .filter(([, url]) => url)
              .map(([label, url]) => (
                <li key={label}>
                  <a
                    href={url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    {label} <ExternalLink className="size-3" aria-hidden />
                  </a>
                </li>
              ))}
            {!o.official_url && !o.registration_url && !o.rules_url ? (
              <li className="text-muted">No links yet.</li>
            ) : null}
          </ul>
        </Card>
        <ConvertToProjectCard opportunityId={o.id} />
      </aside>
    </div>
  )
}

function TextBlock({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-body-sm font-semibold">{title}</h3>
      <p className="mt-1 text-body-sm whitespace-pre-line">{text}</p>
    </div>
  )
}

function DatesTab({ o, tz }: { o: Opportunity; tz: string }) {
  return (
    <Card>
      <ul className="divide-y divide-border" data-testid="dates-list">
        {DATE_KINDS.map(({ kind, label }) => {
          const d = o.dates.find((x) => x.kind === kind)
          return (
            <li
              key={kind}
              className="flex flex-wrap items-center justify-between gap-2 py-2 text-body-sm"
            >
              <span className="font-medium">{label}</span>
              {d ? (
                <span className="flex flex-wrap items-center gap-2 text-right">
                  <span>
                    {d.all_day && d.on_date ? (
                      <>
                        {formatDateOnly(d.on_date, { weekday: true })}{' '}
                        <span className="text-muted">· all day</span>
                      </>
                    ) : (
                      <>
                        {formatDated(d)}
                        {d.at_time && d.source_timezone !== tz ? (
                          <span className="block text-caption text-muted">
                            {formatInstant(d.at_time, tz)} your time
                          </span>
                        ) : null}
                      </>
                    )}
                  </span>
                  <DeadlineBadge value={d} viewerTz={tz} />
                </span>
              ) : (
                <span className="text-muted italic">Not recorded</span>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

function renderValue(v: unknown): string {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object' && !Array.isArray(v)) {
    const d = v as {
      all_day?: boolean
      on_date?: string | null
      at_time?: string | null
      source_timezone?: string | null
    }
    if ('all_day' in d) {
      return formatDated({
        all_day: Boolean(d.all_day),
        on_date: d.on_date ?? null,
        at_time: d.at_time ?? null,
        source_timezone: d.source_timezone ?? null,
      })
    }
  }
  if (Array.isArray(v)) return v.join(', ') || '—'
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  return String(v).replace(/_/g, ' ')
}

function HistoryTab({ o }: { o: Opportunity }) {
  const ws = useCurrentWorkspace()
  const members = useMembers(ws.workspaceId)
  const sources = useOpportunitySources(o.id)
  const history = useOpportunityHistory(o.id)
  const nameOf = (uid: string | null) =>
    members.data?.find((m) => m.userId === uid)?.displayName ?? (uid ? 'Former member' : 'System')

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <h2 className="mb-2 text-h3 font-semibold">Sources</h2>
        {sources.isPending ? (
          <Spinner label="Loading sources" />
        ) : sources.data?.length ? (
          <ul className="space-y-2 text-body-sm">
            {sources.data.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {s.domain}
                </a>
                {s.is_primary ? <Badge className="ml-2">Primary</Badge> : null}
                <span className="block text-caption text-muted">
                  Added {formatDateTime(s.created_at)} ·{' '}
                  {s.last_checked_at
                    ? `last checked ${formatDateTime(s.last_checked_at)}`
                    : 'not checked automatically yet'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body-sm text-muted">
            No source link. Add the official website to keep a source.
          </p>
        )}
      </Card>
      <Card>
        <h2 className="mb-2 text-h3 font-semibold">Change history</h2>
        {history.isPending ? (
          <Spinner label="Loading history" />
        ) : history.data?.length ? (
          <ol className="space-y-3 text-body-sm" data-testid="history-list">
            {history.data.map((h) => (
              <li key={h.id} className="border-l-2 border-border pl-3">
                <span className="font-medium">{FIELD_LABELS[h.field_key] ?? h.field_key}</span>
                <span className="block">
                  {h.old_value === null ? (
                    <>set to {renderValue(h.new_value)}</>
                  ) : h.new_value === null ? (
                    <>removed (was {renderValue(h.old_value)})</>
                  ) : (
                    <>
                      {renderValue(h.old_value)} → {renderValue(h.new_value)}
                    </>
                  )}
                </span>
                <span className="block text-caption text-muted">
                  {nameOf(h.changed_by)} · {h.source} · {formatDateTime(h.changed_at)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-body-sm text-muted">No changes recorded yet.</p>
        )}
      </Card>
    </div>
  )
}
