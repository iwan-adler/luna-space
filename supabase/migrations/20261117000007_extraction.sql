-- Migration 0007 — URL extraction runs, proposed fields and acceptance (Schema §17; FR-OPP-06–13).

create table public.extraction_runs (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces (id) on delete cascade,
  requested_by       uuid references public.profiles (id) on delete set null,
  opportunity_id     uuid,
  source_url         text not null check (char_length(source_url) <= 2048),
  final_url          text check (char_length(final_url) <= 2048),
  http_status        smallint,
  content_type       text check (char_length(content_type) <= 200),
  content_hash       bytea,
  status             text not null default 'running' check (status in ('running', 'succeeded', 'failed')),
  error_code         text check (char_length(error_code) <= 60),
  thin               boolean not null default false,
  extractor_version  text not null default '1',
  is_recheck         boolean not null default false,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz,
  expires_at         timestamptz default now() + interval '7 days',   -- cleared when linked to a saved opportunity
  foreign key (opportunity_id, workspace_id)
    references public.opportunities (id, workspace_id) on delete set null (opportunity_id)
);
create index on public.extraction_runs (requested_by, started_at desc);
create index on public.extraction_runs (opportunity_id) where opportunity_id is not null;
create index on public.extraction_runs (expires_at) where opportunity_id is null;

create table public.extraction_fields (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid not null references public.extraction_runs (id) on delete cascade,
  field_key     text not null check (field_key in (
                  'title', 'organizer', 'description', 'official_url', 'registration_url', 'rules_url',
                  'registration_deadline', 'submission_deadline', 'event_start', 'event_end',
                  'mode', 'location', 'eligibility_text', 'team_min', 'team_max', 'fee', 'prizes',
                  'required_documents', 'tracks')),
  candidate_no  smallint not null default 1 check (candidate_no between 1 and 5),
  status        public.field_status not null,
  value         jsonb,
  evidence      varchar(500),
  rule_id       text check (char_length(rule_id) <= 60),
  reason        text check (char_length(reason) <= 300),
  unique (run_id, field_key, candidate_no),
  check (status <> 'missing' or (value is null and candidate_no = 1)),
  check (status = 'missing' or evidence is not null)
);

alter table public.opportunity_field_provenance
  add constraint opportunity_field_provenance_run_fk
  foreign key (extraction_run_id) references public.extraction_runs (id) on delete set null;
alter table public.opportunity_field_history
  add constraint opportunity_field_history_run_fk
  foreign key (extraction_run_id) references public.extraction_runs (id) on delete set null;

------------------------------------------------------------------------------------------
-- RLS: the requester sees their runs; once linked, anyone who can see the opportunity can.
------------------------------------------------------------------------------------------
alter table public.extraction_runs enable row level security;
alter table public.extraction_fields enable row level security;

create policy extraction_runs_select on public.extraction_runs for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (requested_by = (select auth.uid())
              or (opportunity_id is not null
                  and exists (select 1 from public.opportunities o where o.id = opportunity_id))));
create policy extraction_fields_select on public.extraction_fields for select to authenticated
  using (exists (select 1 from public.extraction_runs r where r.id = run_id));
revoke insert, update, delete on public.extraction_runs, public.extraction_fields from anon, authenticated;

