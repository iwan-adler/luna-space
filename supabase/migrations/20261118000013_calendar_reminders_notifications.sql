-- Migration 0013 — calendar events, calendar feed, reminders and in-app notifications
-- (Schema §19, §26; FR-CAL-01–05, FR-AUTO-01, FR-PLAT-07, FR-GUEST-12; AC-18, AC-19).
-- Web Push (push_subscriptions, dispatch to devices) follows in Phase 5b.
-- Privileges are granted explicitly: hosted projects do not add default grants (ADR 0007 note in
-- migration 0012).

------------------------------------------------------------------------------------------
-- Calendar events
------------------------------------------------------------------------------------------
create table public.calendar_events (
  id               uuid primary key default gen_random_uuid(),
  workspace_id     uuid not null references public.workspaces (id) on delete cascade,
  owner_id         uuid references public.profiles (id) on delete set null,
  visibility       public.visibility not null default 'shared',
  kind             public.event_kind not null default 'other',
  title            text not null check (char_length(btrim(title)) between 1 and 200),
  description      text check (char_length(description) <= 5000),
  location         text check (char_length(location) <= 300),
  all_day          boolean not null default false,
  start_date       date,
  end_date         date,
  starts_at        timestamptz,
  ends_at          timestamptz,
  timezone         text,
  rrule            text,                                   -- R2
  exdates          date[] not null default '{}',           -- R2
  reminder_offsets integer[] not null default '{}'
                   check (reminder_offsets <@ array[0, 15, 30, 60, 120, 1440, 2880, 4320, 10080]),
  project_id       uuid,
  opportunity_id   uuid,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz,
  deleted_by       uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete set null (project_id),
  foreign key (opportunity_id, workspace_id) references public.opportunities (id, workspace_id) on delete set null (opportunity_id),
  check (visibility = 'shared' or owner_id is not null),
  check (
    (all_day and start_date is not null and starts_at is null and ends_at is null
             and (end_date is null or end_date >= start_date))
    or
    (not all_day and starts_at is not null and timezone is not null and start_date is null and end_date is null
             and (ends_at is null or ends_at >= starts_at))
  )
);
create index on public.calendar_events (workspace_id, start_date) where deleted_at is null;
create index on public.calendar_events (workspace_id, starts_at) where deleted_at is null;

create trigger calendar_events_updated_at before update on public.calendar_events
  for each row execute function private.set_updated_at();
create trigger calendar_events_protect_owner before update on public.calendar_events
  for each row execute function private.protect_owner();
create trigger calendar_events_tz before insert or update on public.calendar_events
  for each row execute function private.validate_timezone_column('timezone');

alter table public.calendar_events enable row level security;
create policy calendar_events_select on public.calendar_events for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
create policy calendar_events_insert on public.calendar_events for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid()));
create policy calendar_events_update on public.calendar_events for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));

-- Calendar feed: derived items are read from their source, never copied (DB7, FR-CAL-03).
-- security_invoker: every underlying table's RLS applies to the reader.
create view public.calendar_feed with (security_invoker = true) as
  select 'event'::text as source_type, e.id as source_id, null::uuid as parent_id, e.workspace_id,
         e.title, e.kind::text as kind, e.all_day, e.start_date, e.end_date, e.starts_at, e.ends_at,
         e.timezone, e.visibility, e.owner_id
    from public.calendar_events e where e.deleted_at is null
  union all
  select 'opportunity_date', d.id, o.id, d.workspace_id,
         o.title || ' — ' || replace(d.kind::text, '_', ' '), 'deadline', d.all_day, d.on_date, d.on_date,
         d.at_time, d.at_time, d.source_timezone, o.visibility, o.owner_id
    from public.opportunity_dates d join public.opportunities o on o.id = d.opportunity_id
   where o.deleted_at is null
  union all
  select 'task', t.id, t.project_id, t.workspace_id, t.title, 'task_due', t.due_at is null, t.due_date,
         t.due_date, t.due_at, t.due_at, t.due_timezone, t.visibility, t.owner_id
    from public.tasks t
   where t.deleted_at is null and t.status <> 'done' and (t.due_date is not null or t.due_at is not null)
  union all
  select 'project_end', p.id, p.id, p.workspace_id, p.name || ' — project end', 'milestone', true,
         p.end_date, p.end_date, null, null, null, p.visibility, p.owner_id
    from public.projects p where p.deleted_at is null and p.end_date is not null
  union all
  select 'checklist_item', i.id, c.project_id, i.workspace_id, i.label, 'milestone', true, i.due_date,
         i.due_date, null, null, null, 'shared'::public.visibility, null::uuid
    from public.checklist_items i join public.checklists c on c.id = i.checklist_id
   where i.due_date is not null and not i.is_done and c.deleted_at is null;

