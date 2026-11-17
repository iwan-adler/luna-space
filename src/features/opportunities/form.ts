import { z } from 'zod'
import { isDateOnly, utcIsoToZonedLocal, zonedLocalToUtcIso } from '@/lib/dates'
import { DATE_KINDS, TYPE_LABELS, type OpportunityType } from './constants'
import type { Opportunity } from './model'

const optionalUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (v) => v === '' || /^https?:\/\/[^\s]+$/i.test(v),
    'Enter a full link starting with https://',
  )

const optionalText = (max: number) => z.string().trim().max(max)

const intOrBlank = z
  .string()
  .trim()
  .refine((v) => v === '' || /^\d+$/.test(v), 'Whole numbers only')
  .refine((v) => v === '' || (Number(v) >= 1 && Number(v) <= 50), 'Between 1 and 50')

export const dateValueSchema = z
  .object({
    date: z.string(),
    hasTime: z.boolean(),
    time: z.string(),
    timezone: z.string(),
  })
  .refine((v) => v.date === '' || isDateOnly(v.date), {
    message: 'Enter a valid date',
    path: ['date'],
  })
  .refine((v) => !v.hasTime || v.date === '' || /^\d{2}:\d{2}$/.test(v.time), {
    message: 'Enter a time',
    path: ['time'],
  })

export type DateValue = z.infer<typeof dateValueSchema>

const typeKeys = Object.keys(TYPE_LABELS) as [OpportunityType, ...OpportunityType[]]

export const opportunityFormSchema = z
  .object({
    type: z.enum(typeKeys),
    title: z.string().trim().min(1, 'Enter a name').max(200),
    organizer: optionalText(200),
    description: optionalText(20000),
    officialUrl: optionalUrl,
    registrationUrl: optionalUrl,
    rulesUrl: optionalUrl,
    rulesText: optionalText(20000),
    mode: z.enum(['online', 'offline', 'hybrid', 'unknown']),
    location: optionalText(300),
    eligibilityText: optionalText(5000),
    teamMin: intOrBlank,
    teamMax: intOrBlank,
    fee: z.enum(['unknown', 'free', 'paid']),
    feeAmount: z
      .string()
      .trim()
      .refine((v) => v === '' || /^\d+(\.\d{1,2})?$/.test(v), 'Enter an amount like 499 or 499.50'),
    feeCurrency: z
      .string()
      .trim()
      .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code'),
    prizes: optionalText(5000),
    benefits: optionalText(5000),
    requiredDocuments: optionalText(2000),
    tracks: optionalText(2000),
    tags: optionalText(500),
    visibility: z.enum(['shared', 'private']),
    dates: z.record(z.string(), dateValueSchema),
  })
  .refine((v) => v.teamMin === '' || v.teamMax === '' || Number(v.teamMin) <= Number(v.teamMax), {
    message: 'Minimum cannot be larger than maximum',
    path: ['teamMax'],
  })
  .refine((v) => v.fee !== 'paid' || v.feeAmount !== '', {
    message: 'Enter the fee',
    path: ['feeAmount'],
  })

export type OpportunityFormValues = z.infer<typeof opportunityFormSchema>

/** Splits "a, b\nc" into ["a","b","c"] without blanks or duplicates. */
export function splitList(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ]
}

const emptyDate = (tz: string): DateValue => ({ date: '', hasTime: false, time: '', timezone: tz })

export function emptyForm(viewerTz: string): OpportunityFormValues {
  return {
    type: 'hackathon',
    title: '',
    organizer: '',
    description: '',
    officialUrl: '',
    registrationUrl: '',
    rulesUrl: '',
    rulesText: '',
    mode: 'unknown',
    location: '',
    eligibilityText: '',
    teamMin: '',
    teamMax: '',
    fee: 'unknown',
    feeAmount: '',
    feeCurrency: 'INR',
    prizes: '',
    benefits: '',
    requiredDocuments: '',
    tracks: '',
    tags: '',
    visibility: 'shared',
    dates: Object.fromEntries(DATE_KINDS.map((d) => [d.kind, emptyDate(viewerTz)])),
  }
}

