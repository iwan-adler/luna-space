-- Private calendar sync link (ADR 0013): only hashes stored, owner-scoped contents, reset.
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

insert into auth.users (id, email, aud, role, email_confirmed_at) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-sync.test', 'authenticated', 'authenticated', now()),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-sync.test', 'authenticated', 'authenticated', now()),
  ('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-sync.test', 'authenticated', 'authenticated', now());
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Sync WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2);
insert into public.calendar_events (workspace_id, owner_id, visibility, title, all_day, start_date) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'shared', 'Team sync', true, current_date + 2),
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'private', 'A dentist', true, current_date + 3),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'private', 'B gym', true, current_date + 3),
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'shared', 'Old', true, current_date - 400);

create temp table tok (who text primary key, token text) on commit drop;
grant all on tok to authenticated;

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
insert into tok select 'a', public.create_calendar_feed_token() ->> 'token';
select ok((select char_length(token) >= 40 from tok where who = 'a'), 'a link token is returned once');
select is((select count(*)::int from public.calendar_feed_tokens), 1, 'the owner sees that a link exists');
select throws_ok('select token_hash from public.calendar_feed_tokens', '42501', null, 'the hash itself is not readable');
select throws_ok($$select * from public.calendar_feed_for_token('x')$$, '42501', null, 'users cannot read feeds directly');
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is(public.create_calendar_feed_token() ->> 'code', 'NOT_MEMBER', 'people without a workspace get no link');

select pg_temp.logout();
select is((select array_agg(title order by title) from public.calendar_feed_for_token((select token from tok where who = 'a'))),
          array['A dentist', 'Team sync'], 'A''s link has shared items and A''s private ones, not B''s or old ones');
select ok((select last_used_at is not null from public.calendar_feed_tokens where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          'use of the link is recorded');
select throws_ok($$select * from public.calendar_feed_for_token('wrong-token-wrong-token-wrong')$$, 'P0002', null,
                 'an unknown link is refused');

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
insert into tok select 'a2', public.create_calendar_feed_token() ->> 'token';
select pg_temp.logout();
select throws_ok(format('select * from public.calendar_feed_for_token(%L)', (select token from tok where who = 'a')),
                 'P0002', null, 'resetting the link kills the old one');
select is((select count(*)::int from public.calendar_feed_for_token((select token from tok where who = 'a2'))), 2,
          'the new link works');

select * from finish();
rollback;