------------------------------------------------------------------------------------------
-- Preferences, reminders, notifications
------------------------------------------------------------------------------------------
create table public.notification_preferences (
  user_id                uuid primary key references public.profiles (id) on delete cascade,
  push_enabled           boolean not null default false,
  email_enabled          boolean not null default false,
  quiet_start            time not null default '23:00',
  quiet_end              time not null default '07:00',
  lockscreen_details     boolean not null default true,
  deadline_reminder_days smallint[] not null default '{7,1,0}'
                         check (deadline_reminder_days <@ array[0, 1, 2, 3, 7, 14]::smallint[]),
  timed_reminder_minutes integer[] not null default '{1440,60}'
                         check (timed_reminder_minutes <@ array[0, 15, 30, 60, 120, 1440, 2880, 10080]),
  type_settings          jsonb not null default '{}' check (jsonb_typeof(type_settings) = 'object'),
  updated_at             timestamptz not null default now()
);
create trigger notification_preferences_updated_at before update on public.notification_preferences
  for each row execute function private.set_updated_at();

create table public.reminders (
  id                  uuid primary key default gen_random_uuid(),
  workspace_id        uuid not null references public.workspaces (id) on delete cascade,
  user_id             uuid not null references public.profiles (id) on delete cascade,
  origin              text not null check (origin in ('default', 'custom')),
  opportunity_date_id uuid references public.opportunity_dates (id) on delete cascade,
  task_id             uuid references public.tasks (id) on delete cascade,
  event_id            uuid references public.calendar_events (id) on delete cascade,
  checklist_item_id   uuid references public.checklist_items (id) on delete cascade,
  remind_at           timestamptz not null,
  title               text not null check (char_length(title) <= 200),
  link_path           text not null check (link_path like '/%'),
  status              text not null default 'pending'
                      check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts            smallint not null default 0,
  sent_at             timestamptz,
  last_error          text,
  dedupe_key          text not null unique,
  created_at          timestamptz not null default now(),
  check (num_nonnulls(opportunity_date_id, task_id, event_id, checklist_item_id) <= 1)
);
create index reminders_due on public.reminders (remind_at) where status = 'pending';
create index on public.reminders (user_id, remind_at) where status = 'pending';

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  type         text not null,
  title        text not null check (char_length(title) <= 200),
  body         text check (char_length(body) <= 1000),
  link_path    text check (link_path like '/%'),
  actor_id     uuid references public.profiles (id) on delete set null,
  entity_type  text,
  entity_id    uuid,
  dedupe_key   text not null,
  read_at      timestamptz,
  pushed_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (recipient_id, dedupe_key)
);
create index on public.notifications (recipient_id, created_at desc);
create index on public.notifications (recipient_id) where read_at is null;

alter table public.notification_preferences enable row level security;
alter table public.reminders enable row level security;
alter table public.notifications enable row level security;

create policy notification_preferences_own on public.notification_preferences for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reminders_own on public.reminders for select to authenticated
  using (user_id = (select auth.uid()));
create policy notifications_own_select on public.notifications for select to authenticated
  using (recipient_id = (select auth.uid()));
create policy notifications_own_update on public.notifications for update to authenticated
  using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));