export function formFromOpportunity(o: Opportunity, viewerTz: string): OpportunityFormValues {
  const base = emptyForm(viewerTz)
  for (const d of o.dates) {
    if (d.kind === 'other') continue
    if (d.all_day && d.on_date) {
      base.dates[d.kind] = { date: d.on_date, hasTime: false, time: '', timezone: viewerTz }
    } else if (d.at_time) {
      const tz = d.source_timezone ?? viewerTz
      const local = utcIsoToZonedLocal(d.at_time, tz)
      base.dates[d.kind] = {
        date: local.slice(0, 10),
        hasTime: true,
        time: local.slice(11),
        timezone: tz,
      }
    }
  }
  return {
    ...base,
    type: o.type,
    title: o.title,
    organizer: o.organizer ?? '',
    description: o.description ?? '',
    officialUrl: o.official_url ?? '',
    registrationUrl: o.registration_url ?? '',
    rulesUrl: o.rules_url ?? '',
    rulesText: o.rules_text ?? '',
    mode: o.mode,
    location: o.location ?? '',
    eligibilityText: o.eligibility_text ?? '',
    teamMin: o.team_min?.toString() ?? '',
    teamMax: o.team_max?.toString() ?? '',
    fee: o.is_free ? 'free' : o.fee_amount != null ? 'paid' : 'unknown',
    feeAmount: o.fee_amount?.toString() ?? '',
    feeCurrency: o.fee_currency ?? 'INR',
    prizes: o.prizes ?? '',
    benefits: o.benefits ?? '',
    requiredDocuments: o.required_documents.join('\n'),
    tracks: o.tracks.join(', '),
    tags: o.tags.join(', '),
    visibility: o.visibility,
  }
}

const orNull = (v: string) => (v.trim() === '' ? null : v.trim())

export interface SavePayload {
  fields: Record<string, unknown>
  dates: {
    kind: string
    all_day: boolean
    on_date: string | null
    at_time: string | null
    source_timezone: string | null
  }[]
}

/** Converts form values to the save_opportunity RPC payload. Never invents a time for a date-only value. */
export function toSavePayload(v: OpportunityFormValues): SavePayload {
  const dates: SavePayload['dates'] = []
  for (const { kind } of DATE_KINDS) {
    const d = v.dates[kind]
    if (!d || d.date === '') continue
    dates.push(
      d.hasTime
        ? {
            kind,
            all_day: false,
            on_date: null,
            at_time: zonedLocalToUtcIso(`${d.date}T${d.time}`, d.timezone),
            source_timezone: d.timezone,
          }
        : { kind, all_day: true, on_date: d.date, at_time: null, source_timezone: null },
    )
  }
  return {
    fields: {
      type: v.type,
      title: v.title.trim(),
      organizer: orNull(v.organizer),
      description: orNull(v.description),
      official_url: orNull(v.officialUrl),
      registration_url: orNull(v.registrationUrl),
      rules_url: orNull(v.rulesUrl),
      rules_text: orNull(v.rulesText),
      mode: v.mode,
      location: orNull(v.location),
      eligibility_text: orNull(v.eligibilityText),
      team_min: v.teamMin === '' ? null : Number(v.teamMin),
      team_max: v.teamMax === '' ? null : Number(v.teamMax),
      is_free: v.fee === 'unknown' ? null : v.fee === 'free',
      fee_amount: v.fee === 'paid' ? Number(v.feeAmount) : null,
      fee_currency: v.feeCurrency.toUpperCase(),
      prizes: orNull(v.prizes),
      benefits: orNull(v.benefits),
      required_documents: splitList(v.requiredDocuments),
      tracks: splitList(v.tracks),
      tags: splitList(v.tags).map((t) => t.toLowerCase()),
      visibility: v.visibility,
    },
    dates,
  }
}
