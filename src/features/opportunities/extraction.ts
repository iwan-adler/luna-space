import { z } from 'zod'
import { utcIsoToZonedLocal, type DatedValue } from '@/lib/dates'
import { AppError, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { DateTimeValue } from '@/components/patterns/DateTimeInput'
import type { SavePayload } from './form'

export type RunRow = Database['public']['Tables']['extraction_runs']['Row']
export type FieldRow = Database['public']['Tables']['extraction_fields']['Row']

export const EXTRACT_MESSAGES: Record<string, string> = {
  INVALID_URL: 'That is not a valid web address.',
  FETCH_BLOCKED: 'This address cannot be fetched.',
  FETCH_TIMEOUT: 'The page took too long to respond.',
  FETCH_FAILED: 'The site could not be reached.',
  HTTP_ERROR: 'The site returned an error page.',
  UNSUPPORTED_CONTENT: 'The link is not a web page (for example a PDF).',
  TOO_LARGE: 'The page is too large to read.',
  TOO_MANY_REDIRECTS: 'The link redirects too many times.',
  ROBOTS_DISALLOWED: 'This site asks automated tools not to read this page.',
  RATE_LIMITED:
    'You have fetched many links recently. Please wait a while or enter the details manually.',
  NOT_MEMBER: 'You need a workspace first.',
  SERVER_ERROR: 'Something went wrong while reading the page.',
}

const startResult = z.object({
  ok: z.boolean(),
  runId: z.string().optional(),
  thin: z.boolean().optional(),
  code: z.string().optional(),
  reason: z.string().optional(),
})
export type StartResult = z.infer<typeof startResult>

/** Calls the extract-opportunity Edge Function (FR-OPP-06). */
export async function startExtraction(url: string): Promise<StartResult> {
  const { data, error } = await requireSupabase().functions.invoke('extract-opportunity', {
    body: { url },
  })
  if (error) {
    const ctx = (error as { context?: Response }).context
    try {
      const body = ctx ? await ctx.json() : null
      const parsed = startResult.safeParse(body)
      if (parsed.success) return parsed.data
    } catch {
      // fall through
    }
    return { ok: false, code: 'SERVER_ERROR' }
  }
  const parsed = startResult.safeParse(data)
  return parsed.success ? parsed.data : { ok: false, code: 'SERVER_ERROR' }
}

export async function getRun(runId: string): Promise<{ run: RunRow; fields: FieldRow[] } | null> {
  const sb = requireSupabase()
  const { data: run, error } = await sb
    .from('extraction_runs')
    .select('*')
    .eq('id', runId)
    .maybeSingle()
  if (error) throw toAppError(error)
  if (!run) return null
  const { data: fields, error: fErr } = await sb
    .from('extraction_fields')
    .select('*')
    .eq('run_id', runId)
    .order('field_key')
    .order('candidate_no')
  if (fErr) throw toAppError(fErr)
  return { run, fields }
}

/** Mirrors private.normalize_url in SQL so duplicate detection matches stored sources. */
export function normalizeUrl(url: string): string {
  return url
    .trim()
    .replace(/#.*$/, '')
    .replace(/^https?:\/\/(www\.)?/i, '')
    .toLowerCase()
    .replace(/\/+$/, '')
}

/** An opportunity the viewer can already see with the same source link (Flow §8.1). */
export async function findDuplicate(url: string): Promise<{ id: string; title: string } | null> {
  const { data, error } = await requireSupabase()
    .from('opportunity_sources')
    .select('opportunity:opportunities!inner(id, title, deleted_at)')
    .eq('normalized_url', normalizeUrl(url))
    .is('opportunity.deleted_at', null)
    .limit(1)
  if (error) throw toAppError(error)
  const row = data[0]
  return row ? { id: row.opportunity.id, title: row.opportunity.title } : null
}

export async function acceptExtraction(
  runId: string,
  payload: SavePayload,
  accepted: { field_key: string; candidate_no: number }[],
): Promise<string> {
  type Args = Database['public']['Functions']['accept_extraction']['Args']
  const { data, error } = await requireSupabase().rpc('accept_extraction', {
    p_run: runId,
    p_fields: payload.fields as Args['p_fields'],
    p_dates: payload.dates as Args['p_dates'],
    p_accepted: accepted as Args['p_accepted'],
  })
  if (error) throw toAppError(error)
  if (!data) throw new AppError('Could not save the opportunity.')
  return data
}

/* ------------------------------------------------- editor values for the review screen -- */

export const DATE_FIELDS = [
  'registration_deadline',
  'submission_deadline',
  'event_start',
  'event_end',
] as const
export type EditorValue =
  string | DateTimeValue | { fee: 'unknown' | 'free' | 'paid'; amount: string; currency: string }

/** Converts a stored candidate value into what the matching editor shows. */
export function toEditorValue(fieldKey: string, value: unknown, viewerTz: string): EditorValue {
  if ((DATE_FIELDS as readonly string[]).includes(fieldKey)) {
    const d = value as DatedValue | null
    if (!d) return { date: '', hasTime: false, time: '', timezone: viewerTz }
    if (d.all_day && d.on_date)
      return { date: d.on_date, hasTime: false, time: '', timezone: viewerTz }
    const tz = d.source_timezone ?? viewerTz
    const local = d.at_time ? utcIsoToZonedLocal(d.at_time, tz) : ''
    return {
      date: local.slice(0, 10),
      hasTime: Boolean(local),
      time: local.slice(11),
      timezone: tz,
    }
  }
  if (fieldKey === 'fee') {
    const f = value as { is_free: boolean; amount: number | null; currency: string | null } | null
    if (!f) return { fee: 'unknown', amount: '', currency: 'INR' }
    return f.is_free
      ? { fee: 'free', amount: '', currency: 'INR' }
      : { fee: 'paid', amount: f.amount?.toString() ?? '', currency: f.currency ?? 'INR' }
  }
  if (Array.isArray(value)) return value.join(', ')
  if (value === null || value === undefined) return ''
  return String(value)
}

export function isEmptyEditorValue(v: EditorValue): boolean {
  if (typeof v === 'string') return v.trim() === ''
  if ('date' in v) return v.date === ''
  return v.fee === 'unknown'
}

export const sameEditorValue = (a: EditorValue, b: EditorValue) =>
  JSON.stringify(a) === JSON.stringify(b)