------------------------------------------------------------------------------------------
-- start_extraction_run: called by the Edge Function with the member's JWT (rate limit 20/h).
------------------------------------------------------------------------------------------
create or replace function public.start_extraction_run(p_url text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ws  uuid := private.current_workspace_id();
  rid uuid;
begin
  if (select auth.uid()) is null or ws is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  if p_url is null or char_length(p_url) > 2048 or p_url !~* '^https?://[^\s]+$' then
    return jsonb_build_object('ok', false, 'code', 'INVALID_URL');
  end if;
  if not private.consume_rate_limit('extract', 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  insert into public.extraction_runs (workspace_id, requested_by, source_url)
  values (ws, (select auth.uid()), p_url)
  returning id into rid;
  return jsonb_build_object('ok', true, 'run_id', rid);
end;
$$;
revoke all on function public.start_extraction_run from public, anon;
grant execute on function public.start_extraction_run to authenticated;

------------------------------------------------------------------------------------------
-- complete_extraction_run: service role only (results must not be forgeable by clients,
-- because accepted values become "extraction" provenance with evidence).
------------------------------------------------------------------------------------------
create or replace function public.complete_extraction_run(
  p_run uuid, p_status text, p_final_url text, p_http_status int, p_content_type text,
  p_content_hash_hex text, p_error_code text, p_thin boolean, p_fields jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare
  f jsonb;
begin
  update public.extraction_runs
     set status = p_status, final_url = left(p_final_url, 2048), http_status = p_http_status,
         content_type = left(p_content_type, 200),
         content_hash = case when p_content_hash_hex is null then null else decode(p_content_hash_hex, 'hex') end,
         error_code = left(p_error_code, 60), thin = coalesce(p_thin, false), finished_at = now()
   where id = p_run and status = 'running';
  if not found then
    raise exception 'Run not found or already completed' using errcode = 'P0002';
  end if;
  for f in select * from jsonb_array_elements(coalesce(p_fields, '[]')) loop
    insert into public.extraction_fields (run_id, field_key, candidate_no, status, value, evidence, rule_id, reason)
    values (p_run, f ->> 'field_key', coalesce((f ->> 'candidate_no')::smallint, 1),
            (f ->> 'status')::public.field_status, case when f -> 'value' = 'null'::jsonb then null else f -> 'value' end,
            left(f ->> 'evidence', 500), left(f ->> 'rule_id', 60), left(f ->> 'reason', 300));
  end loop;
end;
$$;
revoke all on function public.complete_extraction_run from public, anon, authenticated;
grant execute on function public.complete_extraction_run to service_role;

------------------------------------------------------------------------------------------
-- accept_extraction: saves the reviewed opportunity in one transaction (FR-OPP-08, 10, 11).
-- p_accepted lists the fields the member kept exactly as extracted: [{field_key, candidate_no}].
-- Evidence and status are read from the stored run, never from the client.
------------------------------------------------------------------------------------------
create or replace function public.accept_extraction(
  p_run uuid, p_fields jsonb, p_dates jsonb, p_accepted jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := (select auth.uid());
  run  public.extraction_runs%rowtype;
  oid  uuid;
  a    jsonb;
  fld  public.extraction_fields%rowtype;
  k    text;
  keys text[];
  opp  jsonb;
  tracked constant text[] := array['type', 'title', 'organizer', 'description', 'official_url',
    'registration_url', 'rules_url', 'rules_text', 'mode', 'location', 'eligibility_text', 'team_min',
    'team_max', 'is_free', 'fee_amount', 'fee_currency', 'prizes', 'benefits', 'required_documents',
    'tracks', 'status'];
begin
  select * into run from public.extraction_runs where id = p_run for update;
  if not found or run.requested_by is distinct from uid
     or run.workspace_id is distinct from private.current_workspace_id() then
    raise exception 'Extraction run not found' using errcode = 'P0002';
  end if;
  if run.status <> 'succeeded' or run.opportunity_id is not null then
    raise exception 'This extraction has already been used or did not succeed' using errcode = 'P0001';
  end if;

  perform set_config('app.change_source', 'extraction', true);
  perform set_config('app.extraction_run_id', p_run::text, true);
  oid := public.save_opportunity(null, p_fields, p_dates, coalesce(run.final_url, run.source_url));
  perform set_config('app.change_source', '', true);
  perform set_config('app.extraction_run_id', '', true);

  -- Extraction provenance for fields kept as extracted.
  for a in select * from jsonb_array_elements(coalesce(p_accepted, '[]')) loop
    select * into fld from public.extraction_fields
     where run_id = p_run and field_key = a ->> 'field_key'
       and candidate_no = coalesce((a ->> 'candidate_no')::smallint, 1)
       and status <> 'missing';
    continue when not found;
    keys := case fld.field_key
              when 'fee' then array['is_free', 'fee_amount', 'fee_currency']
              else array[fld.field_key] end;
    foreach k in array keys loop
      insert into public.opportunity_field_provenance
        (opportunity_id, workspace_id, field_key, source, status_at_acceptance, extraction_run_id, evidence,
         verified_by, verified_at)
      values (oid, run.workspace_id, k, 'extraction', fld.status, p_run, fld.evidence, uid, now())
      on conflict (opportunity_id, field_key) do nothing;
    end loop;
  end loop;

  -- Everything else that has a value was entered or edited by the member.
  select to_jsonb(o) into opp from public.opportunities o where o.id = oid;
  foreach k in array tracked loop
    continue when coalesce(opp -> k, 'null'::jsonb) in ('null'::jsonb, '[]'::jsonb, '""'::jsonb);
    continue when k = 'status' or (k = 'fee_currency' and opp -> 'fee_amount' = 'null'::jsonb);
    insert into public.opportunity_field_provenance (opportunity_id, workspace_id, field_key, source, verified_by)
    values (oid, run.workspace_id, k, 'manual', uid)
    on conflict (opportunity_id, field_key) do nothing;
  end loop;
  insert into public.opportunity_field_provenance (opportunity_id, workspace_id, field_key, source, verified_by)
  select oid, run.workspace_id, d.kind::text, 'manual', uid
    from public.opportunity_dates d where d.opportunity_id = oid
  on conflict (opportunity_id, field_key) do nothing;

  update public.opportunity_sources
     set last_checked_at = run.finished_at, last_check_outcome = 'extracted', last_content_hash = run.content_hash
   where opportunity_id = oid and is_primary;
  update public.extraction_runs set opportunity_id = oid, expires_at = null where id = p_run;
  return oid;
end;
$$;
revoke all on function public.accept_extraction from public, anon;
grant execute on function public.accept_extraction to authenticated;
