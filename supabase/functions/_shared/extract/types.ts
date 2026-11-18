export const FIELD_KEYS = [
  'title',
  'organizer',
  'description',
  'official_url',
  'registration_url',
  'rules_url',
  'registration_deadline',
  'submission_deadline',
  'event_start',
  'event_end',
  'mode',
  'location',
  'eligibility_text',
  'team_min',
  'team_max',
  'fee',
  'prizes',
  'required_documents',
  'tracks',
] as const

export type FieldKey = (typeof FIELD_KEYS)[number]
export type DateKey = 'registration_deadline' | 'submission_deadline' | 'event_start' | 'event_end'

export interface DateValue {
  all_day: boolean
  on_date: string | null
  at_time: string | null
  source_timezone: string | null
}

export interface FeeValue {
  is_free: boolean
  amount: number | null
  currency: string | null
}

export type Confidence = 'confirmed' | 'inferred'

/** One proposed value with the exact page text it came from (never a value without evidence). */
export interface Candidate {
  field: FieldKey
  value: unknown
  evidence: string
  ruleId: string
  confidence: Confidence
  reason?: string
  /** Lower is better: structured data (1) < labelled text (2) < meta tags (3) < heuristics (4). */
  priority: number
}

export interface FieldResult {
  field_key: FieldKey
  candidate_no: number
  status: 'confirmed' | 'inferred' | 'missing' | 'conflicting'
  value: unknown
  evidence: string | null
  rule_id: string | null
  reason: string | null
}

export interface ExtractContext {
  pageUrl: string
  now: Date
  /** Zone assumed when a page gives a time without a zone (always reported as inferred). */
  defaultTimeZone: string
}
