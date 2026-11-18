import { Search } from 'lucide-react'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { Alert } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { useDebounced, useSearch } from './hooks'
import { KIND_LABEL, type SearchKind } from './model'
import { SearchResults } from './SearchResults'

const FILTERS: SearchKind[] = [
  'note',
  'bookmark',
  'file',
  'message',
  'opportunity',
  'task',
  'project',
]

/** /search?q= — every module in one box (FR-PLAT-11, US-26). */
export function SearchPage() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') ?? '')
  const [kind, setKind] = useState<SearchKind | null>(null)
  const term = useDebounced(q)
  const results = useSearch(term, kind ? [kind] : undefined, 60)

  const change = (value: string) => {
    setQ(value)
    setParams(value ? { q: value } : {}, { replace: true })
  }

  return (
    <section aria-labelledby="search-title" className="space-y-5">
      <h1 id="search-title" className="text-h1">
        Search
      </h1>
      <label className="relative block">
        <span className="sr-only">Search everything</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          autoFocus
          value={q}
          onChange={(e) => change(e.target.value)}
          placeholder="Notes, links, files, messages, opportunities, tasks…"
          className="w-full rounded-full border border-border bg-surface py-3 pr-5 pl-12 text-body placeholder:text-muted/70"
        />
      </label>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show only">
        {[null, ...FILTERS].map((k) => (
          <button
            key={k ?? 'all'}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-full px-3.5 py-1 text-body-sm ${kind === k ? 'nav-active' : 'border border-border text-muted hover:text-text'}`}
          >
            {k ? `${KIND_LABEL[k]}s` : 'Everything'}
          </button>
        ))}
      </div>

      {term.trim().length < 2 ? (
        <p className="panel p-5 text-body-sm text-muted">
          Type at least two letters. Tip: press Ctrl K anywhere to search.
        </p>
      ) : results.isPending ? (
        <Spinner label="Searching" />
      ) : results.error ? (
        <Alert tone="danger">Search isn&apos;t available right now. Check your connection.</Alert>
      ) : results.data.length === 0 ? (
        <p className="panel p-5 text-body-sm text-muted">Nothing matches “{term.trim()}”.</p>
      ) : (
        <SearchResults hits={results.data} />
      )}
    </section>
  )
}
