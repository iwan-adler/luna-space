-- Studio Meet live rooms and inline avatars (ADR 0023).
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

create function pg_temp.new_user(p_id uuid, p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated', now(),
          jsonb_build_object('display_name', initcap(split_part(p_email, '@', 1))))
  returning id;
$$;
create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@pgtap-live.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'ben@pgtap-live.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'out@pgtap-live.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Live WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat, role) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1, 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2, 'member'),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1, 'owner');

-- Ana starts the Studio meeting; Ben sees it live with who started it.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
insert into public.live_rooms (workspace_id, meet_url, is_active)
values ('11111111-0000-0000-0000-000000000001', 'https://meet.google.com/abc-defg-hij', true);
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select started_by from public.live_rooms where is_active),
          'aaaaaaaa-0000-0000-0000-00000000000a'::uuid, 'teammates see a live room and who started it');
select throws_ok($$insert into public.live_rooms (workspace_id) values ('11111111-0000-0000-0000-000000000001')$$,
                 '23505', null, 'one Studio room per workspace');
select throws_ok($$update public.live_rooms set meet_url = 'https://evil.example/meet'$$, '23514', null,
                 'only Google Meet addresses');
select throws_ok($$update public.live_rooms set meet_url = 'https://meet.google.com/abc-defg-hij?authuser=1'$$,
                 '23514', null, 'no query strings');
update public.live_rooms set is_active = false;
select is((select started_at from public.live_rooms), null, 'ending a meeting clears who and when');
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.live_rooms), 0, 'outsiders see no rooms');

-- Avatars.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select lives_ok($$update public.profiles set avatar_path = 'data:image/webp;base64,UklGRg==' where id = auth.uid()$$,
                'a small image avatar is accepted');
select throws_ok($$update public.profiles set avatar_path = 'data:text/html;base64,PHNjcmlwdD4=' where id = auth.uid()$$,
                 '23514', null, 'only image data is accepted');
select throws_ok(format($$update public.profiles set avatar_path = 'data:image/png;base64,%s' where id = auth.uid()$$,
                        repeat('A', 300001)), '23514', null, 'oversized avatars are refused');

select * from finish();
rollback;
