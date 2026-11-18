-- Phase 5a: calendar events and feed, reminders, notifications (FR-CAL-01–05, FR-AUTO-01,
-- FR-PLAT-07; AC-18, AC-19).
begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

create function pg_temp.new_user(p_id uuid, p_email text, p_tz text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated', now(),
          jsonb_build_object('display_name', initcap(split_part(p_email, '@', 1))));
  update public.profiles set timezone = p_tz where id = p_id;
  select p_id;
$$;
create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

-- A in Kolkata, B in Los Angeles, outsider O.
select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-cal.test', 'Asia/Kolkata');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-cal.test', 'America/Los_Angeles');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-cal.test', 'Asia/Kolkata');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Cal WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid, d date) on commit drop;
grant all on ids to authenticated;
insert into ids (name, d) values ('deadline', current_date + 30);

-- Opportunity with a date-only registration deadline 30 days out (AC-18, AC-19) -------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
insert into ids (name, id) select 'opp', public.save_opportunity(null,
  '{"type":"hackathon","title":"Moonshot Hack"}',
  jsonb_build_array(jsonb_build_object('kind', 'registration_deadline', 'all_day', true,
                                       'on_date', (select d from ids where name = 'deadline'))),
  null);
select pg_temp.logout();

select is((select count(*)::int from public.reminders r join public.opportunity_dates d on d.id = r.opportunity_date_id
            where d.opportunity_id = (select id from ids where name = 'opp')),
          0, 'a merely saved opportunity has no reminders (FR-AUTO-01)');

update public.opportunities set status = 'interested' where id = (select id from ids where name = 'opp');
select is((select count(*)::int from public.reminders where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          3, 'interested: three default reminders for A');
select is((select array_agg(remind_at order by remind_at) from public.reminders
            where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          array[((select d from ids where name = 'deadline') - 7 + time '09:00') at time zone 'Asia/Kolkata',
                ((select d from ids where name = 'deadline') - 1 + time '09:00') at time zone 'Asia/Kolkata',
                ((select d from ids where name = 'deadline') + time '09:00') at time zone 'Asia/Kolkata'],
          '7 days, 1 day and on the day at 09:00 in A''s zone (AC-19)');
select is((select min(remind_at) from public.reminders where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'),
          ((select d from ids where name = 'deadline') - 7 + time '09:00') at time zone 'America/Los_Angeles',
          'the partner gets the same reminders at 09:00 in their own zone');
select ok((select bool_and(title like 'Moonshot Hack: registration deadline%') from public.reminders
             where workspace_id = '11111111-0000-0000-0000-000000000001'),
          'reminder titles name the opportunity and the deadline');

-- Date-only stays on its date in every zone (AC-18)
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select start_date from public.calendar_feed where source_type = 'opportunity_date'),
          (select d from ids where name = 'deadline'), 'feed shows the date-only deadline on its date');
select pg_temp.logout();

-- Preferences re-plan reminders
insert into public.notification_preferences (user_id, deadline_reminder_days)
values ('aaaaaaaa-0000-0000-0000-00000000000a', '{1}');
select is((select count(*)::int from public.reminders where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          1, 'changing preferences re-plans pending reminders');

update public.opportunities set status = 'withdrawn' where id = (select id from ids where name = 'opp');
select is((select count(*)::int from public.reminders where workspace_id = '11111111-0000-0000-0000-000000000001'),
          0, 'closing the opportunity removes its reminders');
update public.opportunities set status = 'registered' where id = (select id from ids where name = 'opp');

-- Dispatch: due reminders become one notification each, even if run twice (AC-19) ----------
update public.reminders set remind_at = now() - interval '1 minute'
 where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select is(private.dispatch_reminders(), 1, 'dispatch delivers the due reminder');
select is(private.dispatch_reminders(), 0, 'running the job again delivers nothing new');
update public.reminders set status = 'pending' where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select private.dispatch_reminders();
select is((select count(*)::int from public.notifications where recipient_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          1, 'even a re-sent reminder cannot duplicate the notification');

-- Events --------------------------------------------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.calendar_events (workspace_id, owner_id, title, kind, starts_at, ends_at, timezone,
                                               reminder_offsets)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Team sync',
                   'meeting', now() + interval '2 days', now() + interval '2 days 1 hour', 'Asia/Kolkata', '{60}')
           returning id) insert into ids (name, id) select 'event', id from r;
insert into public.calendar_events (workspace_id, owner_id, visibility, title, all_day, start_date)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'private',
        'Dentist', true, current_date + 5);
select throws_ok($$insert into public.calendar_events (workspace_id, owner_id, title, all_day, starts_at)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Bad', true, now())$$,
  '23514', null, 'all-day events cannot carry a time');
select throws_ok($$insert into public.calendar_events (workspace_id, owner_id, title, starts_at, timezone)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Bad', now(), 'Mars/Base')$$,
  '22023', null, 'timed events need a real time zone');
select pg_temp.logout();
select is((select count(*)::int from public.reminders where event_id = (select id from ids where name = 'event')),
          2, 'a shared event reminds both members');
select is((select min(remind_at) from public.reminders where event_id = (select id from ids where name = 'event')),
          (select starts_at - interval '60 minutes' from public.calendar_events where id = (select id from ids where name = 'event')),
          'event reminders fire at the chosen offset');

select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.calendar_feed where source_type = 'event'), 1,
          'the partner sees the shared event but not the private one');
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.calendar_feed), 0, 'outsiders see nothing in the feed');

-- Tasks: assignment notifies, due dates remind the assignee ---------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.projects (workspace_id, owner_id, name)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Room')
           returning id) insert into ids (name, id) select 'room', id from r;
with r as (insert into public.tasks (workspace_id, owner_id, project_id, title, assignee_id, due_date)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   (select id from ids where name = 'room'), 'Write README', 'bbbbbbbb-0000-0000-0000-00000000000b',
                   current_date + 10) returning id) insert into ids (name, id) select 'task', id from r;
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select title from public.notifications where type = 'task.assigned'),
          'A assigned you "Write README"', 'the assignee is told who assigned what');
select is((select link_path from public.notifications where type = 'task.assigned'),
          '/projects/' || (select id from ids where name = 'room') || '/board?task=' || (select id from ids where name = 'task'),
          'the notification links straight to the task');
select is((select count(*)::int from public.reminders where task_id = (select id from ids where name = 'task')),
          2, 'the assignee gets reminders the day before and on the day');
select is(public.mark_all_notifications_read(), 1, 'mark all read');
select throws_ok($$update public.notifications set title = 'Tampered'$$, '42501', null,
                 'only the read state of a notification can change');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.notifications where type = 'task.assigned'), 0,
          'nobody reads another person''s notifications');
update public.tasks set status = 'done' where id = (select id from ids where name = 'task');
select pg_temp.logout();
select is((select count(*)::int from public.reminders where task_id = (select id from ids where name = 'task')),
          0, 'completing a task cancels its reminders');
select ok(exists (select 1 from cron.job where jobname = 'dispatch-reminders' and schedule = '* * * * *'),
          'the dispatcher runs every minute');

select * from finish();
rollback;
