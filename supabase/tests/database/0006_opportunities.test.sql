-- Phase 2: opportunities, dates, sources, provenance, history (FR-OPP-01–05, 10–12; AC-06, AC-15).
begin;
create extension if not exists pgtap with schema extensions;
select plan(30);

create function pg_temp.new_user(p_id uuid, p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated',
          jsonb_build_object('display_name', initcap(split_part(p_email, '@', 1))))
  returning id;
$$;
create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

-- Workspace with A and B, plus an outsider O ---------------------------------------------
select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-opp.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-opp.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-opp.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Opp WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

-- Save via RPC ------------------------------------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

insert into ids select 'shared', public.save_opportunity(null,
  '{"type":"hackathon","title":"Moonshot Hack","organizer":"Moon Labs","mode":"hybrid","team_min":2,"team_max":4,
    "tracks":["AI","Open"],"required_documents":["Student ID"]}',
  '[{"kind":"registration_deadline","all_day":true,"on_date":"2026-12-15"},
    {"kind":"submission_deadline","all_day":false,"at_time":"2026-12-20T18:29:00Z","source_timezone":"Asia/Kolkata"}]',
  'https://www.MoonLabs.example/hack/#top');
insert into ids select 'private', public.save_opportunity(null,
  '{"type":"scholarship","title":"Secret Scholarship","visibility":"private"}', '[]', null);

select is((select count(*)::int from public.opportunities where id = (select id from ids where name = 'shared')), 1,
          'A can read the opportunity just saved');
select is((select tracks from public.opportunities where id = (select id from ids where name = 'shared')),
          array['AI', 'Open'], 'arrays are stored from JSON');
select is((select count(*)::int from public.opportunity_dates where opportunity_id = (select id from ids where name = 'shared')),
          2, 'both dates stored');
select is((select on_date from public.opportunity_dates
            where opportunity_id = (select id from ids where name = 'shared') and kind = 'registration_deadline'),
          '2026-12-15'::date, 'date-only deadline kept as a date (no time zone shift)');
select is((select normalized_url || ' ' || domain from public.opportunity_sources
            where opportunity_id = (select id from ids where name = 'shared')),
          'moonlabs.example/hack www.moonlabs.example', 'source normalised and domain extracted');

-- Provenance and history (FR-OPP-11/12, AC-15) ------------------------------------------------
select is((select count(*)::int from public.opportunity_field_provenance
            where opportunity_id = (select id from ids where name = 'shared') and source = 'manual'
              and field_key in ('title', 'organizer', 'mode', 'team_min', 'team_max', 'tracks',
                                'registration_deadline', 'submission_deadline')),
          8, 'every set field has a manual provenance row');
select is((select count(*)::int from public.opportunity_field_provenance
            where opportunity_id = (select id from ids where name = 'shared') and field_key = 'description'),
          0, 'empty fields have no provenance');

select public.save_opportunity((select id from ids where name = 'shared'),
  '{"type":"hackathon","title":"Moonshot Hack","organizer":"Moon Labs","mode":"hybrid","team_min":2,"team_max":4,
    "tracks":["AI","Open"],"required_documents":["Student ID"]}',
  '[{"kind":"registration_deadline","all_day":true,"on_date":"2026-12-18"},
    {"kind":"submission_deadline","all_day":false,"at_time":"2026-12-20T18:29:00Z","source_timezone":"Asia/Kolkata"}]',
  null);
select is((select old_value ->> 'on_date' || '→' || (new_value ->> 'on_date') from public.opportunity_field_history
            where opportunity_id = (select id from ids where name = 'shared') and field_key = 'registration_deadline'
              and old_value is not null),
          '2026-12-15→2026-12-18', 'date change recorded with old and new value');
select is((select changed_by from public.opportunity_field_history
            where opportunity_id = (select id from ids where name = 'shared') and field_key = 'registration_deadline'
              and old_value is not null),
          'aaaaaaaa-0000-0000-0000-00000000000a'::uuid, 'history records who changed it');
select is((select count(*)::int from public.opportunity_field_history
            where opportunity_id = (select id from ids where name = 'shared') and field_key = 'submission_deadline'),
          1, 'unchanged dates are not re-recorded');

