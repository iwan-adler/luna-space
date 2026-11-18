import {
  CheckSquare,
  FileText,
  FolderKanban,
  Link2,
  MessageCircle,
  NotebookPen,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { useViewerTimeZone } from '@/features/profile'
import { formatDateTime } from '@/lib/format'
import { Highlight } from './Highlight'
import { hitHref, hitTitle, KIND_LABEL, type SearchHit, type SearchKind } from './model'

export const KIND_ICON: Record<SearchKind, LucideIcon> = {
  note: NotebookPen,
  bookmark: Link2,
  file: FileText,
  message: MessageCircle,
  opportunity: Trophy,
  task: CheckSquare,
  project: FolderKanban,
}

/** A list of search results with highlighted matches. */
export function SearchResults({ hits, onOpen }: { hits: SearchHit[]; onOpen?: () => void }) {
  const tz = useViewerTimeZone()
  return (
    <ul className="space-y-2" data-testid="search-results">
      {hits.map((h) => {
        const Icon = KIND_ICON[h.kind]
        return (
          <li key={`${h.kind}:${h.id}`}>
            <Link
              to={hitHref(h)}
              onClick={onOpen}
              className="panel flex gap-3 p-4 transition-colors hover:border-border"
            >
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-hairline">
                <Icon className="size-4 text-muted" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline gap-2">
                  <Highlight
                    text={h.title ?? hitTitle(h)}
                    className="min-w-0 flex-1 truncate font-medium"
                  />
                  <span className="shrink-0 text-caption text-muted">{KIND_LABEL[h.kind]}</span>
                </span>
                {h.snippet?.trim() ? (
                  <Highlight
                    text={h.snippet}
                    className="mt-1 line-clamp-2 block text-body-sm text-muted"
                  />
                ) : null}
                <span className="mt-1 block text-caption text-muted">
                  {formatDateTime(h.updated_at, tz)}
                </span>
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
