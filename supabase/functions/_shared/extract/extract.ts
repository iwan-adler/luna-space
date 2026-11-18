import { parse, type HTMLElement } from 'node-html-parser'
import { findDates, parseIsoish } from './dates.ts'
import { mergeCandidates } from './merge.ts'
import type { Candidate, DateKey, ExtractContext, FeeValue, FieldResult } from './types.ts'

export const EXTRACTOR_VERSION = '2'

const clip = (s: string, n = 500) => (s.length > n ? `${s.slice(0, n - 1)}…` : s)
const squash = (s: string) => s.replace(/\s+/g, ' ').trim()

interface Page {
  root: HTMLElement
  lines: string[]
  headings: Set<string>
  url: URL
}

function load(html: string, pageUrl: string): Page {
  const root = parse(html, {
    blockTextElements: { script: true, style: false, noscript: false, pre: true },
  })
  const headings = new Set<string>()
  for (const el of root.querySelectorAll('h1,h2,h3,h4,h5,h6,dt,th,strong,b,summary')) {
    const t = squash(el.text)
    if (t && t.length <= 60) headings.add(t.replace(/[:：]$/, '').toLowerCase())
  }
  const body = root.querySelector('body') ?? root
  for (const el of body.querySelectorAll('script,style,noscript,template,svg')) el.remove()
  const lines = body.structuredText.split('\n').map(squash).filter(Boolean)
  return { root, lines, headings, url: new URL(pageUrl) }
}

const isHeading = (page: Page, line: string) =>
  page.headings.has(line.replace(/[:：]$/, '').toLowerCase())