------------------------------------------------------------------------------------------
-- Reminder generation (Schema §26)
------------------------------------------------------------------------------------------
-- Who should be reminded about a workspace item: its owner when private, both members when shared.
create or replace function private.audience(p_workspace uuid, p_visibility public.visibility, p_owner uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select m.user_id from public.workspace_members m
   where m.workspace_id = p_workspace and (p_visibility = 'shared' or m.user_id = p_owner);
$$;

create or replace function private.reminder_settings(p_user uuid, out days smallint[], out minutes integer[], out tz text)
language sql stable security definer set search_path = '' as $$
  select coalesce(np.deadline_reminder_days, '{7,1,0}'::smallint[]),
         coalesce(np.timed_reminder_minutes, '{1440,60}'::integer[]),
         coalesce(p.timezone, 'Asia/Kolkata')
    from public.profiles p left join public.notification_preferences np on np.user_id = p.id
   where p.id = p_user;
$$;

create or replace function private.lead_label(p_minutes integer)
returns text language sql immutable set search_path = '' as $$
  select case
    when p_minutes = 0 then 'now'
    when p_minutes % 1440 = 0 then 'in ' || (p_minutes / 1440) || case when p_minutes = 1440 then ' day' else ' days' end
    when p_minutes % 60 = 0 then 'in ' || (p_minutes / 60) || case when p_minutes = 60 then ' hour' else ' hours' end
    else 'in ' || p_minutes || ' minutes' end;
$$;

-- When reminders fire. Date-only values: 09:00 in the person's zone, N days before (AC-19).
-- Timed values: N minutes before the instant.
create or replace function private.reminder_times(p_all_day boolean, p_date date, p_at timestamptz, p_tz text,
                                                  p_days smallint[], p_minutes integer[])
returns table (remind_at timestamptz, label text) language sql stable set search_path = '' as $$
  select ((p_date - n) + time '09:00') at time zone p_tz,
         case n when 0 then 'today' when 1 then 'tomorrow' else 'in ' || n || ' days' end
    from unnest(p_days) as n
   where p_all_day and p_date is not null
  union all
  select p_at - make_interval(mins => m), private.lead_label(m)
    from unnest(p_minutes) as m
   where not p_all_day and p_at is not null;
$$;

create or replace function private.sync_opportunity_date_reminders(p_date uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  d public.opportunity_dates%rowtype;
  o public.opportunities%rowtype;
begin
  delete from public.reminders where opportunity_date_id = p_date and origin = 'default' and status = 'pending';
  select * into d from public.opportunity_dates where id = p_date;
  if not found or d.kind not in ('registration_deadline', 'submission_deadline') then
    return;
  end if;
  select * into o from public.opportunities where id = d.opportunity_id;
  if o.deleted_at is not null
     or o.status not in ('interested', 'planning', 'registered', 'in_progress', 'submitted') then
    return;                                       -- FR-AUTO-01: interested or later, not closed
  end if;
  insert into public.reminders (workspace_id, user_id, origin, opportunity_date_id, remind_at, title,
                                link_path, dedupe_key)
  select o.workspace_id, a.user_id, 'default', d.id, r.remind_at,
         left(o.title || ': ' || replace(d.kind::text, '_', ' ') || ' ' || r.label, 200),
         '/opportunities/' || o.id,
         'od:' || d.id || ':' || a.user_id || ':' || extract(epoch from r.remind_at)::bigint
    from private.audience(o.workspace_id, o.visibility, o.owner_id) as a(user_id)
    cross join lateral private.reminder_settings(a.user_id) s
    cross join lateral private.reminder_times(d.all_day, d.on_date, d.at_time, s.tz, s.days, s.minutes) r
   where r.remind_at > now()
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function private.task_link(p_task public.tasks, p_user uuid)
returns text language sql stable security definer set search_path = '' as $$
  select case
    when p_task.project_id is null then '/tasks'
    when exists (select 1 from public.workspace_members m
                  where m.workspace_id = p_task.workspace_id and m.user_id = p_user)
      then '/projects/' || p_task.project_id || '/board?task=' || p_task.id
    else '/guest/rooms/' || p_task.project_id || '/board?task=' || p_task.id end;
$$;

create or replace function private.sync_task_reminders(p_task uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks%rowtype;
begin
  delete from public.reminders where task_id = p_task and origin = 'default' and status = 'pending';
  select * into t from public.tasks where id = p_task;
  if not found or t.deleted_at is not null or t.status = 'done' or t.assignee_id is null
     or (t.due_date is null and t.due_at is null) then
    return;
  end if;
  insert into public.reminders (workspace_id, user_id, origin, task_id, remind_at, title, link_path, dedupe_key)
  select t.workspace_id, t.assignee_id, 'default', t.id, r.remind_at,
         left('Task due ' || r.label || ': ' || t.title, 200),
         private.task_link(t, t.assignee_id),
         'tk:' || t.id || ':' || t.assignee_id || ':' || extract(epoch from r.remind_at)::bigint
    from private.reminder_settings(t.assignee_id) s
    cross join lateral private.reminder_times(t.due_at is null, t.due_date, t.due_at, s.tz,
                                              '{1,0}'::smallint[], s.minutes) r
   where r.remind_at > now()
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function private.sync_event_reminders(p_event uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  e public.calendar_events%rowtype;
begin
  delete from public.reminders where event_id = p_event and origin = 'default' and status = 'pending';
  select * into e from public.calendar_events where id = p_event;
  if not found or e.deleted_at is not null or cardinality(e.reminder_offsets) = 0 then
    return;
  end if;
  insert into public.reminders (workspace_id, user_id, origin, event_id, remind_at, title, link_path, dedupe_key)
  select e.workspace_id, a.user_id, 'default', e.id, x.remind_at,
         left(e.title || ' ' || x.label, 200),
         '/calendar?date=' || coalesce(e.start_date, (e.starts_at at time zone s.tz)::date),
         'ev:' || e.id || ':' || a.user_id || ':' || extract(epoch from x.remind_at)::bigint
    from private.audience(e.workspace_id, e.visibility, e.owner_id) as a(user_id)
    cross join lateral private.reminder_settings(a.user_id) s
    cross join lateral (
      select case when e.all_day then ((e.start_date + time '09:00') at time zone s.tz) - make_interval(mins => m)
                  else e.starts_at - make_interval(mins => m) end as remind_at,
             case when e.all_day and m = 0 then 'is today'
                  when m = 0 then 'starts now'
                  else 'starts ' || private.lead_label(m) end as label
        from unnest(e.reminder_offsets) as m) x
   where x.remind_at > now()
  on conflict (dedupe_key) do nothing;
end;
$$;

-- Re-plans everything in a workspace (a partner joined, a zone or preference changed).
create or replace function private.resync_workspace_reminders(p_workspace uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  rid uuid;
begin
  for rid in select d.id from public.opportunity_dates d where d.workspace_id = p_workspace loop
    perform private.sync_opportunity_date_reminders(rid);
  end loop;
  for rid in select t.id from public.tasks t
              where t.workspace_id = p_workspace and t.deleted_at is null and t.assignee_id is not null loop
    perform private.sync_task_reminders(rid);
  end loop;
  for rid in select e.id from public.calendar_events e where e.workspace_id = p_workspace and e.deleted_at is null loop
    perform private.sync_event_reminders(rid);
  end loop;
end;
$$;

create or replace function private.on_opportunity_date_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.sync_opportunity_date_reminders(new.id);
  return null;
end;
$$;
create trigger opportunity_dates_reminders after insert or update on public.opportunity_dates
  for each row execute function private.on_opportunity_date_change();

create or replace function private.on_opportunity_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  did uuid;
begin
  for did in select id from public.opportunity_dates where opportunity_id = new.id loop
    perform private.sync_opportunity_date_reminders(did);
  end loop;
  return null;
end;
$$;
create trigger opportunities_reminders
  after update of status, visibility, deleted_at, title on public.opportunities
  for each row execute function private.on_opportunity_change();

create or replace function private.on_task_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.sync_task_reminders(new.id);
  return null;
end;
$$;
create trigger tasks_reminders
  after insert or update of due_date, due_at, assignee_id, status, deleted_at, title on public.tasks
  for each row execute function private.on_task_change();

create or replace function private.on_event_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.sync_event_reminders(new.id);
  return null;
end;
$$;
create trigger calendar_events_reminders after insert or update on public.calendar_events
  for each row execute function private.on_event_change();

create or replace function private.on_reminder_context_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ws uuid;
begin
  select workspace_id into ws from public.workspace_members
   where user_id = coalesce(to_jsonb(new) ->> 'user_id', to_jsonb(new) ->> 'id')::uuid;
  if ws is not null then
    perform private.resync_workspace_reminders(ws);
  end if;
  return null;
end;
$$;
create trigger workspace_members_reminders after insert on public.workspace_members
  for each row execute function private.on_reminder_context_change();
create trigger profiles_timezone_reminders after update of timezone on public.profiles
  for each row when (old.timezone is distinct from new.timezone)
  execute function private.on_reminder_context_change();
create trigger notification_preferences_reminders
  after insert or update of deadline_reminder_days, timed_reminder_minutes on public.notification_preferences
  for each row execute function private.on_reminder_context_change();

------------------------------------------------------------------------------------------
-- Delivery: due reminders become notifications, at most once each (AC-19)
------------------------------------------------------------------------------------------
create or replace function private.dispatch_reminders(p_limit integer default 500)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  r public.reminders%rowtype;
  n integer := 0;
begin
  for r in select * from public.reminders
            where status = 'pending' and remind_at <= now()
            order by remind_at limit p_limit
            for update skip locked loop
    insert into public.notifications (workspace_id, recipient_id, type, title, link_path, entity_type,
                                      entity_id, dedupe_key)
    values (r.workspace_id, r.user_id, 'reminder.due', r.title, r.link_path,
            case when r.task_id is not null then 'task' when r.event_id is not null then 'event'
                 when r.opportunity_date_id is not null then 'opportunity_date' else 'checklist_item' end,
            coalesce(r.task_id, r.event_id, r.opportunity_date_id, r.checklist_item_id),
            'rem:' || r.dedupe_key)
    on conflict (recipient_id, dedupe_key) do nothing;
    update public.reminders set status = 'sent', sent_at = now(), attempts = attempts + 1 where id = r.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

-- Every minute. cron.schedule with an existing name replaces the job.
select cron.schedule('dispatch-reminders', '* * * * *', 'select private.dispatch_reminders()');

------------------------------------------------------------------------------------------
-- Event notifications: assignments, comments, guest changes (FR-GUEST-12)
------------------------------------------------------------------------------------------
create or replace function private.notify(p_workspace uuid, p_recipient uuid, p_type text, p_title text,
                                          p_link text, p_entity_type text, p_entity_id uuid, p_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_recipient is null or p_recipient = (select auth.uid()) then
    return;                                       -- nobody is notified about their own actions
  end if;
  insert into public.notifications (workspace_id, recipient_id, type, title, link_path, actor_id,
                                    entity_type, entity_id, dedupe_key)
  values (p_workspace, p_recipient, p_type, left(p_title, 200), p_link, (select auth.uid()),
          p_entity_type, p_entity_id, p_key)
  on conflict (recipient_id, dedupe_key) do nothing;
end;
$$;

create or replace function private.actor_name()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select display_name from public.profiles where id = (select auth.uid())), 'Someone');
$$;

create or replace function private.on_task_assigned()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.workspace_id, new.assignee_id, 'task.assigned',
    private.actor_name() || ' assigned you "' || left(new.title, 120) || '"',
    private.task_link(new, new.assignee_id), 'task', new.id,
    'ta:' || new.id || ':' || new.assignee_id || ':' || extract(epoch from now())::bigint);
  return null;
end;
$$;
create trigger tasks_notify_assigned after insert or update of assignee_id on public.tasks
  for each row when (new.assignee_id is not null and new.parent_task_id is null)
  execute function private.on_task_assigned();

create or replace function private.on_task_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  t public.tasks%rowtype;
  who uuid;
begin
  select * into t from public.tasks where id = new.task_id;
  for who in select distinct x from unnest(array[t.assignee_id, t.owner_id]) as x where x is not null loop
    perform private.notify(t.workspace_id, who, 'task.comment',
      private.actor_name() || ' commented on "' || left(t.title, 120) || '"',
      private.task_link(t, who), 'task', t.id, 'tc:' || new.id || ':' || who);
  end loop;
  return null;
end;
$$;
create trigger task_comments_notify after insert on public.task_comments
  for each row execute function private.on_task_comment();

create or replace function private.on_guest_membership_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  room text := (select name from public.projects where id = new.project_id);
begin
  if new.removed_at is not null and old.removed_at is null and new.removal_reason = 'removed' then
    perform private.notify(new.workspace_id, new.user_id, 'guest.removed',
      'You were removed from "' || room || '"', '/guest', 'project', new.project_id, 'gr:' || new.id);
  elsif new.role is distinct from old.role then
    perform private.notify(new.workspace_id, new.user_id, 'guest.role_changed',
      'You are now a ' || replace(new.role::text, '_', ' ') || ' in "' || room || '"',
      '/guest/rooms/' || new.project_id || '/overview', 'project', new.project_id,
      'gc:' || new.id || ':' || extract(epoch from now())::bigint);
  end if;
  return null;
end;
$$;
create trigger guest_memberships_notify after update on public.project_guest_memberships
  for each row execute function private.on_guest_membership_change();

-- Read state for the whole inbox in one call (FR-PLAT-07).
create or replace function public.mark_all_notifications_read()
returns integer language sql security invoker set search_path = '' as $$
  with u as (update public.notifications set read_at = now()
              where recipient_id = (select auth.uid()) and read_at is null returning 1)
  select count(*)::integer from u;
$$;

------------------------------------------------------------------------------------------
-- Privileges (explicit; see migration 0012)
------------------------------------------------------------------------------------------
revoke all on function private.audience, private.reminder_settings, private.reminder_times,
  private.sync_opportunity_date_reminders, private.task_link, private.sync_task_reminders,
  private.sync_event_reminders, private.resync_workspace_reminders, private.dispatch_reminders,
  private.notify, private.actor_name from public, anon, authenticated;

-- Revoke first so local stacks (which add default grants) match hosted projects (which don't).
revoke all on public.calendar_events, public.calendar_feed, public.notification_preferences,
  public.reminders, public.notifications from anon, authenticated;
grant select, insert, update on public.calendar_events to authenticated;
grant select on public.calendar_feed to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select on public.reminders to authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant all on public.calendar_events, public.calendar_feed, public.notification_preferences,
  public.reminders, public.notifications to service_role;
revoke all on function public.mark_all_notifications_read from public, anon;
grant execute on function public.mark_all_notifications_read to authenticated;

alter publication supabase_realtime add table public.notifications;
