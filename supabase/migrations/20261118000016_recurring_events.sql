-- Migration 0016 — repeating calendar events (FR-CAL-06; ADR 0012).
-- An RFC 5545 subset in a fixed order, as the app writes it:
--   FREQ=DAILY|WEEKLY|MONTHLY [;INTERVAL=n] [;BYDAY=MO,TU,…] [;UNTIL=YYYYMMDD | ;COUNT=n]
-- Occurrences are expanded on read (client) and for reminders (SQL, next 60 days, refreshed daily).

alter table public.calendar_events
  add constraint calendar_events_rrule_format check (
    rrule is null or rrule ~ (
      '^FREQ=(DAILY|WEEKLY|MONTHLY)'
      || '(;INTERVAL=([1-9]|[12][0-9]|30))?'
      || '(;BYDAY=(MO|TU|WE|TH|FR|SA|SU)(,(MO|TU|WE|TH|FR|SA|SU)){0,6})?'
      || '(;(UNTIL=[0-9]{8}|COUNT=([1-9]|[1-9][0-9]|[12][0-9]{2}|3[0-5][0-9]|36[0-6])))?$')),
  add constraint calendar_events_exdates_limit check (cardinality(exdates) <= 366);

create or replace function private.rrule_part(p_rrule text, p_key text)
returns text language sql immutable set search_path = '' as $$
  select substring(p_rrule from '(?:^|;)' || p_key || '=([^;]+)');
$$;

-- Local dates on which a repeating series occurs between p_from and p_to (inclusive).
-- p_anchor is the first occurrence's local date; weekly rules without BYDAY repeat on its weekday.
create or replace function private.occurrence_dates(p_anchor date, p_rrule text, p_exdates date[],
                                                    p_from date, p_to date)
