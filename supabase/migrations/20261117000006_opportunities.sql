-- Migration 0006 — opportunities, dates, sources, field provenance and change history
-- (Backend Schema §16–17; FR-OPP-01–05, 10–12).

------------------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------------------
create table public.opportunities (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  owner_id             uuid references public.profiles (id) on delete set null,
  visibility           public.visibility not null default 'shared',
  type                 public.opportunity_type not null,
  title                text not null check (char_length(btrim(title)) between 1 and 200),
  organizer            text check (char_length(organizer) <= 200),
  description          text check (char_length(description) <= 20000),
  official_url         text check (official_url ~ '^https?://' and char_length(official_url) <= 2048),
  registration_url     text check (registration_url ~ '^https?://' and char_length(registration_url) <= 2048),
  rules_url            text check (rules_url ~ '^https?://' and char_length(rules_url) <= 2048),
  rules_text           text check (char_length(rules_text) <= 20000),
  mode                 public.participation_mode not null default 'unknown',
  location             text check (char_length(location) <= 300),
  eligibility_text     text check (char_length(eligibility_text) <= 5000),
  eligibility_criteria jsonb,
  team_min             smallint check (team_min >= 1),
  team_max             smallint check (team_max between 1 and 50),
  is_free              boolean,
  fee_amount           numeric(12, 2) check (fee_amount >= 0),
  fee_currency         char(3) default 'INR' check (fee_currency ~ '^[A-Z]{3}$'),
  prizes               text check (char_length(prizes) <= 5000),
  benefits             text check (char_length(benefits) <= 5000),
  required_documents   text[] not null default '{}',
  tracks               text[] not null default '{}',
  tags                 text[] not null default '{}',
  status               public.opportunity_status not null default 'saved',
  search               tsvector generated always as (
                         setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                         setweight(to_tsvector('english', coalesce(organizer, '')), 'B') ||
                         setweight(to_tsvector('english', coalesce(description, '') || ' ' || coalesce(location, '')), 'C')
                       ) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,
  deleted_by           uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  check (visibility = 'shared' or owner_id is not null),
  check (team_min is null or team_max is null or team_min <= team_max),
  check (not (is_free is true and coalesce(fee_amount, 0) > 0))
);
create index on public.opportunities (workspace_id, status, updated_at desc) where deleted_at is null;
create index on public.opportunities using gin (search);
create index on public.opportunities using gin (tags);
create index on public.opportunities using gin (title extensions.gin_trgm_ops);
create index on public.opportunities (owner_id);

create table public.opportunity_dates (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null,
  opportunity_id   uuid not null,
  kind             public.date_kind not null,
  label            text check (char_length(label) <= 100),
  all_day          boolean not null,
  on_date          date,
  at_time          timestamptz,
  source_timezone  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.opportunities (id, workspace_id) on delete cascade,
  check ( (all_day and on_date is not null and at_time is null)
       or (not all_day and at_time is not null and on_date is null and source_timezone is not null) ),
  check (kind <> 'other' or label is not null)
);
create unique index opportunity_dates_one_per_kind
  on public.opportunity_dates (opportunity_id, kind) where kind <> 'other';
create index on public.opportunity_dates (workspace_id, on_date);
create index on public.opportunity_dates (workspace_id, at_time);

create table public.opportunity_sources (
  id                   uuid primary key default gen_random_uuid(),
  workspace_id         uuid not null,
  opportunity_id       uuid not null,
  url                  text not null check (url ~ '^https?://' and char_length(url) <= 2048),
  normalized_url       text not null,
  domain               text not null,
  is_primary           boolean not null default true,
  credibility          public.credibility_level,
  credibility_reason   text,
  credibility_set_by   uuid references public.profiles (id) on delete set null,
  monitor              boolean not null default true,
  last_checked_at      timestamptz,
  last_check_outcome   text,
  last_content_hash    bytea,
  created_at           timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.opportunities (id, workspace_id) on delete cascade,
  unique (opportunity_id, normalized_url)
);
create unique index opportunity_sources_one_primary on public.opportunity_sources (opportunity_id) where is_primary;
create index on public.opportunity_sources (workspace_id, normalized_url);

-- Extraction runs arrive in Phase 3; the FK column is added then.
create table public.opportunity_field_provenance (
  opportunity_id        uuid not null,
  workspace_id          uuid not null,
  field_key             text not null,
  source                public.provenance_source not null,
  status_at_acceptance  public.field_status,
  extraction_run_id     uuid,
  evidence              varchar(500),
  verified_by           uuid references public.profiles (id) on delete set null,
  verified_at           timestamptz not null default now(),
  primary key (opportunity_id, field_key),
  foreign key (opportunity_id, workspace_id)
    references public.opportunities (id, workspace_id) on delete cascade,
  check ((source = 'manual') = (status_at_acceptance is null))
);

