import { parseHighlights } from './model'

/** Text with the search matches emphasised (FR-VAULT-06). */
export function Highlight({ text, className }: { text: string | null; className?: string }) {
  return (
    <span className={className}>
      {parseHighlights(text).map((s, i) =>
        s.hit ? (
          <mark key={i} className="rounded-[4px] bg-primary/20 px-0.5 font-medium text-text">
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  )
}