returns setof date language plpgsql stable set search_path = '' as $$
declare
  freq     text := private.rrule_part(p_rrule, 'FREQ');
  step     integer := coalesce(private.rrule_part(p_rrule, 'INTERVAL')::integer, 1);
  days     text[] := string_to_array(private.rrule_part(p_rrule, 'BYDAY'), ',');
  until_d  date := to_date(private.rrule_part(p_rrule, 'UNTIL'), 'YYYYMMDD');
  max_n    integer := private.rrule_part(p_rrule, 'COUNT')::integer;
  codes    text[] := array['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
  last_d   date := least(p_to, coalesce(until_d, p_to), p_anchor + 3660);
begin
  if p_rrule is null then
    if p_anchor between p_from and p_to then
      return next p_anchor;
    end if;
    return;
  end if;
  if days is null then
    days := array[codes[extract(isodow from p_anchor)::integer]];
  end if;
  return query
    with series as (
      select d::date as d
        from generate_series(p_anchor, last_d, interval '1 day') as d
       where case freq
               when 'DAILY' then (d::date - p_anchor) % step = 0
               when 'WEEKLY' then
                 ((date_trunc('week', d)::date - date_trunc('week', p_anchor)::date) / 7) % step = 0
                 and codes[extract(isodow from d)::integer] = any (days)
               when 'MONTHLY' then
                 extract(day from d) = extract(day from p_anchor)
                 and ((extract(year from d) - extract(year from p_anchor)) * 12
                      + extract(month from d) - extract(month from p_anchor))::integer % step = 0
               else false
             end
       order by 1),
    numbered as (select s.d, row_number() over (order by s.d) as n from series s)
    select x.d from numbered x
     where (max_n is null or x.n <= max_n)
       and x.d between p_from and p_to
       and not (x.d = any (coalesce(p_exdates, '{}')));
end;
$$;

-- Event reminders now cover every occurrence in the next 60 days (refreshed daily for repeats).
create or replace function private.sync_event_reminders(p_event uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.calendar_events%rowtype;
  anchor date;
  local_t time;
begin
  delete from public.reminders where event_id = p_event and origin = 'default' and status = 'pending';
  select * into e from public.calendar_events where id = p_event;
  if not found or e.deleted_at is not null or cardinality(e.reminder_offsets) = 0 then
    return;
  end if;
  anchor := coalesce(e.start_date, (e.starts_at at time zone e.timezone)::date);
  local_t := case when e.all_day then null else (e.starts_at at time zone e.timezone)::time end;
  insert into public.reminders (workspace_id, user_id, origin, event_id, remind_at, title, link_path, dedupe_key)
  select e.workspace_id, a.user_id, 'default', e.id, x.remind_at,
         left(e.title || ' ' || x.label, 200),
         '/calendar?date=' || o.d,
         'ev:' || e.id || ':' || a.user_id || ':' || extract(epoch from x.remind_at)::bigint
    from private.occurrence_dates(anchor, e.rrule, e.exdates, current_date - 1, current_date + 60) as o(d)
    cross join private.audience(e.workspace_id, e.visibility, e.owner_id) as a(user_id)
    cross join lateral private.reminder_settings(a.user_id) s
    cross join lateral (
      select case when e.all_day then ((o.d + time '09:00') at time zone s.tz) - make_interval(mins => m)
                  else ((o.d + local_t) at time zone e.timezone) - make_interval(mins => m) end as remind_at,
             case when e.all_day and m = 0 then 'is today'
                  when m = 0 then 'starts now'
                  else 'starts ' || private.lead_label(m) end as label
        from unnest(e.reminder_offsets) as m) x
   where x.remind_at > now()
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function private.refresh_recurring_reminders()
returns void language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
begin
  for rid in select id from public.calendar_events
              where rrule is not null and deleted_at is null and cardinality(reminder_offsets) > 0 loop
    perform private.sync_event_reminders(rid);
  end loop;
end;
$$;
select cron.schedule('refresh-recurring-reminders', '17 2 * * *', 'select private.refresh_recurring_reminders()');

-- The feed carries the rule so the app can draw each occurrence (columns added at the end).
create or replace view public.calendar_feed with (security_invoker = true) as
  select 'event'::text as source_type, e.id as source_id, null::uuid as parent_id, e.workspace_id,
         e.title, e.kind::text as kind, e.all_day, e.start_date, e.end_date, e.starts_at, e.ends_at,
         e.timezone, e.visibility, e.owner_id, e.rrule, e.exdates
    from public.calendar_events e where e.deleted_at is null
  union all
  select 'opportunity_date', d.id, o.id, d.workspace_id,
         o.title || ' — ' || replace(d.kind::text, '_', ' '), 'deadline', d.all_day, d.on_date, d.on_date,
         d.at_time, d.at_time, d.source_timezone, o.visibility, o.owner_id, null::text, null::date[]
    from public.opportunity_dates d join public.opportunities o on o.id = d.opportunity_id
   where o.deleted_at is null
  union all
  select 'task', t.id, t.project_id, t.workspace_id, t.title, 'task_due', t.due_at is null, t.due_date,
         t.due_date, t.due_at, t.due_at, t.due_timezone, t.visibility, t.owner_id, null::text, null::date[]
    from public.tasks t
   where t.deleted_at is null and t.status <> 'done' and (t.due_date is not null or t.due_at is not null)
  union all
  select 'project_end', p.id, p.id, p.workspace_id, p.name || ' — project end', 'milestone', true,
         p.end_date, p.end_date, null, null, null, p.visibility, p.owner_id, null::text, null::date[]
    from public.projects p where p.deleted_at is null and p.end_date is not null
  union all
  select 'checklist_item', i.id, c.project_id, i.workspace_id, i.label, 'milestone', true, i.due_date,
         i.due_date, null, null, null, 'shared'::public.visibility, null::uuid, null::text, null::date[]
    from public.checklist_items i join public.checklists c on c.id = i.checklist_id
   where i.due_date is not null and not i.is_done and c.deleted_at is null;

revoke all on public.calendar_feed from anon, authenticated;
grant select on public.calendar_feed to authenticated;
grant all on public.calendar_feed to service_role;
revoke all on function private.rrule_part, private.occurrence_dates, private.refresh_recurring_reminders
  from public, anon, authenticated;