select public.save_opportunity((select id from ids where name = 'shared'),
  '{"type":"hackathon","title":"Moonshot Hack","mode":"hybrid","team_min":2,"team_max":4}',
  '[{"kind":"registration_deadline","all_day":true,"on_date":"2026-12-18"}]', null);
select is((select count(*)::int from public.opportunity_dates where opportunity_id = (select id from ids where name = 'shared')),
          1, 'dates missing from the payload are removed');
select is((select count(*)::int from public.opportunity_field_provenance
            where opportunity_id = (select id from ids where name = 'shared') and field_key = 'submission_deadline'),
          0, 'provenance of a removed date is removed');

update public.opportunities set status = 'interested' where id = (select id from ids where name = 'shared');
select is((select new_value #>> '{}' from public.opportunity_field_history
            where opportunity_id = (select id from ids where name = 'shared') and field_key = 'status'
              and old_value is not null),
          'interested', 'status changes are in the history');
select is((select count(*)::int from public.activity_log where action = 'opportunity.status_changed'
            and entity_id = (select id from ids where name = 'shared')), 1, 'status change logged as activity');

-- Constraints -----------------------------------------------------------------------------
select throws_ok($$ insert into public.opportunity_dates (opportunity_id, kind, all_day, on_date, at_time)
                    values ((select id from ids where name = 'shared'), 'event_start', true, '2026-12-01',
                            '2026-12-01T00:00:00Z') $$,
                 '23514', null, 'a date-only row cannot also carry a time');
select throws_ok($$ insert into public.opportunity_dates (opportunity_id, kind, all_day, at_time)
                    values ((select id from ids where name = 'shared'), 'event_start', false, '2026-12-01T09:00:00Z') $$,
                 '23514', null, 'a timed row needs its time zone');
select throws_ok($$ insert into public.opportunity_dates (opportunity_id, kind, all_day, at_time, source_timezone)
                    values ((select id from ids where name = 'shared'), 'event_start', false, now(), 'Mars/Base') $$,
                 '22023', null, 'unknown time zones are rejected');
select throws_ok($$ insert into public.opportunity_dates (opportunity_id, kind, all_day, on_date)
                    values ((select id from ids where name = 'shared'), 'registration_deadline', true, '2026-12-01') $$,
                 '23505', null, 'only one registration deadline per opportunity');
select throws_ok($$ select public.save_opportunity(null, '{"type":"hackathon","title":"x","team_min":5,"team_max":2}') $$,
                 '23514', null, 'team_min cannot exceed team_max');
select throws_ok($$ select public.save_opportunity(null, '{"type":"hackathon","title":"x","official_url":"javascript:alert(1)"}') $$,
                 '23514', null, 'only http(s) URLs are accepted');
select throws_ok($$ update public.opportunities set owner_id = 'bbbbbbbb-0000-0000-0000-00000000000b'
                    where id = (select id from ids where name = 'shared') $$,
                 'P0001', null, 'ownership cannot be transferred by clients');

-- Visibility (AC-06) -------------------------------------------------------------------------
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.opportunities where id = (select id from ids where name = 'shared')), 1,
          'partner sees shared opportunities');
select is((select count(*)::int from public.opportunities where id = (select id from ids where name = 'private')), 0,
          'partner cannot see A''s private opportunity');
select throws_ok($$ update public.opportunities set visibility = 'private'
                    where id = (select id from ids where name = 'shared') $$,
                 '42501', null, 'partner cannot make A''s opportunity private');
select lives_ok($$ update public.opportunities set status = 'planning'
                   where id = (select id from ids where name = 'shared') $$,
                'partner can update shared opportunities');
select is((select count(*)::int from public.opportunity_field_provenance
            where opportunity_id = (select id from ids where name = 'private')), 0,
          'partner cannot read provenance of private items');

select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.opportunities), 0, 'outsider sees no opportunities');
select is((select count(*)::int from public.opportunity_dates), 0, 'outsider sees no dates');
select is((select count(*)::int from public.opportunity_field_history), 0, 'outsider sees no history');

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select lives_ok($$ update public.opportunities set visibility = 'shared'
                   where id = (select id from ids where name = 'private') $$,
                'the owner can share a private opportunity');

select pg_temp.logout();
select * from finish();
rollback;
