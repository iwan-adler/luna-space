import { Calendar, ExternalLink, Sparkles, Trophy } from 'lucide-react'

interface HackathonNewsItem {
  id: string
  title: string
  organizer: string
  prizePool: string
  dates: string
  tags: string[]
  url: string
  highlight?: boolean
}

const CURATED_HACKATHONS: HackathonNewsItem[] = [
  {
    id: 'ethglobal-cannes',
    title: 'ETHGlobal Cannes 2026',
    organizer: 'ETHGlobal',
    prizePool: '$125,000',
    dates: 'Jul 10 – Jul 12, 2026',
    tags: ['Web3', 'Autonomous Agents', 'Smart Contracts'],
    url: 'https://ethglobal.com',
    highlight: true,
  },
  {
    id: 'google-deepmind-agents',
    title: 'Global Autonomous Agents Hackathon',
    organizer: 'Google DeepMind & Devpost',
    prizePool: '$75,000',
    dates: 'Jun 1 – Jun 21, 2026',
    tags: ['AI Agents', 'Tool Calling', 'Open Source'],
    url: 'https://devpost.com',
    highlight: true,
  },
  {
    id: 'solana-renaissance',
    title: 'Solana Renaissance Buildathon',
    organizer: 'Solana Foundation',
    prizePool: '$1,000,000',
    dates: 'May 15 – Jun 05, 2026',
    tags: ['DePIN', 'High-Speed Infra', 'Payments'],
    url: 'https://solana.com',
  },
  {
    id: 'mlh-global-week',
    title: 'MLH Global Hack Week: Summer Sprint',
    organizer: 'Major League Hacking',
    prizePool: 'Swag & Grants',
    dates: 'Jun 25 – Jul 02, 2026',
    tags: ['Beginner Friendly', 'Fullstack', 'Hardware'],
    url: 'https://mlh.io',
  },
]

/**
 * Hackathon Radar: Curated news & upcoming hackathons stream from the web.
 * Fulfills the "Instagram for Hackathons" discovery feed requirement.
 */
export function HackathonRadar() {
  return (
    <section aria-labelledby="radar-title" className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary-ink" aria-hidden />
          <h2 id="radar-title" className="text-h2 font-semibold">
            Hackathon Radar
          </h2>
        </div>
        <a
          href="https://devpost.com/hackathons"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-body-sm text-muted transition-colors hover:text-text"
        >
          More on the web <ExternalLink className="size-3.5" aria-hidden />
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {CURATED_HACKATHONS.map((h) => (
          <article
            key={h.id}
            className={`group relative flex flex-col justify-between overflow-hidden rounded-xl border p-4 transition-all ${
              h.highlight
                ? 'border-cyan-500/30 bg-surface shadow-sm hover:border-cyan-500/50 hover:bg-surface-raised'
                : 'border-border bg-surface hover:border-border-hover hover:bg-surface-raised'
            }`}
          >
            {h.highlight ? (
              <div
                aria-hidden
                className="vibrant-container pointer-events-none absolute inset-0 opacity-[0.12] transition-opacity group-hover:opacity-[0.22]"
              />
            ) : null}
            <div className="relative z-10 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-caption font-semibold tracking-wider text-muted uppercase">
                  {h.organizer}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-surface-raised px-2 py-0.5 text-caption font-semibold text-primary-ink">
                  <Trophy className="size-3" aria-hidden />
                  {h.prizePool}
                </span>
              </div>

              <h3 className="text-body font-semibold text-text group-hover:text-primary-ink transition-colors">
                <a
                  href={h.url}
                  target="_blank"
                  rel="noreferrer"
                  className="after:absolute after:inset-0"
                >
                  {h.title}
                </a>
              </h3>

              <div className="flex items-center gap-1.5 text-caption text-muted">
                <Calendar className="size-3.5 shrink-0" aria-hidden />
                <span>{h.dates}</span>
              </div>
            </div>

            <div className="mt-3.5 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/50">
              {h.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-surface-raised px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  {tag}
                </span>
              ))}
              <span className="ml-auto inline-flex items-center gap-1 text-caption font-medium text-primary-ink opacity-0 group-hover:opacity-100 transition-opacity">
                Explore <ExternalLink className="size-3" aria-hidden />
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}
