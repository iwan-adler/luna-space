import { ExternalLink } from 'lucide-react'
import { gradientFor, initials } from '@/lib/visuals'
import { describeLink } from './links'

/**
 * A card for the first link in a message. Built locally from the address: nothing is fetched,
 * so sharing a link never tells the site who looked (ADR 0020).
 */
export function LinkCard({ url, mine }: { url: string; mine: boolean }) {
  const { host, path } = describeLink(url)
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 flex items-center gap-2.5 rounded-[12px] border p-2 no-underline transition-colors ${mine ? 'border-white/25 bg-white/10 hover:bg-white/15' : 'border-hairline bg-[var(--control-fill)] hover:border-border'}`}
      data-testid="link-card"
    >
      <span
        aria-hidden
        className="grid size-8 shrink-0 place-items-center rounded-[9px] text-caption font-semibold text-white"
        style={{ background: gradientFor(host) }}
      >
        {initials(host.split('.')[0] ?? host)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-caption font-semibold">{host}</span>
        {path ? (
          <span className={`block truncate text-[11px] ${mine ? 'text-white/75' : 'text-muted'}`}>
            {path}
          </span>
        ) : null}
      </span>
      <ExternalLink className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  )
}