function absolute(page: Page, href: string | undefined): string | null {
  if (!href) return null
  try {
    const u = new URL(href, page.url)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

/* ------------------------------------------------------------------ structured data -- */

function jsonLdObjects(page: Page): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  const visit = (node: unknown) => {
    if (Array.isArray(node)) node.forEach(visit)
    else if (node && typeof node === 'object') {
      const o = node as Record<string, unknown>
      out.push(o)
      if (o['@graph']) visit(o['@graph'])
    }
  }
  for (const s of page.root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      visit(JSON.parse(s.text))
    } catch {
      // ignore malformed blocks
    }
  }
  const relevant = (o: Record<string, unknown>) => {
    const t = ([] as unknown[]).concat(o['@type'] ?? []).map(String)
    return t.some((x) =>
      /Event$|^Hackathon$|^JobPosting$|^EducationalOccupationalProgram$|^Course$/.test(x),
    )
  }
  return out.filter(relevant)
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim()
    ? squash(v)
    : v && typeof v === 'object' && 'name' in v
      ? str((v as { name: unknown }).name)
      : null

function fromJsonLd(page: Page, add: (c: Candidate) => void) {
  for (const o of jsonLdObjects(page)) {
    const ev = (k: string) => clip(`JSON-LD ${k}: ${(JSON.stringify(o[k]) ?? '').slice(0, 300)}`)
    const name = str(o.name) ?? str(o.title)
    if (name)
      add({
        field: 'title',
        value: name.slice(0, 200),
        evidence: ev(o.name ? 'name' : 'title'),
        ruleId: 'jsonld.name',
        confidence: 'confirmed',
        priority: 1,
      })
    const orgKey = ['organizer', 'hiringOrganization', 'provider'].find((k) => str(o[k]))
    const org = orgKey ? str(o[orgKey]) : null
    if (org && orgKey)
      add({
        field: 'organizer',
        value: org.slice(0, 200),
        evidence: ev(orgKey),
        ruleId: 'jsonld.organizer',
        confidence: 'confirmed',
        priority: 1,
      })
    const desc = str(o.description)
    if (desc)
      add({
        field: 'description',
        value: desc.slice(0, 5000),
        evidence: clip(desc),
        ruleId: 'jsonld.description',
        confidence: 'confirmed',
        priority: 1,
      })
    for (const [key, field] of [
      ['startDate', 'event_start'],
      ['endDate', 'event_end'],
      ['validThrough', 'registration_deadline'],
    ] as const) {
      const raw = typeof o[key] === 'string' ? (o[key] as string) : null
      const parsed = raw ? parseIsoish(raw) : null
      if (parsed)
        add({
          field,
          value: parsed.value,
          evidence: ev(key),
          ruleId: `jsonld.${key}`,
          confidence: parsed.inferred ? 'inferred' : 'confirmed',
          ...(parsed.inferred ? { reason: parsed.inferred } : {}),
          priority: 1,
        })
    }
    const mode = String(o.eventAttendanceMode ?? '')
    const modeValue = /Mixed/i.test(mode)
      ? 'hybrid'
      : /Online/i.test(mode)
        ? 'online'
        : /Offline/i.test(mode)
          ? 'offline'
          : null
    if (modeValue)
      add({
        field: 'mode',
        value: modeValue,
        evidence: ev('eventAttendanceMode'),
        ruleId: 'jsonld.mode',
        confidence: 'confirmed',
        priority: 1,
      })
    const loc = o.location as Record<string, unknown> | undefined
    if (loc && typeof loc === 'object' && !/VirtualLocation/.test(String(loc['@type']))) {
      const address = loc.address
      const parts = [
        str(loc.name),
        typeof address === 'string'
          ? address
          : address && typeof address === 'object'
            ? [
                (address as Record<string, unknown>).addressLocality,
                (address as Record<string, unknown>).addressRegion,
              ]
                .filter(Boolean)
                .join(', ')
            : null,
      ].filter(Boolean)
      if (parts.length)
        add({
          field: 'location',
          value: squash(parts.join(', ')).slice(0, 300),
          evidence: ev('location'),
          ruleId: 'jsonld.location',
          confidence: 'confirmed',
          priority: 1,
        })
    }
    const offers = ([] as unknown[]).concat(o.offers ?? [])[0] as
      Record<string, unknown> | undefined
    if (offers && offers.price !== undefined) {
      const amount = Number(offers.price)
      if (!Number.isNaN(amount)) {
        const fee: FeeValue =
          amount === 0
            ? { is_free: true, amount: null, currency: null }
            : { is_free: false, amount, currency: str(offers.priceCurrency)?.toUpperCase() ?? null }
        add({
          field: 'fee',
          value: fee,
          evidence: ev('offers'),
          ruleId: 'jsonld.offers',
          confidence: fee.is_free || fee.currency ? 'confirmed' : 'inferred',
          ...(fee.is_free || fee.currency ? {} : { reason: 'currency not stated' }),
          priority: 1,
        })
      }
    }
  }
}

function fromMeta(page: Page, add: (c: Candidate) => void) {
  const meta = (sel: string) =>
    page.root.querySelector(sel)?.getAttribute('content')?.trim() || null
  const site = meta('meta[property="og:site_name"]')
  let ogTitle = meta('meta[property="og:title"]') ?? meta('meta[name="twitter:title"]')
  if (ogTitle && site)
    ogTitle = ogTitle.replace(
      new RegExp(`\\s*[|\\-–—]\\s*${site.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i'),
      '',
    )
  if (ogTitle)
    add({
      field: 'title',
      value: squash(ogTitle).slice(0, 200),
      evidence: clip(`og:title: ${ogTitle}`),
      ruleId: 'meta.og_title',
      confidence: 'confirmed',
      priority: 3,
    })
  const h1 = page.root.querySelector('h1')
  if (h1 && squash(h1.text))
    add({
      field: 'title',
      value: squash(h1.text).slice(0, 200),
      evidence: clip(`<h1>${squash(h1.text)}</h1>`),
      ruleId: 'page.h1',
      confidence: 'confirmed',
      priority: 2,
    })
  const title = page.root.querySelector('title')
  if (title && squash(title.text))
    add({
      field: 'title',
      value: squash(title.text).slice(0, 200),
      evidence: clip(`<title>${squash(title.text)}</title>`),
      ruleId: 'page.title',
      confidence: 'inferred',
      reason: 'taken from the browser tab title',
      priority: 4,
    })
  const desc = meta('meta[property="og:description"]') ?? meta('meta[name="description"]')
  if (desc)
    add({
      field: 'description',
      value: squash(desc).slice(0, 5000),
      evidence: clip(desc),
      ruleId: 'meta.description',
      confidence: 'confirmed',
      priority: 3,
    })
  if (site)
    add({
      field: 'organizer',
      value: site.slice(0, 200),
      evidence: clip(`og:site_name: ${site}`),
      ruleId: 'meta.site_name',
      confidence: 'inferred',
      reason: 'site name, may be the platform rather than the organizer',
      priority: 4,
    })
  const canonical = absolute(
    page,
    page.root.querySelector('link[rel="canonical"]')?.getAttribute('href'),
  )
  add({
    field: 'official_url',
    value: canonical ?? page.url.toString(),
    evidence: clip(
      canonical ? `<link rel="canonical" href="${canonical}">` : `Fetched page: ${page.url}`,
    ),
    ruleId: canonical ? 'page.canonical' : 'page.url',
    confidence: 'confirmed',
    priority: canonical ? 1 : 2,
  })
}

function fromLinks(page: Page, add: (c: Candidate) => void) {
  for (const a of page.root.querySelectorAll('a[href]')) {
    const text = squash(a.text)
    const href = absolute(page, a.getAttribute('href'))
    if (!href || !text || text.length > 60) continue
    if (
      /^(register|register now|registration|apply|apply now|sign up|signup|enrol|enroll)\b/i.test(
        text,
      )
    ) {
      add({
        field: 'registration_url',
        value: href,
        evidence: clip(`Link "${text}" → ${href}`),
        ruleId: 'link.register',
        confidence: 'confirmed',
        priority: 2,
      })
    } else if (/\b(rules|rulebook|rule book|guidelines|terms and conditions)\b/i.test(text)) {
      add({
        field: 'rules_url',
        value: href,
        evidence: clip(`Link "${text}" → ${href}`),
        ruleId: 'link.rules',
        confidence: 'confirmed',
        priority: 2,
      })
    }
  }
}

/* -------------------------------------------------------------------- labelled text -- */

const DATE_LABELS: { key: DateKey; re: RegExp }[] = [
  {
    key: 'registration_deadline',
    re: /\b(registrations?|apply|applications?|application window)\b[^.\n]{0,40}?\b(close|closes|closing|end|ends|deadline|due|by|until|last date)\b|\blast date (to|for) (apply|register|registration|applications?)\b|\b(register|apply) by\b|\bregistration deadline\b|\bapplication deadline\b/i,
  },
  {
    key: 'submission_deadline',
    re: /\b(submissions?|project submission|final submission|submit)\b[^.\n]{0,40}?\b(close|closes|closing|deadline|due|by|ends?|until)\b|\bsubmission deadline\b|\bsubmit by\b|^deadline\b|\bsubmission (period|window)\b/i,
  },
  {
    key: 'event_start',
    re: /\b(event|hackathon|competition|conference|workshop|programme|program|summer school|bootcamp)\b[^.\n]{0,25}?\b(dates?|starts?|begins?|kicks? off|commences|will be held|takes place|is on)\b|\b(starts?|begins?) on\b|\bevent dates?\b/i,
  },
  {
    key: 'event_end',
    re: /\b(event|hackathon|programme|program)\b[^.\n]{0,25}?\b(ends?|concludes?)\b/i,
  },
  // Timeline entries such as "Starts: 20 Nov" / "Ends: 5 Dec" (inferred: they may belong to a round).
  { key: 'event_start', re: /^(starts?( on)?|start date|begins?( on)?)\s*[:\-–]/i },
  { key: 'event_end', re: /^(ends?( on)?|end date)\s*[:\-–]/i },
]
const TIMELINE_LABEL = /^(starts?( on)?|start date|begins?( on)?|ends?( on)?|end date)\s*[:\-–]/i
const PERIOD = /\b(submission|hackathon|event) (period|window)\b/i
const REG_RANGE = /\b(registrations?|applications?)\b[^.\n]{0,30}?\b(open|window|period)\b/i

function fromDates(page: Page, ctx: ExtractContext, add: (c: Candidate) => void) {
  page.lines.forEach((line, i) => {
    for (const { key, re } of DATE_LABELS) {
      if (!re.test(line)) continue
      let dates = findDates(line, ctx)
      let evidence = line
      let proximity = false
      if (!dates.length && i + 1 < page.lines.length && line.length <= 60) {
        dates = findDates(page.lines[i + 1]!, ctx)
        evidence = `${line} ${page.lines[i + 1]}`
      }
      if (!dates.length) {
        for (let j = i + 2; j <= i + 3 && j < page.lines.length && !dates.length; j++) {
          dates = findDates(page.lines[j]!, ctx)
          if (dates.length) {
            evidence = `${line} … ${page.lines[j]}`
            proximity = true
          }
        }
      }
      const first = dates[0]
      if (!first) continue
      const reasons = [
        first.inferred,
        proximity ? 'date found near, not next to, the label' : null,
        TIMELINE_LABEL.test(line)
          ? 'taken from a timeline entry, which may belong to one round'
          : null,
      ].filter(Boolean)
      const base = { evidence: clip(evidence), ruleId: `label.${key}`, priority: 2 }
      if (first.rangeEnd && (key === 'registration_deadline' || REG_RANGE.test(line))) {
        add({
          ...base,
          field: 'registration_deadline',
          value: first.rangeEnd.value,
          confidence: reasons.length ? 'inferred' : 'confirmed',
          ...(reasons.length ? { reason: reasons.join('; ') } : {}),
        })
      } else if (
        key === 'submission_deadline' &&
        PERIOD.test(line) &&
        (first.rangeEnd || dates.length >= 2)
      ) {
        // "Submission period: 20 Oct – 21 Dec": the end is the deadline, the start opens the event.
        const confidence = reasons.length ? 'inferred' : 'confirmed'
        const reason = reasons.length ? { reason: reasons.join('; ') } : {}
        add({
          ...base,
          field: 'submission_deadline',
          value: (first.rangeEnd ?? dates[dates.length - 1]!).value,
          confidence,
          ...reason,
        })
        add({ ...base, field: 'event_start', value: first.value, confidence, ...reason })
      } else if (first.rangeEnd && (key === 'event_start' || key === 'event_end')) {
        add({
          ...base,
          field: 'event_start',
          value: first.value,
          confidence: reasons.length ? 'inferred' : 'confirmed',
          ...(reasons.length ? { reason: reasons.join('; ') } : {}),
        })
        add({
          ...base,
          field: 'event_end',
          value: first.rangeEnd.value,
          confidence: reasons.length ? 'inferred' : 'confirmed',
          ...(reasons.length ? { reason: reasons.join('; ') } : {}),
        })
      } else {
        const value =
          first.rangeEnd && key.endsWith('deadline') ? first.rangeEnd.value : first.value
        add({
          ...base,
          field: key,
          value,
          confidence: reasons.length ? 'inferred' : 'confirmed',
          ...(reasons.length ? { reason: reasons.join('; ') } : {}),
        })
      }
      break
    }
  })
}

const WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
}
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : (WORDS[s.toLowerCase()] ?? NaN))
const N = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten)'

function fromTeam(page: Page, add: (c: Candidate) => void) {
  for (const line of page.lines) {
    if (!/\b(team|members?|participants?|individual|solo)\b/i.test(line)) continue
    const range =
      new RegExp(
        `\\b(?:team(?:s)?(?:\\s+size)?(?:\\s+of)?|teams? can have|team members?)\\s*[:\\-–]?\\s*${N}\\s*(?:-|–|to)\\s*${N}\\b`,
        'i',
      ).exec(line) ??
      new RegExp(`\\b${N}\\s*(?:-|–|to)\\s*${N}\\s*(?:members|participants|people)\\b`, 'i').exec(
        line,
      )
    if (range) {
      const [a, b] = [num(range[1]!), num(range[2]!)]
      const worded = !/^\d+$/.test(range[1]!) || !/^\d+$/.test(range[2]!)
      if (a >= 1 && b >= a && b <= 50) {
        const c = {
          evidence: clip(line),
          ruleId: 'label.team_range',
          confidence: worded ? 'inferred' : 'confirmed',
          ...(worded ? { reason: 'number written as a word' } : {}),
          priority: 2,
        } as const
        add({ ...c, field: 'team_min', value: a })
        add({ ...c, field: 'team_max', value: b })
        continue
      }
    }
    const max =
      new RegExp(
        `\\b(?:up to|maximum(?: of)?|max\\.?|at most|not more than)\\s*${N}\\s*(?:members|participants|people|per team)`,
        'i',
      ).exec(line) ?? new RegExp(`\\bteams? of up to\\s*${N}\\b`, 'i').exec(line)
    if (max) {
      const v = num(max[1]!)
      if (v >= 1 && v <= 50)
        add({
          field: 'team_max',
          value: v,
          evidence: clip(line),
          ruleId: 'label.team_max',
          confidence: /^\d+$/.test(max[1]!) ? 'confirmed' : 'inferred',
          ...(/^\d+$/.test(max[1]!) ? {} : { reason: 'number written as a word' }),
          priority: 2,
        })
    }
    const min = new RegExp(
      `\\b(?:at least|minimum(?: of)?|min\\.?)\\s*${N}\\s*(?:members|participants|people)`,
      'i',
    ).exec(line)
    if (min) {
      const v = num(min[1]!)
      if (v >= 1 && v <= 50)
        add({
          field: 'team_min',
          value: v,
          evidence: clip(line),
          ruleId: 'label.team_min',
          confidence: /^\d+$/.test(min[1]!) ? 'confirmed' : 'inferred',
          ...(/^\d+$/.test(min[1]!) ? {} : { reason: 'number written as a word' }),
          priority: 2,
        })
    }
  }
}

const CURRENCY: Record<string, string> = {
  '₹': 'INR',
  rs: 'INR',
  'rs.': 'INR',
  inr: 'INR',
  $: 'USD',
  usd: 'USD',
  '€': 'EUR',
  eur: 'EUR',
  '£': 'GBP',
  gbp: 'GBP',
}

function fromFee(page: Page, add: (c: Candidate) => void) {
  const bare = page.lines.slice(0, 40).find((l) => /^(free|free entry|no fee)$/i.test(l))
  if (bare)
    add({
      field: 'fee',
      value: { is_free: true, amount: null, currency: null } satisfies FeeValue,
      evidence: clip(bare),
      ruleId: 'line.fee_free',
      confidence: 'inferred',
      reason: 'a standalone "Free" near the top of the page',
      priority: 3,
    })
  for (const line of page.lines) {
    if (
      /\b(no|zero|nil)\s+(registration|entry|participation|application)\s+fees?\b|\b(free|free of cost) (to (participate|enter|apply|join)|registration|entry|of charge)\b|\b(registration|entry|participation)\s+(is\s+)?free\b|\bfee\s*[:\-–]\s*(free|nil|none|₹\s?0|0)\b/i.test(
        line,
      )
    ) {
      add({
        field: 'fee',
        value: { is_free: true, amount: null, currency: null } satisfies FeeValue,
        evidence: clip(line),
        ruleId: 'label.fee_free',
        confidence: 'confirmed',
        priority: 2,
      })
      continue
    }
    const m =
      /\b(registration|entry|participation|application)\s+fees?\b[^.\n]{0,25}?(₹|rs\.?|inr|\$|usd|€|eur|£|gbp)\s?([\d,]+(?:\.\d{1,2})?)/i.exec(
        line,
      )
    if (m) {
      const amount = Number(m[3]!.replace(/,/g, ''))
      if (!Number.isNaN(amount))
        add({
          field: 'fee',
          value:
            amount === 0
              ? { is_free: true, amount: null, currency: null }
              : ({
                  is_free: false,
                  amount,
                  currency: CURRENCY[m[2]!.toLowerCase()] ?? null,
                } satisfies FeeValue),
          evidence: clip(line),
          ruleId: 'label.fee_amount',
          confidence: 'confirmed',
          priority: 2,
        })
    }
  }
}

const MODE_WORDS: { value: 'online' | 'offline' | 'hybrid'; re: RegExp }[] = [
  { value: 'hybrid', re: /\bhybrid\b/i },
  { value: 'online', re: /\b(online|virtual|remote)\b/i },
  { value: 'offline', re: /\b(offline|in[- ]person|on[- ]site|onsite)\b/i },
]

function fromMode(page: Page, add: (c: Candidate) => void) {
  for (const line of page.lines) {
    const label =
      /^(mode|format|event mode|event type|type|venue type)\s*[:\-–]\s*(.{2,60})$/i.exec(line)
    if (label) {
      const hit = MODE_WORDS.find((w) => w.re.test(label[2]!))
      if (hit) {
        add({
          field: 'mode',
          value: hit.value,
          evidence: clip(line),
          ruleId: 'label.mode',
          confidence: 'confirmed',
          priority: 2,
        })
        return
      }
    }
  }
  const bare = page.lines
    .slice(0, 40)
    .find((l) => /^(online|offline|hybrid|in[- ]person|virtual|on[- ]site)$/i.test(l))
  const bareHit = bare ? MODE_WORDS.find((w) => w.re.test(bare)) : undefined
  if (bare && bareHit) {
    add({
      field: 'mode',
      value: bareHit.value,
      evidence: clip(bare),
      ruleId: 'line.mode',
      confidence: 'inferred',
      reason: 'a standalone mode word near the top of the page',
      priority: 3,
    })
    return
  }
  const text = page.lines.slice(0, 80).join(' ')
  const hits = MODE_WORDS.filter((w) =>
    new RegExp(
      `${w.re.source}\\s+(hackathon|event|competition|programme|program|internship|conference|workshop|round)`,
      'i',
    ).test(text),
  )
  if (hits.length === 1) {
    const m = new RegExp(`[^.]{0,80}${hits[0]!.re.source}[^.]{0,80}`, 'i').exec(text)
    add({
      field: 'mode',
      value: hits[0]!.value,
      evidence: clip(m?.[0] ?? hits[0]!.value),
      ruleId: 'heuristic.mode',
      confidence: 'inferred',
      reason: 'mode inferred from the page wording',
      priority: 4,
    })
  }
}

function inlineLabel(
  page: Page,
  labels: RegExp,
  field: Candidate['field'],
  ruleId: string,
  add: (c: Candidate) => void,
  max = 300,
) {
  for (const line of page.lines) {
    const m = new RegExp(`^(?:${labels.source})\\s*[:\\-–]\\s*(.{2,})$`, 'i').exec(line)
    if (m) {
      const value = m[m.length - 1]!.slice(0, max)
      add({ field, value, evidence: clip(line), ruleId, confidence: 'confirmed', priority: 2 })
      return true
    }
  }
  return false
}

function section(
  page: Page,
  heading: RegExp,
  maxLines = 8,
): { lines: string[]; title: string } | null {
  for (let i = 0; i < page.lines.length; i++) {
    const line = page.lines[i]!
    if (line.length > 60 || !heading.test(line) || !isHeading(page, line)) continue
    const out: string[] = []
    for (let j = i + 1; j < page.lines.length && out.length < maxLines; j++) {
      const next = page.lines[j]!
      if (isHeading(page, next) && next.length <= 60) break
      out.push(next)
    }
    if (out.length) return { lines: out, title: line }
  }
  return null
}

function fromSections(page: Page, add: (c: Candidate) => void) {
  if (
    !inlineLabel(
      page,
      /eligibility|eligibility criteria|who can (?:apply|participate|join)/,
      'eligibility_text',
      'label.eligibility',
      add,
      5000,
    )
  ) {
    const s = section(
      page,
      /^(eligibility|eligibility criteria|who can (apply|participate|join)\??)[:：]?$/i,
    )
    if (s)
      add({
        field: 'eligibility_text',
        value: s.lines.join('\n').slice(0, 5000),
        evidence: clip(`${s.title}: ${s.lines.join(' ')}`),
        ruleId: 'section.eligibility',
        confidence: 'confirmed',
        priority: 2,
      })
  }
  if (
    !inlineLabel(page, /prizes?|prize pool|rewards?|awards?/, 'prizes', 'label.prizes', add, 5000)
  ) {
    const s = section(page, /^(prizes?|prize pool|rewards?|awards?( & prizes)?)[:：]?$/i)
    if (s)
      add({
        field: 'prizes',
        value: s.lines.join('\n').slice(0, 5000),
        evidence: clip(`${s.title}: ${s.lines.join(' ')}`),
        ruleId: 'section.prizes',
        confidence: 'confirmed',
        priority: 2,
      })
    else {
      const line = page.lines.find((l) => /\bprize pool (of|worth)\b/i.test(l))
      if (line)
        add({
          field: 'prizes',
          value: line.slice(0, 500),
          evidence: clip(line),
          ruleId: 'line.prize_pool',
          confidence: 'confirmed',
          priority: 3,
        })
    }
  }
  inlineLabel(page, /venue|location|where/, 'location', 'label.location', add)
  const about = section(
    page,
    /^(about( the)? (challenge|hackathon|competition|event|program(me)?|opportunity|internship|scholarship)|all about the (competition|hackathon|event)|overview|description|about)[:：]?$/i,
    6,
  )
  if (about)
    add({
      field: 'description',
      value: about.lines.join('\n').slice(0, 2000),
      evidence: clip(`${about.title}: ${about.lines.join(' ')}`),
      ruleId: 'section.about',
      confidence: 'confirmed',
      priority: 3,
    })
  for (const [re, field, rule] of [
    [
      /^(required documents|documents required|documents needed|what you need|documents)[:：]?$/i,
      'required_documents',
      'section.documents',
    ],
    [/^(tracks|themes|problem statements|categories|domains)[:：]?$/i, 'tracks', 'section.tracks'],
  ] as const) {
    const s = section(page, re, 12)
    if (!s) continue
    const items = s.lines
      .filter((l) => l.length <= 100)
      .map((l) => l.replace(/^[•\-–*\d.)\s]+/, '').trim())
      .filter(Boolean)
    if (items.length)
      add({
        field,
        value: [...new Set(items)].slice(0, 12),
        evidence: clip(`${s.title}: ${items.join('; ')}`),
        ruleId: rule,
        confidence: 'confirmed',
        priority: 2,
      })
  }
  for (const line of page.lines) {
    const m =
      /\b([Oo]rgani[sz]ed|[Hh]osted|[Pp]resented|[Cc]onducted|[Rr]un) by\s+(?:the\s+)?([A-Z][\w&.,' -]{1,80}?)(?:[.!|]|\s+(?:in|on|at|for|with)\s|$)/.exec(
        line,
      )
    if (m) {
      add({
        field: 'organizer',
        value: m[2]!.trim().replace(/,$/, ''),
        evidence: clip(line),
        ruleId: 'label.organizer',
        confidence: 'confirmed',
        priority: 2,
      })
      break
    }
  }
}

/** Extracts proposed opportunity fields from a fetched page. Pure function; never invents values. */
export function extractFromHtml(
  html: string,
  ctx: ExtractContext,
): { fields: FieldResult[]; thin: boolean } {
  const page = load(html, ctx.pageUrl)
  const candidates: Candidate[] = []
  const add = (c: Candidate) => {
    if (c.evidence.trim()) candidates.push(c)
  }
  fromJsonLd(page, add)
  fromMeta(page, add)
  fromLinks(page, add)
  fromDates(page, ctx, add)
  fromTeam(page, add)
  fromFee(page, add)
  fromMode(page, add)
  fromSections(page, add)
  const fields = mergeCandidates(candidates)
  const substantive = new Set(
    fields
      .filter(
        (f) =>
          f.status !== 'missing' &&
          !['title', 'description', 'official_url', 'organizer'].includes(f.field_key),
      )
      .map((f) => f.field_key),
  )
  return { fields, thin: substantive.size < 2 }
}
