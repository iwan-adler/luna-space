import { FIELD_KEYS, type Candidate, type FieldKey, type FieldResult } from './types.ts'

/** Descriptive fields: the best source wins; disagreement between sources is not a conflict. */
const DESCRIPTIVE = new Set<FieldKey>([
  'title',
  'organizer',
  'description',
  'official_url',
  'registration_url',
  'rules_url',
  'location',
  'eligibility_text',
  'prizes',
  'required_documents',
  'tracks',
])

const key = (v: unknown) => JSON.stringify(v)

/**
 * Turns raw candidates into one result per field (FR-OPP-07):
 * - no candidate → **missing** (value null)
 * - one distinct value → **confirmed** if any source stated it explicitly, otherwise **inferred**
 * - several distinct facts (dates, team size, fee, mode) → **conflicting**, up to five candidates
 * Explicit (confirmed) candidates outrank inferred ones, so a guess never conflicts with a fact.
 */
export function mergeCandidates(all: Candidate[]): FieldResult[] {
  const out: FieldResult[] = []
  for (const field of FIELD_KEYS) {
    let list = all.filter((c) => c.field === field).sort((a, b) => a.priority - b.priority)
    if (!list.length) {
      out.push({
        field_key: field,
        candidate_no: 1,
        status: 'missing',
        value: null,
        evidence: null,
        rule_id: null,
        reason: null,
      })
      continue
    }
    if (list.some((c) => c.confidence === 'confirmed'))
      list = list.filter((c) => c.confidence === 'confirmed')
    if (DESCRIPTIVE.has(field)) {
      const best = list[0]!
      out.push({
        field_key: field,
        candidate_no: 1,
        status: best.confidence,
        value: best.value,
        evidence: best.evidence,
        rule_id: best.ruleId,
        reason: best.reason ?? null,
      })
      continue
    }
    const distinct: Candidate[] = []
    for (const c of list) if (!distinct.some((d) => key(d.value) === key(c.value))) distinct.push(c)
    if (distinct.length === 1) {
      const best = distinct[0]!
      out.push({
        field_key: field,
        candidate_no: 1,
        status: best.confidence,
        value: best.value,
        evidence: best.evidence,
        rule_id: best.ruleId,
        reason: best.reason ?? null,
      })
    } else {
      distinct.slice(0, 5).forEach((c, i) =>
        out.push({
          field_key: field,
          candidate_no: i + 1,
          status: 'conflicting',
          value: c.value,
          evidence: c.evidence,
          rule_id: c.ruleId,
          reason: c.reason ?? null,
        }),
      )
    }
  }
  return out
}
