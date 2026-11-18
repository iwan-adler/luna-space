-- Phase 3: extraction runs, fields, acceptance and provenance (FR-OPP-06–11, AC-12).
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

create function pg_temp.new_user(p_id uuid, p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated', '{}'::jsonb) returning id;
$$;
create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-0000000000e1', 'a@pgtap-ext.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-0000000000e2', 'b@pgtap-ext.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-0000000000e4', 'o@pgtap-ext.test');
insert into public.workspaces (id, name) values ('33333333-0000-0000-0000-000000000003', 'Ext WS'),
                                                ('44444444-0000-0000-0000-000000000004', 'Other');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('33333333-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-0000000000e1', 1),
  ('33333333-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-0000000000e2', 2),
  ('44444444-0000-0000-0000-000000000004', 'dddddddd-0000-0000-0000-0000000000e4', 1);

create temp table t (k text primary key, v jsonb) on commit drop;
grant all on t to authenticated;

-- Start (member, URL validation) ---------------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-0000000000e1');
select is((select public.start_extraction_run('javascript:alert(1)') ->> 'code'), 'INVALID_URL',
          'non-http URLs are rejected before fetching');
insert into t select 'run', public.start_extraction_run('https://moonlabs.example/hack');
select is((select v ->> 'ok' from t where k = 'run'), 'true', 'a member can start a run');
select throws_ok($$ select public.complete_extraction_run((select (v ->> 'run_id')::uuid from t where k = 'run'),
                     'succeeded', null, 200, 'text/html', null, null, false, '[]') $$,
                 '42501', null, 'clients cannot write extraction results');
select throws_ok($$ insert into public.extraction_fields (run_id, field_key, status, value, evidence)
                    values ((select (v ->> 'run_id')::uuid from t where k = 'run'), 'title', 'confirmed', '"x"', 'x') $$,
                 '42501', null, 'clients cannot insert fields directly');

-- Complete as the service (database owner here) -----------------------------------------
select pg_temp.logout();
select public.complete_extraction_run((select (v ->> 'run_id')::uuid from t where k = 'run'),
  'succeeded', 'https://moonlabs.example/hack', 200, 'text/html; charset=utf-8',
  encode(extensions.digest('page', 'sha256'), 'hex'), null, false,
  '[{"field_key":"title","status":"confirmed","value":"Moonshot Hack","evidence":"<h1>Moonshot Hack</h1>","rule_id":"jsonld.name"},
    {"field_key":"registration_deadline","status":"confirmed","value":{"all_day":true,"on_date":"2026-12-15","at_time":null,"source_timezone":null},"evidence":"Registration closes on 15 December 2026","rule_id":"label.registration"},
    {"field_key":"submission_deadline","candidate_no":1,"status":"conflicting","value":{"all_day":true,"on_date":"2026-12-20","at_time":null,"source_timezone":null},"evidence":"Submissions close 20 Dec 2026","rule_id":"label.submission"},
    {"field_key":"submission_deadline","candidate_no":2,"status":"conflicting","value":{"all_day":true,"on_date":"2026-12-21","at_time":null,"source_timezone":null},"evidence":"Final deadline: 21 December 2026","rule_id":"label.submission"},
    {"field_key":"team_max","status":"inferred","value":4,"evidence":"teams of up to four","rule_id":"label.team","reason":"number written as a word"},
    {"field_key":"eligibility_text","status":"missing","value":null,"evidence":null}]');
select is((select count(*)::int from public.extraction_fields
            where run_id = (select (v ->> 'run_id')::uuid from t where k = 'run')), 6, 'all candidates stored');
select throws_ok($$ insert into public.extraction_fields (run_id, field_key, status, value)
                    values ((select (v ->> 'run_id')::uuid from t where k = 'run'), 'prizes', 'confirmed', '"x"') $$,
                 '23514', null, 'a value without evidence is rejected (never fabricate)');
select throws_ok($$ insert into public.extraction_fields (run_id, field_key, status, value, evidence)
                    values ((select (v ->> 'run_id')::uuid from t where k = 'run'), 'location', 'missing', '"Pune"', 'x') $$,
                 '23514', null, 'a missing field cannot carry a value');

-- Visibility of runs -----------------------------------------------------------------------
select pg_temp.login('bbbbbbbb-0000-0000-0000-0000000000e2');
select is((select count(*)::int from public.extraction_runs), 0, 'the partner cannot see an unsaved run');
select throws_ok($$ select public.accept_extraction((select (v ->> 'run_id')::uuid from t where k = 'run'),
                     '{"type":"hackathon","title":"Stolen"}', '[]', '[]') $$,
                 'P0002', null, 'the partner cannot accept someone else''s run');
select pg_temp.login('dddddddd-0000-0000-0000-0000000000e4');
select is((select count(*)::int from public.extraction_fields), 0, 'an outsider sees no fields');

-- Accept (A): title kept, registration deadline kept, conflict resolved to candidate 2,
-- team_max edited by A (so manual provenance) -------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-0000000000e1');
insert into t select 'opp', to_jsonb(public.accept_extraction(
  (select (v ->> 'run_id')::uuid from t where k = 'run'),
  '{"type":"hackathon","title":"Moonshot Hack","team_max":5}',
  '[{"kind":"registration_deadline","all_day":true,"on_date":"2026-12-15"},
    {"kind":"submission_deadline","all_day":true,"on_date":"2026-12-21"}]',
  '[{"field_key":"title"},{"field_key":"registration_deadline"},{"field_key":"submission_deadline","candidate_no":2}]'));

select is((select source::text || ':' || status_at_acceptance::text from public.opportunity_field_provenance
            where opportunity_id = (select (v #>> '{}')::uuid from t where k = 'opp') and field_key = 'title'),
          'extraction:confirmed', 'kept fields carry extraction provenance and status');
select is((select evidence::text from public.opportunity_field_provenance
            where opportunity_id = (select (v #>> '{}')::uuid from t where k = 'opp') and field_key = 'submission_deadline'),
          'Final deadline: 21 December 2026', 'evidence comes from the chosen candidate on the server');
select is((select status_at_acceptance::text from public.opportunity_field_provenance
            where opportunity_id = (select (v #>> '{}')::uuid from t where k = 'opp') and field_key = 'submission_deadline'),
          'conflicting', 'a resolved conflict is recorded as such');
select is((select source::text from public.opportunity_field_provenance
            where opportunity_id = (select (v #>> '{}')::uuid from t where k = 'opp') and field_key = 'team_max'),
          'manual', 'edited fields are manual');
select is((select source::text from public.opportunity_field_history
            where opportunity_id = (select (v #>> '{}')::uuid from t where k = 'opp') and field_key = 'title'),
          'extraction', 'history records the extraction as the source');
select is((select last_checked_at is not null from public.opportunity_sources
            where opportunity_id = (select (v #>> '{}')::uuid from t where k = 'opp')), true,
          'source keeps when it was last checked');
select throws_ok($$ select public.accept_extraction((select (v ->> 'run_id')::uuid from t where k = 'run'),
                     '{"type":"hackathon","title":"Again"}', '[]', '[]') $$,
                 'P0001', null, 'a run can be accepted only once');

select pg_temp.login('bbbbbbbb-0000-0000-0000-0000000000e2');
select is((select count(*)::int from public.extraction_runs), 1,
          'once linked to a shared opportunity, the partner can see the run');

select pg_temp.logout();
select * from finish();
rollback;