create table public.opportunity_field_history (
  id                 bigint generated always as identity primary key,
  workspace_id       uuid not null,
  opportunity_id     uuid not null,
  field_key          text not null,
  old_value          jsonb,
  new_value          jsonb,
  source             public.provenance_source not null,
  extraction_run_id  uuid,
  changed_by         uuid references public.profiles (id) on delete set null,
  changed_at         timestamptz not null default now(),
  foreign key (opportunity_id, workspace_id)
    references public.opportunities (id, workspace_id) on delete cascade
);
create index on public.opportunity_field_history (opportunity_id, changed_at desc);

------------------------------------------------------------------------------------------
-- Generic triggers
------------------------------------------------------------------------------------------
create trigger opportunities_updated_at before update on public.opportunities
  for each row execute function private.set_updated_at();
create trigger opportunities_protect_owner before update on public.opportunities
  for each row execute function private.protect_owner();
create trigger opportunity_dates_updated_at before update on public.opportunity_dates
  for each row execute function private.set_updated_at();

-- Validates the IANA zone stored in the column named by TG_ARGV[0].
create or replace function private.validate_timezone_column()
returns trigger language plpgsql set search_path = '' as $$
declare
  tz text := to_jsonb(new) ->> tg_argv[0];
begin
  if tz is not null and not exists (select 1 from pg_catalog.pg_timezone_names where name = tz) then
    raise exception 'Unknown time zone: %', tz using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger opportunity_dates_tz before insert or update on public.opportunity_dates
  for each row execute function private.validate_timezone_column('source_timezone');

-- Children always live in their parent's workspace (composite FK) — fill workspace_id for clients.
create or replace function private.inherit_opportunity_workspace()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  select o.workspace_id into new.workspace_id from public.opportunities o where o.id = new.opportunity_id;
  return new;
end;
$$;
create trigger opportunity_dates_workspace before insert on public.opportunity_dates
  for each row execute function private.inherit_opportunity_workspace();
create trigger opportunity_sources_workspace before insert on public.opportunity_sources
  for each row execute function private.inherit_opportunity_workspace();

------------------------------------------------------------------------------------------
-- Provenance + history (FR-OPP-11, FR-OPP-12). The source of a change comes from the
-- transaction-local setting app.change_source (default 'manual'); extraction RPCs set it.
------------------------------------------------------------------------------------------
create or replace function private.change_source()
returns public.provenance_source language sql stable set search_path = '' as $$
  select coalesce(nullif(current_setting('app.change_source', true), ''), 'manual')::public.provenance_source;
$$;

create or replace function private.track_opportunity_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  tracked constant text[] := array['type', 'title', 'organizer', 'description', 'official_url',
    'registration_url', 'rules_url', 'rules_text', 'mode', 'location', 'eligibility_text', 'team_min',
    'team_max', 'is_free', 'fee_amount', 'fee_currency', 'prizes', 'benefits', 'required_documents',
    'tracks', 'status'];
  important constant text[] := array['title', 'mode', 'location', 'eligibility_text', 'team_min', 'team_max',
    'is_free', 'fee_amount', 'fee_currency', 'status'];
  empty constant jsonb[] := array['null'::jsonb, '[]'::jsonb, '""'::jsonb];
  src  public.provenance_source := private.change_source();
  run  uuid := nullif(current_setting('app.extraction_run_id', true), '')::uuid;
  n    jsonb := to_jsonb(new);
  o    jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) else '{}'::jsonb end;
  k    text;
begin
  foreach k in array tracked loop
    continue when (n -> k) is not distinct from (o -> k);
    continue when tg_op = 'INSERT' and coalesce(n -> k, 'null'::jsonb) = any (empty);

    if src = 'manual' then
      insert into public.opportunity_field_provenance
        (opportunity_id, workspace_id, field_key, source, verified_by, verified_at)
      values (new.id, new.workspace_id, k, 'manual', (select auth.uid()), now())
      on conflict (opportunity_id, field_key) do update
        set source = 'manual', status_at_acceptance = null, extraction_run_id = null, evidence = null,
            verified_by = excluded.verified_by, verified_at = now();
    end if;

    if k = any (important) then
      insert into public.opportunity_field_history
        (workspace_id, opportunity_id, field_key, old_value, new_value, source, extraction_run_id, changed_by)
      values (new.workspace_id, new.id, k, o -> k, n -> k, src, run, (select auth.uid()));
    end if;
  end loop;
  return null;
end;
$$;
create trigger opportunities_track after insert or update on public.opportunities
  for each row execute function private.track_opportunity_fields();

create or replace function private.track_opportunity_dates()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  src  public.provenance_source := private.change_source();
  run  uuid := nullif(current_setting('app.extraction_run_id', true), '')::uuid;
  rec  public.opportunity_dates := case when tg_op = 'DELETE' then old else new end;
  k    text := case when rec.kind = 'other' then 'other:' || coalesce(rec.label, '') else rec.kind::text end;
  oldv jsonb;
  newv jsonb;
