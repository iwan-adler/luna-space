-- Repeating events (FR-CAL-06): rule format, expansion, reminders for each occurrence.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

select is((select array_agg(d) from private.occurrence_dates('2026-11-02', 'FREQ=WEEKLY;BYDAY=MO,WE', '{2026-11-09}',
                                                             '2026-11-01', '2026-11-20') d),
          array['2026-11-02', '2026-11-04', '2026-11-11', '2026-11-16', '2026-11-18']::date[],
          'weekly on chosen days, without the skipped date');
select is((select array_agg(d) from private.occurrence_dates('2026-01-31', 'FREQ=MONTHLY;COUNT=3', '{}',
                                                             '2026-01-01', '2026-12-31') d),
          array['2026-01-31', '2026-03-31', '2026-05-31']::date[], 'monthly with a count');
select is((select array_agg(d) from private.occurrence_dates('2026-11-01', 'FREQ=DAILY;COUNT=5', '{}',
                                                             '2026-11-04', '2026-11-30') d),
          array['2026-11-04', '2026-11-05']::date[], 'counts from the first date, not the window');
select is((select array_agg(d) from private.occurrence_dates('2026-11-05', null, '{}', '2026-11-01', '2026-11-30') d),
          array['2026-11-05']::date[], 'no rule means a single date');

insert into auth.users (id, email, aud, role, email_confirmed_at)
values ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-rec.test', 'authenticated', 'authenticated', now());
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Rec WS');
insert into public.workspace_members (workspace_id, user_id, seat)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1);

select throws_ok($$insert into public.calendar_events (workspace_id, owner_id, title, all_day, start_date, rrule)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Bad', true, current_date,
          'FREQ=YEARLY')$$, '23514', null, 'unsupported rules are rejected');
select throws_ok($$insert into public.calendar_events (workspace_id, owner_id, title, all_day, start_date, rrule)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Bad', true, current_date,
          'FREQ=DAILY;X=1')$$, '23514', null, 'unknown rule parts are rejected');

insert into public.calendar_events (id, workspace_id, owner_id, title, starts_at, ends_at, timezone, rrule,
                                    reminder_offsets, exdates)
values ('eeeeeeee-0000-0000-0000-00000000000e', '11111111-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-00000000000a', 'Standup',
        ((current_date + 1) + time '09:00') at time zone 'Asia/Kolkata',
        ((current_date + 1) + time '09:30') at time zone 'Asia/Kolkata', 'Asia/Kolkata',
        'FREQ=DAILY;COUNT=5', '{60}', array[current_date + 3]);
select is((select count(*)::int from public.reminders where event_id = 'eeeeeeee-0000-0000-0000-00000000000e'),
          4, 'one reminder per remaining occurrence (5 minus the skipped date)');
select is((select min(remind_at) from public.reminders where event_id = 'eeeeeeee-0000-0000-0000-00000000000e'),
          ((current_date + 1) + time '08:00') at time zone 'Asia/Kolkata', 'an hour before the first occurrence');
select ok(exists (select 1 from cron.job where jobname = 'refresh-recurring-reminders'),
          'repeating reminders are topped up daily');

select * from finish();
rollback;
