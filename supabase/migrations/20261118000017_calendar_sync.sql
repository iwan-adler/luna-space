-- Migration 0017 — private calendar subscription link (ICS) for Google Calendar and phones
-- (FR-CAL sync; ADR 0013). One link per person; only its SHA-256 hash is stored. The
-- calendar-ics Edge Function resolves the link with the service role and serves text/calendar.

create table public.calendar_feed_tokens (
  user_id      uuid primary key references public.profiles (id) on delete cascade,
  token_hash   bytea not null unique check (octet_length(token_hash) = 32),
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);
alter table public.calendar_feed_tokens enable row level security;
create policy calendar_feed_tokens_own on public.calendar_feed_tokens for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.calendar_feed_tokens from anon, authenticated;
grant select (user_id, created_at, last_used_at) on public.calendar_feed_tokens to authenticated;
grant all on public.calendar_feed_tokens to service_role;

-- Creates (or replaces) the caller's link; the plain token is returned once.
create or replace function public.create_calendar_feed_token()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := (select auth.uid());
  token text;
begin
  if uid is null or private.current_workspace_id() is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  if not private.consume_rate_limit('calendar_feed.create', 10, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.calendar_feed_tokens (user_id, token_hash)
  values (uid, extensions.digest(token, 'sha256'))
  on conflict (user_id) do update set token_hash = excluded.token_hash, created_at = now(), last_used_at = null;
  return jsonb_build_object('ok', true, 'token', token);
end;
$$;

create or replace function public.revoke_calendar_feed_token()
returns void language sql security definer set search_path = '' as $$
  delete from public.calendar_feed_tokens where user_id = (select auth.uid());
$$;

-- Everything the link's owner may see, from 60 days ago to two years ahead, mirroring the RLS
-- policies of each table (the owner's workspace; shared items or the owner's private ones).
create or replace function public.calendar_feed_for_token(p_token text)
returns table (source_type text, source_id uuid, parent_id uuid, title text, kind text, all_day boolean,
               start_date date, end_date date, starts_at timestamptz, ends_at timestamptz, timezone text,
               rrule text, exdates date[], location text, description text, updated_at timestamptz)
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid;
  ws  uuid;
begin
  if p_token is null or char_length(p_token) not between 20 and 100 then
    raise exception 'Unknown calendar link' using errcode = 'P0002';
  end if;
  update public.calendar_feed_tokens set last_used_at = now()
   where token_hash = extensions.digest(p_token, 'sha256')
  returning user_id into uid;
  if uid is null then
    raise exception 'Unknown calendar link' using errcode = 'P0002';
  end if;
  select m.workspace_id into ws from public.workspace_members m where m.user_id = uid;
  if ws is null then
    return;
  end if;

  return query
  select 'event'::text, e.id, null::uuid, e.title, e.kind::text, e.all_day, e.start_date, e.end_date,
         e.starts_at, e.ends_at, e.timezone, e.rrule, e.exdates, e.location, e.description, e.updated_at
    from public.calendar_events e
   where e.workspace_id = ws and e.deleted_at is null and (e.visibility = 'shared' or e.owner_id = uid)
     and (e.rrule is not null
          or coalesce(e.end_date, e.start_date, (e.starts_at at time zone 'UTC')::date) >= current_date - 60)
     and coalesce(e.start_date, (e.starts_at at time zone 'UTC')::date) <= current_date + 730
  union all
  select 'opportunity_date', d.id, o.id, o.title || ' — ' || replace(d.kind::text, '_', ' '), 'deadline',
         d.all_day, d.on_date, d.on_date, d.at_time, d.at_time, d.source_timezone, null, null, null,
         o.official_url, o.updated_at
    from public.opportunity_dates d join public.opportunities o on o.id = d.opportunity_id
   where o.workspace_id = ws and o.deleted_at is null and (o.visibility = 'shared' or o.owner_id = uid)
     and coalesce(d.on_date, (d.at_time at time zone 'UTC')::date) between current_date - 60 and current_date + 730
  union all
  select 'task', t.id, t.project_id, 'Task: ' || t.title, 'task_due', t.due_at is null, t.due_date, t.due_date,
         t.due_at, t.due_at, t.due_timezone, null, null, null, null, t.updated_at
    from public.tasks t
    left join public.projects p on p.id = t.project_id
   where t.workspace_id = ws and t.deleted_at is null and t.status <> 'done'
     and (t.due_date is not null or t.due_at is not null)
     and (case when t.project_id is null then (t.visibility = 'shared' or t.owner_id = uid)
               else p.deleted_at is null and (p.visibility = 'shared' or p.owner_id = uid) end)
     and coalesce(t.due_date, (t.due_at at time zone 'UTC')::date) between current_date - 60 and current_date + 730
  union all
  select 'project_end', p.id, p.id, p.name || ' — project end', 'milestone', true, p.end_date, p.end_date,
         null, null, null, null, null, null, null, p.updated_at
    from public.projects p
   where p.workspace_id = ws and p.deleted_at is null and p.end_date is not null
     and (p.visibility = 'shared' or p.owner_id = uid)
     and p.end_date between current_date - 60 and current_date + 730;
end;
$$;

revoke all on function public.create_calendar_feed_token, public.revoke_calendar_feed_token from public, anon;
grant execute on function public.create_calendar_feed_token, public.revoke_calendar_feed_token to authenticated;
revoke all on function public.calendar_feed_for_token from public, anon, authenticated;
grant execute on function public.calendar_feed_for_token to service_role;