begin
  if tg_op <> 'INSERT' then
    oldv := jsonb_build_object('all_day', old.all_day, 'on_date', old.on_date, 'at_time', old.at_time,
                               'source_timezone', old.source_timezone);
  end if;
  if tg_op <> 'DELETE' then
    newv := jsonb_build_object('all_day', new.all_day, 'on_date', new.on_date, 'at_time', new.at_time,
                               'source_timezone', new.source_timezone);
  end if;
  if oldv is not distinct from newv then
    return null;
  end if;
  -- Skip when the parent is being deleted (cascade).
  if not exists (select 1 from public.opportunities where id = rec.opportunity_id) then
    return null;
  end if;

  insert into public.opportunity_field_history
    (workspace_id, opportunity_id, field_key, old_value, new_value, source, extraction_run_id, changed_by)
  values (rec.workspace_id, rec.opportunity_id, k, oldv, newv, src, run, (select auth.uid()));

  if tg_op = 'DELETE' then
    delete from public.opportunity_field_provenance where opportunity_id = rec.opportunity_id and field_key = k;
  elsif src = 'manual' then
    insert into public.opportunity_field_provenance
      (opportunity_id, workspace_id, field_key, source, verified_by, verified_at)
    values (rec.opportunity_id, rec.workspace_id, k, 'manual', (select auth.uid()), now())
    on conflict (opportunity_id, field_key) do update
      set source = 'manual', status_at_acceptance = null, extraction_run_id = null, evidence = null,
          verified_by = excluded.verified_by, verified_at = now();
  end if;
  return null;
end;
$$;
create trigger opportunity_dates_track after insert or update or delete on public.opportunity_dates
  for each row execute function private.track_opportunity_dates();

------------------------------------------------------------------------------------------
-- Activity (FR-PLAT-09, PRIV-03)
------------------------------------------------------------------------------------------
create or replace function private.log_opportunity_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.workspace_id, 'opportunity.created', 'Added "' || new.title || '"',
      'activity', 'opportunity', new.id, '{}', new.visibility);
  elsif new.deleted_at is not null and old.deleted_at is null then
    perform private.log_activity(new.workspace_id, 'opportunity.deleted', 'Moved "' || new.title || '" to the recycle bin',
      'activity', 'opportunity', new.id, '{}', new.visibility);
  elsif new.deleted_at is null and old.deleted_at is not null then
    perform private.log_activity(new.workspace_id, 'opportunity.restored', 'Restored "' || new.title || '"',
      'activity', 'opportunity', new.id, '{}', new.visibility);
  else
    if new.status is distinct from old.status then
      perform private.log_activity(new.workspace_id, 'opportunity.status_changed',
        '"' || new.title || '" → ' || replace(new.status::text, '_', ' '),
        'activity', 'opportunity', new.id,
        jsonb_build_object('from', old.status, 'to', new.status), new.visibility);
    end if;
    if new.visibility is distinct from old.visibility then
      perform private.log_activity(new.workspace_id,
        case when new.visibility = 'shared' then 'opportunity.shared' else 'opportunity.made_private' end,
        case when new.visibility = 'shared' then 'Shared "' || new.title || '" with the workspace'
             else 'Made "' || new.title || '" private' end,
        'activity', 'opportunity', new.id, '{}', 'shared');
    end if;
  end if;
  return null;
end;
$$;
create trigger opportunities_activity after insert or update on public.opportunities
  for each row execute function private.log_opportunity_activity();

------------------------------------------------------------------------------------------
-- Row Level Security (Schema §28: P2 visibility, P3 inherit)
------------------------------------------------------------------------------------------
alter table public.opportunities enable row level security;
alter table public.opportunity_dates enable row level security;
alter table public.opportunity_sources enable row level security;
alter table public.opportunity_field_provenance enable row level security;
alter table public.opportunity_field_history enable row level security;

create policy opportunities_select on public.opportunities for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
create policy opportunities_insert on public.opportunities for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid()));
create policy opportunities_update on public.opportunities for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));
-- No DELETE policy: soft delete via deleted_at; purge runs as the service role.

create policy opportunity_dates_all on public.opportunity_dates for all to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id))
  with check (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy opportunity_sources_all on public.opportunity_sources for all to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id))
  with check (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy opportunity_provenance_select on public.opportunity_field_provenance for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));
create policy opportunity_history_select on public.opportunity_field_history for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id));

revoke insert, update, delete on public.opportunity_field_provenance, public.opportunity_field_history
  from anon, authenticated;
revoke all on public.opportunities, public.opportunity_dates, public.opportunity_sources from anon;

