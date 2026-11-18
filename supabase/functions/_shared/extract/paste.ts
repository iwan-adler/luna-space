import { extractFromHtml } from './extract.ts'
import type { ExtractContext, FieldResult } from './types.ts'

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Text the person copied from a page (Ctrl+A, Ctrl+C) when the site blocks automated reading.
 * Each line becomes its own block so the line-based rules work as they do on HTML; short lines
 * that look like labels are marked as headings so "Label" / "value" pairs are recognised.
 */
const LABEL =
  /^(about( the)? [a-z ]{3,30}|all about the [a-z ]{3,20}|overview|description|details|eligibility( criteria)?|who can (apply|participate|join)\??|prizes?|prize pool|rewards?|awards?|team size|teams?|deadline|registration deadline|submission deadline|important dates|dates|timeline|stages and timelines|schedule|requirements|rules|judging( criteria)?|judges|tracks|themes|problem statements|categories|domains|registration fee|fees?|location|venue|mode|contact( the organi[sz]ers)?|faqs?|documents( required)?|required documents|perks|benefits|how to apply|submission period)[:：]?$/i
const isLabel = (l: string) => l.length <= 50 && (LABEL.test(l) || /[:：]$/.test(l))

export function pastedTextToHtml(text: string): string {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .slice(0, 4000)
  const title = lines.find(
    (l) => l.length >= 4 && l.length <= 120 && !/^(skip to|join|host|hackathons?$)/i.test(l),
  )
  const body = lines
    .map((l) => (isLabel(l) ? `<h3>${escape(l)}</h3>` : `<p>${escape(l)}</p>`))
    .join('\n')
  return `<!doctype html><html><head><title>${escape(title ?? '')}</title></head><body>${body}</body></html>`
}

export function extractFromPastedText(
  text: string,
  ctx: ExtractContext,
): { fields: FieldResult[]; thin: boolean } {
  return extractFromHtml(pastedTextToHtml(text), ctx)
}
