import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { DateTimeInput, type DateTimeValue } from '@/components/patterns/DateTimeInput'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { SelectField } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'
import { inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { formatDated, type DatedValue } from '@/lib/dates'
import { formatDateTime } from '@/lib/format'
import { useQueryClient } from '@tanstack/react-query'
import { FIELD_LABELS, MODE_LABELS, TYPE_LABELS, type OpportunityType } from '../constants'
import {
  acceptExtraction,
  DATE_FIELDS,
  EXTRACT_MESSAGES,
  getRun,
  isEmptyEditorValue,
  sameEditorValue,
  toEditorValue,
  type EditorValue,
  type FieldRow,
} from '../extraction'
import { emptyForm, opportunityFormSchema, toSavePayload } from '../form'
import { oppKeys, useViewerTimeZone } from '../hooks'

const ORDER = [
  'title',
  'organizer',
  'official_url',
  'registration_url',
  'registration_deadline',
  'submission_deadline',
  'event_start',
  'event_end',
  'mode',
  'location',
  'team_min',
  'team_max',
  'fee',
  'eligibility_text',
  'prizes',
  'tracks',
  'required_documents',
  'rules_url',
  'description',
] as const
type Key = (typeof ORDER)[number]

const LABELS: Record<Key, string> = {
  ...(FIELD_LABELS as Record<Key, string>),
  fee: 'Registration fee',
  tracks: 'Tracks (comma-separated)',
  required_documents: 'Required documents (comma-separated)',
}
const LONG = new Set<Key>(['eligibility_text', 'prizes', 'description'])

interface FieldState {
  choice: number | 'other' | null
  value: EditorValue
  checked: boolean
}

type Status = 'confirmed' | 'inferred' | 'missing' | 'conflicting'
const STATUS_CHIP: Record<
  Status,
  { tone: 'success' | 'info' | 'neutral' | 'warning'; label: string }
> = {
  confirmed: { tone: 'success', label: '✓ Confirmed' },
  inferred: { tone: 'info', label: '≈ Inferred' },
  missing: { tone: 'neutral', label: '? Missing' },
  conflicting: { tone: 'warning', label: '! Conflicting' },
}

function previewValue(key: Key, value: unknown): string {
  if (value === null || value === undefined) return '—'
  if ((DATE_FIELDS as readonly string[]).includes(key)) return formatDated(value as DatedValue)
  if (key === 'fee') {
    const f = value as { is_free: boolean; amount: number | null; currency: string | null }
    return f.is_free ? 'Free' : `${f.currency ?? ''} ${f.amount ?? '?'}`.trim()
  }
  if (Array.isArray(value)) return value.join(', ')
  return String(value)
}

/** /opportunities/review/:runId — review extracted values before saving (UI spec §15, FR-OPP-08). */
export function ReviewExtractionPage() {
  const { runId = '' } = useParams()
  const tz = useViewerTimeZone()
  const q = useQuery({
    queryKey: ['opp', 'run', runId],
    queryFn: () => getRun(runId),
    staleTime: Infinity,
  })

  if (q.isPending) return <PageSpinner label="Loading extracted details" />
  if (q.error || !q.data)
    return <Alert tone="danger">This extraction was not found or has expired.</Alert>
  const { run, fields } = q.data
  if (run.opportunity_id) return <Navigate to={`/opportunities/${run.opportunity_id}`} replace />
  if (run.status !== 'succeeded') {
    const p = new URLSearchParams({
      url: run.source_url,
      reason: EXTRACT_MESSAGES[run.error_code ?? ''] ?? EXTRACT_MESSAGES.SERVER_ERROR!,
    })
    return <Navigate to={`/opportunities/new/manual?${p}`} replace />
  }
  return <Review runId={runId} run={q.data.run} fields={fields} tz={tz} />
}

function Review({
  runId,
  run,
  fields,
  tz,
}: {
  runId: string
  run: NonNullable<Awaited<ReturnType<typeof getRun>>>['run']
  fields: FieldRow[]
  tz: string
}) {
  const navigate = useNavigate()
  const toast = useToast()
  const qc = useQueryClient()
  const byKey = useMemo(() => {
    const m = new Map<Key, FieldRow[]>()
    for (const f of fields) {
      const k = f.field_key as Key
      m.set(k, [...(m.get(k) ?? []), f])
    }
    return m
  }, [fields])
  const statusOf = (k: Key): Status => (byKey.get(k)?.[0]?.status ?? 'missing') as Status

  const [state, setState] = useState<Record<Key, FieldState>>(() => {
    const s = {} as Record<Key, FieldState>
    for (const k of ORDER) {
      const rows = byKey.get(k) ?? []
      const status = (rows[0]?.status ?? 'missing') as Status
      const first = rows[0]
      s[k] =
        status === 'conflicting'
          ? { choice: null, value: toEditorValue(k, null, tz), checked: true }
          : status === 'missing' || !first
            ? { choice: 'other', value: toEditorValue(k, null, tz), checked: true }
            : {
                choice: first.candidate_no,
                value: toEditorValue(k, first.value, tz),
                checked: status === 'confirmed',
              }
    }
    return s
  })
  const [type, setType] = useState<OpportunityType>('hackathon')
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const candidateValue = (k: Key, no: number) =>
    toEditorValue(k, byKey.get(k)?.find((f) => f.candidate_no === no)?.value ?? null, tz)
  const isEdited = (k: Key) => {
    const s = state[k]
    return typeof s.choice !== 'number' || !sameEditorValue(s.value, candidateValue(k, s.choice))
  }
  const set = (k: Key, patch: Partial<FieldState>) =>
    setState((prev) => ({ ...prev, [k]: { ...prev[k], ...patch } }))

  const counts = ORDER.reduce(
    (acc, k) => ({ ...acc, [statusOf(k)]: (acc[statusOf(k)] ?? 0) + 1 }),
    {} as Partial<Record<Status, number>>,
  )
  const unresolved = ORDER.filter((k) => statusOf(k) === 'conflicting' && state[k].choice === null)
  const unchecked = ORDER.filter(
    (k) =>
      statusOf(k) === 'inferred' &&
      !state[k].checked &&
      !isEdited(k) &&
      !isEmptyEditorValue(state[k].value),
  )
  const blocked = unresolved.length + unchecked.length

  const save = async () => {
    setError(null)
    const v = emptyForm(tz)
    v.type = type
    v.visibility = visibility
    const text = (k: Key) => (state[k].value as string) ?? ''
    v.title = text('title')
    v.organizer = text('organizer')
    v.officialUrl = text('official_url')
    v.registrationUrl = text('registration_url')
    v.rulesUrl = text('rules_url')
    v.location = text('location')
    v.eligibilityText = text('eligibility_text')
    v.prizes = text('prizes')
    v.description = text('description')
    v.tracks = text('tracks')
    v.requiredDocuments = text('required_documents')
    v.teamMin = text('team_min')
    v.teamMax = text('team_max')
    v.mode = (text('mode') || 'unknown') as typeof v.mode
    const fee = state.fee.value as {
      fee: 'unknown' | 'free' | 'paid'
      amount: string
      currency: string
    }
    v.fee = fee.fee
    v.feeAmount = fee.amount
    v.feeCurrency = fee.currency || 'INR'
    for (const k of DATE_FIELDS) v.dates[k] = state[k].value as DateTimeValue
    const parsed = opportunityFormSchema.safeParse(v)
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      setError(`${issue?.path.join(' ') ?? 'A field'}: ${issue?.message ?? 'is not valid'}`)
      return
    }
    const accepted = ORDER.filter(
      (k) =>
        statusOf(k) !== 'missing' &&
        typeof state[k].choice === 'number' &&
        !isEdited(k) &&
        !isEmptyEditorValue(state[k].value),
    ).map((k) => ({ field_key: k, candidate_no: state[k].choice as number }))
    setSaving(true)
    try {
      const id = await acceptExtraction(runId, toSavePayload(parsed.data), accepted)
      await qc.invalidateQueries({ queryKey: oppKeys.all })
      toast.show('Opportunity saved', 'success')
      navigate(`/opportunities/${id}`, { replace: true })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section aria-labelledby="review-title" className="max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="review-title" className="flex-1 font-display text-h1">
          Review extracted details
        </h1>
        {(['confirmed', 'inferred', 'missing', 'conflicting'] as const).map((s) =>
          counts[s] ? (
            <Badge key={s} tone={STATUS_CHIP[s].tone}>
              {counts[s]} {s}
            </Badge>
          ) : null,
        )}
      </div>
      <p className="text-body-sm text-muted break-all">
        {run.final_url ?? run.source_url} · fetched{' '}
        {run.finished_at ? formatDateTime(run.finished_at) : ''}
      </p>
      <Alert tone="warning">
        Nothing is saved until you choose <strong>Save opportunity</strong>. Values come only from
        the page; missing values stay empty.
      </Alert>
      {run.thin ? (
        <Alert tone="info" data-testid="thin-warning">
          Little information was found — this page probably loads its content with JavaScript. Fill
          in what you know, or{' '}
          <Link
            className="underline"
            to={`/opportunities/new/manual?url=${encodeURIComponent(run.source_url)}`}
          >
            enter everything manually
          </Link>
          .
        </Alert>
      ) : null}

      <Card className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as OpportunityType)}
          options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
        />
        <SelectField
          label="Visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value as 'shared' | 'private')}
          options={[
            { value: 'shared', label: 'Shared with my partner' },
            { value: 'private', label: 'Private (only me)' },
          ]}
        />
      </Card>

      <ol className="space-y-3" data-testid="review-fields">
        {ORDER.map((k) => {
          const rows = byKey.get(k) ?? []
          const status = statusOf(k)
          const s = state[k]
          const chosen = rows.find((r) => r.candidate_no === s.choice)
          return (
            <li
              key={k}
              data-field={k}
              className={`panel p-5 ${status === 'conflicting' && s.choice === null ? 'border-warning/50' : ''}`}
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="font-medium">{LABELS[k]}</span>
                <Badge tone={STATUS_CHIP[status].tone}>{STATUS_CHIP[status].label}</Badge>
                {status !== 'missing' && isEdited(k) && s.choice !== null ? (
                  <Badge>✎ Edited by you</Badge>
                ) : null}
              </div>

              {status === 'conflicting' ? (
                <fieldset className="mb-2 space-y-1">
                  <legend className="sr-only">Choose a value for {LABELS[k]}</legend>
                  {rows.map((r) => (
                    <label key={r.candidate_no} className="flex items-start gap-2 text-body-sm">
                      <input
                        type="radio"
                        name={`choice-${k}`}
                        checked={s.choice === r.candidate_no}
                        onChange={() =>
                          set(k, { choice: r.candidate_no, value: toEditorValue(k, r.value, tz) })
                        }
                      />
                      <span>
                        <strong>{previewValue(k, r.value)}</strong>
                        <span className="block text-caption text-muted">“{r.evidence}”</span>
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-body-sm">
                    <input
                      type="radio"
                      name={`choice-${k}`}
                      checked={s.choice === 'other'}
                      onChange={() =>
                        set(k, { choice: 'other', value: toEditorValue(k, null, tz) })
                      }
                    />
                    Enter another value or leave empty
                  </label>
                </fieldset>
              ) : null}

              {status !== 'conflicting' || s.choice !== null ? (
                <FieldEditor k={k} value={s.value} onChange={(value) => set(k, { value })} />
              ) : null}

              {status !== 'conflicting' && chosen?.evidence ? (
                <p className="mt-2 text-caption text-muted">
                  From the page: “{chosen.evidence}”
                  {chosen.reason ? (
                    <span className="block text-info">Why inferred: {chosen.reason}</span>
                  ) : null}
                </p>
              ) : null}
              {status === 'inferred' && !isEdited(k) && !isEmptyEditorValue(s.value) ? (
                <label className="mt-2 flex items-center gap-2 text-body-sm">
                  <input
                    type="checkbox"
                    checked={s.checked}
                    onChange={(e) => set(k, { checked: e.target.checked })}
                  />
                  I checked this
                </label>
              ) : null}
            </li>
          )
        })}
      </ol>

      {error ? <Alert tone="danger">{error}</Alert> : null}
      <div className="sticky bottom-24 flex flex-wrap items-center gap-2 rounded-full border border-hairline bg-surface-raised/90 py-2 pr-2 pl-5 shadow-3 backdrop-blur-xl lg:bottom-6">
        <span className="flex-1 text-body-sm text-muted" role="status">
          {blocked
            ? `${unresolved.length ? `${unresolved.length} conflict${unresolved.length > 1 ? 's' : ''} to resolve` : ''}${
                unresolved.length && unchecked.length ? ' · ' : ''
              }${unchecked.length ? `${unchecked.length} inferred value${unchecked.length > 1 ? 's' : ''} to check` : ''}`
            : 'Ready to save'}
        </span>
        <Link to="/opportunities">
          <Button variant="secondary">Discard</Button>
        </Link>
        <Button onClick={save} disabled={blocked > 0} loading={saving}>
          Save opportunity
        </Button>
      </div>
    </section>
  )
}

const input = inputClass

function FieldEditor({
  k,
  value,
  onChange,
}: {
  k: Key
  value: EditorValue
  onChange: (v: EditorValue) => void
}) {
  if ((DATE_FIELDS as readonly string[]).includes(k)) {
    return <DateTimeInput label={LABELS[k]} value={value as DateTimeValue} onChange={onChange} />
  }
  if (k === 'mode') {
    return (
      <select
        aria-label={LABELS[k]}
        className={input}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Not known</option>
        {(['online', 'offline', 'hybrid'] as const).map((m) => (
          <option key={m} value={m}>
            {MODE_LABELS[m]}
          </option>
        ))}
      </select>
    )
  }
  if (k === 'fee') {
    const f = value as { fee: 'unknown' | 'free' | 'paid'; amount: string; currency: string }
    return (
      <div className="flex flex-wrap gap-2">
        <select
          aria-label="Registration fee"
          className={`${input} w-40`}
          value={f.fee}
          onChange={(e) => onChange({ ...f, fee: e.target.value as typeof f.fee })}
        >
          <option value="unknown">Not known</option>
          <option value="free">Free</option>
          <option value="paid">Paid</option>
        </select>
        {f.fee === 'paid' ? (
          <>
            <input
              aria-label="Fee amount"
              className={`${input} w-32`}
              inputMode="decimal"
              value={f.amount}
              onChange={(e) => onChange({ ...f, amount: e.target.value })}
            />
            <input
              aria-label="Fee currency"
              className={`${input} w-20`}
              value={f.currency}
              onChange={(e) => onChange({ ...f, currency: e.target.value })}
            />
          </>
        ) : null}
      </div>
    )
  }
  if (LONG.has(k)) {
    return (
      <textarea
        aria-label={LABELS[k]}
        rows={3}
        className={input}
        value={value as string}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }
  return (
    <input
      aria-label={LABELS[k]}
      className={input}
      inputMode={k === 'team_min' || k === 'team_max' ? 'numeric' : undefined}
      value={value as string}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}
