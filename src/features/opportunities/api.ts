import { toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { OpportunityStatus } from './constants'
import type { SavePayload } from './form'
import type { Opportunity } from './model'

type Tables = Database['public']['Tables']
export type SourceRow = Tables['opportunity_sources']['Row']
export type ProvenanceRow = Tables['opportunity_field_provenance']['Row']
export type HistoryRow = Tables['opportunity_field_history']['Row']

const OPP_COLUMNS =
  'id, workspace_id, owner_id, visibility, type, title, organizer, description, official_url, registration_url, rules_url, rules_text, mode, location, eligibility_text, eligibility_criteria, team_min, team_max, is_free, fee_amount, fee_currency, prizes, benefits, required_documents, tracks, tags, status, created_at, updated_at, deleted_at, deleted_by, dates:opportunity_dates(kind, all_day, on_date, at_time, source_timezone)'

/** All live opportunities the viewer can see (RLS hides other members' private items). */
export async function listOpportunities(): Promise<Opportunity[]> {
  const { data, error } = await requireSupabase()
    .from('opportunities')
    .select(OPP_COLUMNS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(500)
  if (error) throw toAppError(error)
  return data
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const { data, error } = await requireSupabase()
    .from('opportunities')
    .select(OPP_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}

export async function listSources(id: string): Promise<SourceRow[]> {
  const { data, error } = await requireSupabase()
    .from('opportunity_sources')
    .select('*')
    .eq('opportunity_id', id)
    .order('created_at')
  if (error) throw toAppError(error)
  return data
}

export async function listProvenance(id: string): Promise<ProvenanceRow[]> {
  const { data, error } = await requireSupabase()
    .from('opportunity_field_provenance')
    .select('*')
    .eq('opportunity_id', id)
  if (error) throw toAppError(error)
  return data
}

export async function listHistory(id: string): Promise<HistoryRow[]> {
  const { data, error } = await requireSupabase()
    .from('opportunity_field_history')
    .select('*')
    .eq('opportunity_id', id)
    .order('changed_at', { ascending: false })
    .limit(200)
  if (error) throw toAppError(error)
  return data
}

export async function saveOpportunity(
  id: string | null,
  payload: SavePayload,
  sourceUrl: string | null,
): Promise<string> {
  const { data, error } = await requireSupabase().rpc('save_opportunity', {
    p_id: id as string,
    p_fields:
      payload.fields as Database['public']['Functions']['save_opportunity']['Args']['p_fields'],
    p_dates:
      payload.dates as Database['public']['Functions']['save_opportunity']['Args']['p_dates'],
    p_source_url: sourceUrl as string,
  })
  if (error) throw toAppError(error)
  return data
}

export async function setStatus(id: string, status: OpportunityStatus): Promise<void> {
  const { error } = await requireSupabase().from('opportunities').update({ status }).eq('id', id)
  if (error) throw toAppError(error)
}

/** Soft delete: the item moves to the recycle bin for 30 days (FR-PLAT-10). */
export async function setDeleted(id: string, deleted: boolean, userId: string): Promise<void> {
  const { error } = await requireSupabase()
    .from('opportunities')
    .update(
      deleted
        ? { deleted_at: new Date().toISOString(), deleted_by: userId }
        : { deleted_at: null, deleted_by: null },
    )
    .eq('id', id)
  if (error) throw toAppError(error)
}
