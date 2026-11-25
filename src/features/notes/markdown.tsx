import { Fragment, type ReactNode } from 'react'
import { TASK } from './tasks'

/**
 * Markdown-lite for notes (FR-VAULT-02): headings, bold, italics, inline code, code blocks, lists,
 * task lists, quotes and links. Output is built from React elements only (never innerHTML), so
 * nothing in a note can run as code. Only http(s) and mailto links are rendered as links.
 */

const SAFE_LINK = /^(https?:\/\/|mailto:)/i

function inline(text: string, key: string): ReactNode[] {
  const out: ReactNode[] = []
  const re =
    /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*\s][^*]*\*|_[^_\s][^_]*_)|(\[[^\]]+\]\([^)\s]+\))|(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"])/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const t = m[0]
    const k = `${key}-${i++}`
    if (m[1])
      out.push(
        <code key={k} className="rounded bg-hairline px-1 font-sans text-[0.9em]">
          {t.slice(1, -1)}
        </code>,
      )
    else if (m[2]) out.push(<strong key={k}>{inline(t.slice(2, -2), k)}</strong>)
    else if (m[3]) out.push(<em key={k}>{inline(t.slice(1, -1), k)}</em>)
    else if (m[4]) {
      const label = t.slice(1, t.indexOf(']'))
      const href = t.slice(t.indexOf('(') + 1, -1)
      out.push(
        SAFE_LINK.test(href) ? (
          <a
            key={k}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-ink underline"
          >
            {label}
          </a>
        ) : (
          label
        ),
      )
    } else
      out.push(
        <a
          key={k}
          href={t}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-ink underline"
        >
          {t}
        </a>,
      )
    last = m.index + t.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({
  body,
  onToggleTask,
}: {
  body: string
  onToggleTask?: (lineIndex: number) => void
}) {
  const lines = body.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    const key = `b${i}`
    if (/^```/.test(line)) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i]!)) code.push(lines[i++]!)
      i++
      blocks.push(
        <pre
          key={key}
          className="overflow-x-auto rounded-[12px] bg-hairline p-3 font-sans text-body-sm"
        >
          {code.join('\n')}
        </pre>,
      )
      continue
    }
    const heading = /^(#{1,3}) (.*)$/.exec(line)
    if (heading) {
      const level = heading[1]!.length
      const cls =
        level === 1
          ? 'text-h2 font-semibold'
          : level === 2
            ? 'text-h3 font-semibold'
            : 'text-body font-semibold'
      const content = inline(heading[2]!, key)
      blocks.push(
        level === 1 ? (
          <h2 key={key} className={cls}>
            {content}
          </h2>
        ) : level === 2 ? (
          <h3 key={key} className={cls}>
            {content}
          </h3>
        ) : (
          <h4 key={key} className={cls}>
            {content}
          </h4>
        ),
      )
      i++
      continue
    }
    if (/^\s*([-*]|\d+\.) /.test(line)) {
      const ordered = /^\s*\d+\. /.test(line)
      const items: ReactNode[] = []
      while (i < lines.length && /^\s*([-*]|\d+\.) /.test(lines[i]!)) {
        const l = lines[i]!
        const task = TASK.exec(l)
        const index = i
        if (task) {
          const done = task[2] !== ' '
          items.push(
            <li key={`l${i}`} className="flex list-none items-start gap-2">
              <input
                type="checkbox"
                className="mt-1 size-4 accent-[var(--color-primary)]"
                checked={done}
                disabled={!onToggleTask}
                onChange={() => onToggleTask?.(index)}
                aria-label={task[3]}
              />
              <span className={done ? 'text-muted line-through' : ''}>
                {inline(task[3]!, `l${i}`)}
              </span>
            </li>,
          )
        } else {
          items.push(<li key={`l${i}`}>{inline(l.replace(/^\s*([-*]|\d+\.) /, ''), `l${i}`)}</li>)
        }
        i++
      }
      blocks.push(
        ordered ? (
          <ol key={key} className="list-decimal space-y-1 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={key} className="list-disc space-y-1 pl-5">
            {items}
          </ul>
        ),
      )
      continue
    }
    if (/^> /.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^> /.test(lines[i]!)) quote.push(lines[i++]!.slice(2))
      blocks.push(
        <blockquote key={key} className="border-l-2 border-primary/50 pl-3 text-muted">
          {quote.map((q, n) => (
            <Fragment key={n}>
              {inline(q, `${key}-${n}`)}
              {n < quote.length - 1 ? <br /> : null}
            </Fragment>
          ))}
        </blockquote>,
      )
      continue
    }
    if (!line.trim()) {
      i++
      continue
    }
    const para: string[] = []
    while (
      i < lines.length &&
      lines[i]!.trim() &&
      !/^(#{1,3} |```|> |\s*([-*]|\d+\.) )/.test(lines[i]!)
    )
      para.push(lines[i++]!)
    blocks.push(
      <p key={key}>
        {para.map((p, n) => (
          <Fragment key={n}>
            {inline(p, `${key}-${n}`)}
            {n < para.length - 1 ? <br /> : null}
          </Fragment>
        ))}
      </p>,
    )
  }
  return <div className="space-y-3 text-body leading-relaxed">{blocks}</div>
}