------------------------------------------------------------------------------------------
-- Save RPC: one transaction for the record, its dates and its first source (security invoker,
-- so RLS applies exactly as for direct table access).
------------------------------------------------------------------------------------------
create or replace function private.normalize_url(p_url text)
returns text language sql immutable set search_path = '' as $$
  select rtrim(lower(regexp_replace(regexp_replace(btrim(p_url), '#.*$', ''), '^https?://(www\.)?', '')), '/');
$$;

create or replace function public.save_opportunity(
  p_id uuid, p_fields jsonb, p_dates jsonb default '[]', p_source_url text default null)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  r     public.opportunities := jsonb_populate_record(null::public.opportunities, p_fields);
  oid   uuid := p_id;
  ws    uuid;
  d     jsonb;
  kinds public.date_kind[] := '{}';
begin
  if p_id is null then
    insert into public.opportunities (workspace_id, owner_id, visibility, type, title, organizer, description,
      official_url, registration_url, rules_url, rules_text, mode, location, eligibility_text, team_min, team_max,
      is_free, fee_amount, fee_currency, prizes, benefits, required_documents, tracks, tags, status)
    values (private.current_workspace_id(), (select auth.uid()), coalesce(r.visibility, 'shared'), r.type,
      btrim(r.title), r.organizer, r.description, r.official_url, r.registration_url, r.rules_url, r.rules_text,
      coalesce(r.mode, 'unknown'), r.location, r.eligibility_text, r.team_min, r.team_max, r.is_free,
      r.fee_amount, coalesce(r.fee_currency, 'INR'), r.prizes, r.benefits,
      coalesce(r.required_documents, '{}'), coalesce(r.tracks, '{}'), coalesce(r.tags, '{}'),
      coalesce(r.status, 'saved'))
    returning id, workspace_id into oid, ws;
  else
    update public.opportunities set
      visibility = coalesce(r.visibility, visibility), type = coalesce(r.type, type), title = btrim(r.title),
      organizer = r.organizer, description = r.description, official_url = r.official_url,
      registration_url = r.registration_url, rules_url = r.rules_url, rules_text = r.rules_text,
      mode = coalesce(r.mode, 'unknown'), location = r.location, eligibility_text = r.eligibility_text,
      team_min = r.team_min, team_max = r.team_max, is_free = r.is_free, fee_amount = r.fee_amount,
      fee_currency = coalesce(r.fee_currency, 'INR'), prizes = r.prizes, benefits = r.benefits,
      required_documents = coalesce(r.required_documents, '{}'), tracks = coalesce(r.tracks, '{}'),
      tags = coalesce(r.tags, '{}'), status = coalesce(r.status, status)
    where id = p_id and deleted_at is null
    returning workspace_id into ws;
    if not found then
      raise exception 'Opportunity not found' using errcode = 'P0002';
    end if;
  end if;

  -- Dates: one row per standard kind; kinds missing from the payload are removed.
  for d in select * from jsonb_array_elements(coalesce(p_dates, '[]')) loop
    if d ->> 'kind' = 'other' then
      raise exception 'Use a standard date kind' using errcode = '22023';
    end if;
    kinds := kinds || (d ->> 'kind')::public.date_kind;
    insert into public.opportunity_dates (workspace_id, opportunity_id, kind, all_day, on_date, at_time, source_timezone)
    values (ws, oid, (d ->> 'kind')::public.date_kind, (d ->> 'all_day')::boolean, (d ->> 'on_date')::date,
            (d ->> 'at_time')::timestamptz, nullif(d ->> 'source_timezone', ''))
    on conflict (opportunity_id, kind) where kind <> 'other' do update
      set all_day = excluded.all_day, on_date = excluded.on_date, at_time = excluded.at_time,
          source_timezone = excluded.source_timezone
      where (public.opportunity_dates.all_day, public.opportunity_dates.on_date, public.opportunity_dates.at_time,
             public.opportunity_dates.source_timezone)
            is distinct from (excluded.all_day, excluded.on_date, excluded.at_time, excluded.source_timezone);
  end loop;
  delete from public.opportunity_dates where opportunity_id = oid and kind <> all (kinds) and kind <> 'other';

  if nullif(btrim(p_source_url), '') is not null then
    insert into public.opportunity_sources (workspace_id, opportunity_id, url, normalized_url, domain, is_primary)
    values (ws, oid, btrim(p_source_url), private.normalize_url(p_source_url),
            lower(substring(btrim(p_source_url) from '^https?://([^/:?#]+)')),
            not exists (select 1 from public.opportunity_sources where opportunity_id = oid and is_primary))
    on conflict (opportunity_id, normalized_url) do nothing;
  end if;

  return oid;
end;
$$;
revoke all on function public.save_opportunity from public, anon;
grant execute on function public.save_opportunity to authenticated;
grant execute on function private.normalize_url(text) to authenticated;
