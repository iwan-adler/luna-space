-- Phase 5b: Web Push subscriptions, quiet hours and claiming (FR-PLAT-08).
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

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

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-push.test', 'Asia/Kolkata');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-push.test', 'Asia/Kolkata');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Push WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2);

-- Quiet hours (wrapping and not wrapping midnight)
select ok(private.in_quiet_hours('23:00', '07:00', 'Asia/Kolkata', '2026-12-01 18:00:00+00'),
          '23:30 in Kolkata is inside 23:00–07:00');
select ok(not private.in_quiet_hours('23:00', '07:00', 'Asia/Kolkata', '2026-12-01 06:00:00+00'),
          '11:30 in Kolkata is outside 23:00–07:00');
select ok(private.in_quiet_hours('13:00', '15:00', 'UTC', '2026-12-01 14:00:00+00'), 'a daytime window works');
select ok(not private.in_quiet_hours('00:00', '00:00', 'UTC', now()), 'equal start and end means no quiet hours');

-- Subscriptions: saved through the RPC, own rows only ------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select public.save_push_subscription('https://push.example/ep-1', repeat('p', 87), repeat('a', 22), 'Test browser');
select is((select count(*)::int from public.push_subscriptions), 1, 'A sees their device');
select is((select push_enabled from public.notification_preferences), true, 'saving a device turns push on');
select throws_ok($$insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values ('aaaaaaaa-0000-0000-0000-00000000000a', 'https://push.example/x', repeat('p', 87), repeat('a', 22))$$,
  '42501', null, 'devices are registered only through the RPC');
select throws_ok($$select public.save_push_subscription('http://insecure.example/ep', repeat('p', 87), repeat('a', 22), null)$$,
  '23514', null, 'only https push endpoints are accepted');
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.push_subscriptions), 0, 'B cannot see A''s devices');
select throws_ok('select public.claim_push_batch()', '42501', null, 'users cannot claim pushes');

-- The same browser signing in as B moves the device to B
select public.save_push_subscription('https://push.example/ep-1', repeat('p', 87), repeat('a', 22), 'Test browser');
select pg_temp.logout();
select is((select user_id from public.push_subscriptions where endpoint = 'https://push.example/ep-1'),
          'bbbbbbbb-0000-0000-0000-00000000000b'::uuid, 'an endpoint belongs to the last account that saved it');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select public.save_push_subscription('https://push.example/ep-2', repeat('p', 87), repeat('a', 22), 'Phone');

-- Claiming -----------------------------------------------------------------------------------
select is(public.send_test_notification() ->> 'ok', 'true', 'a test notification is created');
select pg_temp.logout();
update public.notification_preferences set quiet_start = '00:00', quiet_end = '00:00', lockscreen_details = false
 where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a';
create temp table claimed on commit drop as select * from public.claim_push_batch();
select is((select count(*)::int from claimed where recipient_id = 'aaaaaaaa-0000-0000-0000-00000000000a'), 1,
          'the test notification is claimed for pushing');
select is((select jsonb_array_length(subscriptions) from claimed), 1, 'with every device of the recipient');
select is((select show_details from claimed), false, 'and the lock-screen privacy setting');
select is((select count(*)::int from public.claim_push_batch()), 0, 'a claimed notification is never claimed twice');

-- Quiet hours hold pushes back
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select public.send_test_notification();
select pg_temp.logout();
update public.notification_preferences
   set quiet_start = ((now() at time zone 'Asia/Kolkata') - interval '1 hour')::time,
       quiet_end = ((now() at time zone 'Asia/Kolkata') + interval '1 hour')::time
 where user_id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select is((select count(*)::int from public.claim_push_batch()), 0, 'nothing is pushed during quiet hours');

select * from finish();
rollback;
