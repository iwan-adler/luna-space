import { SkeletonList } from '@/components/ui/Skeleton'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { OpportunityTimeline } from '../components/OpportunityTimeline'
import { Plus } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { OpportunityCard } from '../components/OpportunityCard'
import {
  MODE_LABELS,
  STATUS_GROUPS,
  STATUS_LABELS,
  TYPE_LABELS,
  type OpportunityStatus,
  type OpportunityType,
  type ParticipationMode,
} from '../constants'
import { useOpportunities, useViewerTimeZone } from '../hooks'
import { nextDeadline, type Opportunity } from '../model'

type Sort = 'deadline' | 'recent' | 'name'
type Window = 'any' | '7' | '30'

/** /opportunities — list and pipeline views; all filters live in the URL (UI spec §13). */
export function OpportunityListPage() {
  const tz = useViewerTimeZone()
  const { data, isPending, error, refetch } = useOpportunities()
  const [params, setParams] = useSearchParams()
  const rawView = params.get('view')
  const view = rawView === 'pipeline' || rawView === 'timeline' ? rawView : 'list'
  const q = params.get('q') ?? ''
  const type = (params.get('type') ?? '') as OpportunityType | ''
  const status = (params.get('status') ?? 'open') as OpportunityStatus | 'open' | 'all'
  const mode = (params.get('mode') ?? '') as ParticipationMode | ''
  const windowDays = (params.get('due') ?? 'any') as Window
  const sort = (params.get('sort') ?? 'deadline') as Sort

  const set = (key: string, value: string, fallback = '') => {
    const next = new URLSearchParams(params)
    if (value === fallback) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const filtered = useMemo(() => {
    if (!data) return []
    const needle = q.trim().toLowerCase()
    const rows = data.filter((o) => {
      if (
        needle &&
        !`${o.title} ${o.organizer ?? ''} ${o.tags.join(' ')}`.toLowerCase().includes(needle)
      )
        return false
      if (type && o.type !== type) return false
      if (mode && o.mode !== mode) return false
      if (
        status === 'open' &&
        ['won', 'not_selected', 'withdrawn', 'missed', 'archived'].includes(o.status)
      )
        return false
      if (status !== 'open' && status !== 'all' && o.status !== status) return false
      if (windowDays !== 'any') {
        const d = nextDeadline(o, tz)
        if (!d || d.info.urgency === 'passed' || d.info.daysLeft > Number(windowDays)) return false
      }
      return true
    })
    const key = (o: Opportunity) => {
      const d = nextDeadline(o, tz)
      return d && d.info.urgency !== 'passed' ? d.info.daysLeft : Number.MAX_SAFE_INTEGER
    }
    return rows.sort((a, b) =>
      sort === 'name'
        ? a.title.localeCompare(b.title)
        : sort === 'recent'
          ? b.created_at.localeCompare(a.created_at)
          : key(a) - key(b) || a.title.localeCompare(b.title),
    )
  }, [data, q, type, mode, status, windowDays, sort, tz])

  return (
    <section aria-labelledby="opp-title" className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="opp-title" className="flex-1 font-sans text-h1">
          Opportunities
        </h1>
        <div role="tablist" aria-label="View" className="flex gap-1.5">
          {(['list', 'timeline', 'pipeline'] as const).map((v) => (
            <button
              key={v}
              role="tab"
              type="button"
              aria-selected={view === v}
              onClick={() => set('view', v, 'list')}
              className={`rounded-full px-4 py-1.5 text-body-sm ${view === v ? 'nav-active' : 'border border-border text-muted hover:text-text'}`}
            >
              {v === 'list' ? 'Gallery' : v === 'timeline' ? 'Timeline' : 'Pipeline'}
            </button>
          ))}
        </div>
        <Link to="/opportunities/new">
          <Button icon={<Plus className="size-4" aria-hidden />}>Add opportunity</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filters">
        <input
          type="search"
          value={q}
          onChange={(e) => set('q', e.target.value)}
          placeholder="Search name, organizer, tag"
          aria-label="Search opportunities"
          className="min-w-48 flex-1 rounded-lg border border-border bg-surface px-3.5 py-2 text-body-sm text-text placeholder:text-muted focus:border-primary outline-none"
        />
        <CustomSelect
          ariaLabel="Type"
          value={type}
          onChange={(v) => set('type', v)}
          options={[
            { value: '', label: 'All types' },
            ...Object.entries(TYPE_LABELS).map(([k, l]) => ({ value: k, label: l })),
          ]}
        />
        <CustomSelect
          ariaLabel="Status"
          value={status}
          onChange={(v) => set('status', v, 'open')}
          options={[
            { value: 'open', label: 'Open (not closed)' },
            { value: 'all', label: 'All statuses' },
            ...Object.entries(STATUS_LABELS).map(([k, l]) => ({ value: k, label: l })),
          ]}
        />
        <CustomSelect
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => set('mode', v)}
          options={[
            { value: '', label: 'Any mode' },
            ...Object.entries(MODE_LABELS)
              .filter(([k]) => k !== 'unknown')
              .map(([k, l]) => ({ value: k, label: l })),
          ]}
        />
        <CustomSelect
          ariaLabel="Deadline"
          value={windowDays}
          onChange={(v) => set('due', v, 'any')}
          options={[
            { value: 'any', label: 'Any deadline' },
            { value: '7', label: 'Due in 7 days' },
            { value: '30', label: 'Due in 30 days' },
          ]}
        />
        <CustomSelect
          ariaLabel="Sort"
          value={sort}
          onChange={(v) => set('sort', v, 'deadline')}
          options={[
            { value: 'deadline', label: 'Nearest deadline' },
            { value: 'recent', label: 'Recently added' },
            { value: 'name', label: 'Name' },
          ]}
        />
      </div>

      {isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          <SkeletonList label="Loading opportunities" rows={2} />
          <SkeletonList label="" rows={2} />
        </div>
      ) : error ? (
        <Alert tone="danger">
          Couldn&apos;t load opportunities.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Retry
          </button>
        </Alert>
      ) : data.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          action={
            <Link to="/opportunities/new">
              <Button>Add your first opportunity</Button>
            </Link>
          }
        >
          Track hackathons, internships, scholarships and more — with every deadline in one place.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No results for these filters"
          action={
            <Button
              variant="secondary"
              onClick={() => setParams(new URLSearchParams(view !== 'list' ? `view=${view}` : ''))}
            >
              Clear filters
            </Button>
          }
        />
      ) : view === 'timeline' ? (
        <OpportunityTimeline opps={filtered} viewerTz={tz} />
      ) : view === 'list' ? (
        <div className="grid gap-4 md:grid-cols-2" data-testid="opportunity-list">
          {filtered.map((o) => (
            <OpportunityCard key={o.id} opp={o} viewerTz={tz} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-4" data-testid="opportunity-pipeline">
          {STATUS_GROUPS.map((g) => {
            const items = filtered.filter((o) => g.statuses.includes(o.status))
            return (
              <section
                key={g.id}
                aria-label={g.label}
                className="rounded-[18px] border border-hairline p-2.5"
              >
                <h2 className="eyebrow mb-3 px-1.5 pt-1">
                  {g.label} <span className="text-muted">· {items.length}</span>
                </h2>
                <div className="space-y-2">
                  {items.map((o) => (
                    <OpportunityCard key={o.id} opp={o} viewerTz={tz} />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
