-- Profiles, workspaces, membership and invitations (AC-01 – AC-06, NFR-SEC-05/07; ADR 0018 multi-workspace).
begin;
create extension if not exists pgtap with schema extensions;
select plan(35);

-- Helpers -------------------------------------------------------------------------------
create function pg_temp.new_user(p_id uuid, p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated',
          jsonb_build_object('display_name', initcap(split_part(p_email, '@', 1))))
  returning id;
$$;
create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims',
                    json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-000000000001', 'asha@pgtap.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-000000000002', 'bala@pgtap.test');
select pg_temp.new_user('cccccccc-0000-0000-0000-000000000003', 'chitra@pgtap.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-000000000004', 'outsider@pgtap.test');

-- Profiles are created by the auth trigger ------------------------------------------------
select is((select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          'Asha', 'profile created from sign-up metadata');
select is((select timezone from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          'Asia/Kolkata', 'default time zone');

-- Workspace creation (AC-01) ----------------------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
create temp table ws_a on commit drop as select public.create_workspace('Moonshot') as id;
select isnt((select id from ws_a), null, 'A creates a workspace');
select is((select seat from public.workspace_members where user_id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          1::smallint, 'creator takes seat 1');
select isnt(public.create_workspace('Second'), null, 'a member can create a second workspace');
select public.set_active_workspace((select id from ws_a));
select is((select count(*)::int from public.activity_log where action = 'workspace.created'), 1,
          'creation is in the activity log');

-- Invitations (AC-02, AC-03, NFR-SEC-05) ---------------------------------------------------
create temp table inv1 on commit drop as select public.create_workspace_invitation() as r;
select is((select r ->> 'ok' from inv1), 'true', 'A creates an invitation');
select ok(char_length((select r ->> 'token' from inv1)) >= 40, 'token has at least 32 random bytes');
create temp table inv2 on commit drop as select public.create_workspace_invitation() as r;
select is((select count(*)::int from public.workspace_invitations where revoked_at is null and accepted_at is null),
          1, 'creating a new invitation revokes the previous one');
select throws_ok($$ select token_hash from public.workspace_invitations $$, '42501', null,
                 'clients cannot read token hashes');
select lives_ok($$ select id, expires_at from public.workspace_invitations $$,
                'clients can read invitation metadata');

select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select is((select public.accept_workspace_invitation((select r ->> 'token' from inv1)) ->> 'code'),
          'INVITE_INVALID', 'a revoked (replaced) token is invalid');
select is((select public.accept_workspace_invitation('not-a-real-token-but-long-enough-000000') ->> 'code'),
          'INVITE_INVALID', 'an unknown token is invalid');
select is((select public.accept_workspace_invitation((select r ->> 'token' from inv2)) ->> 'ok'),
          'true', 'B accepts the current invitation');
select is((select seat from public.workspace_members where user_id = 'bbbbbbbb-0000-0000-0000-000000000002'),
          2::smallint, 'B takes seat 2');

select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
select is((select public.accept_workspace_invitation((select r ->> 'token' from inv2)) ->> 'ok'),
          'true', 'one invite link works for several friends');

select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select public.update_workspace(null, null, 3::smallint);
select is((select public.create_workspace_invitation() ->> 'code'), 'WORKSPACE_FULL',
          'no invitations once the member limit is reached');

-- Membership is written only through the functions above ---------------------------------
select throws_ok($$ insert into public.workspace_members (workspace_id, user_id, seat)
                    values ((select id from ws_a), 'cccccccc-0000-0000-0000-000000000003', 2) $$,
                 '42501', null, 'clients cannot insert members directly');
select pg_temp.logout();
select throws_ok($$ insert into public.workspace_members (workspace_id, user_id, seat)
                    values ((select id from ws_a), 'dddddddd-0000-0000-0000-000000000004', 51) $$,
                 '23514', null, 'seat numbers are bounded, even for the database owner');
select throws_ok($$ insert into public.workspace_members (workspace_id, user_id, seat)
                    values ((select id from ws_a), 'cccccccc-0000-0000-0000-000000000003', 2) $$,
                 '23505', null, 'a taken seat cannot be reused');

-- Expired invitations ----------------------------------------------------------------------
select pg_temp.login('dddddddd-0000-0000-0000-000000000004');
create temp table ws_o on commit drop as select public.create_workspace('Outsider space') as id;
select pg_temp.logout();
insert into public.workspace_invitations (workspace_id, token_hash, created_at, expires_at)
values ((select id from ws_o), extensions.digest('expired-token-0000000000000000000000', 'sha256'),
        now() - interval '8 days', now() - interval '1 day');
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
select is((select public.accept_workspace_invitation('expired-token-0000000000000000000000') ->> 'code'),
          'INVITE_INVALID', 'an expired token is invalid');

-- Isolation between workspaces ---------------------------------------------------------------
select pg_temp.login('dddddddd-0000-0000-0000-000000000004');
select is((select count(*)::int from public.workspaces where id = (select id from ws_a)), 0,
          'outsider cannot see another workspace');
select is((select count(*)::int from public.workspace_members where workspace_id = (select id from ws_a)), 0,
          'outsider cannot see its members');
select is((select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'), 0,
          'outsider cannot see A''s profile');
select is((select count(*)::int from public.activity_log where workspace_id = (select id from ws_a)), 0,
          'outsider cannot see A''s activity');
update public.workspaces set name = 'Hijacked' where id = (select id from ws_a);
select pg_temp.logout();
select is((select name from public.workspaces where id = (select id from ws_a)), 'Moonshot',
          'outsider cannot rename another workspace');

select pg_temp.login('bbbbbbbb-0000-0000-0000-000000000002');
select is((select count(*)::int from public.profiles), 3, 'B sees exactly the members of the workspace');
select is((select count(*)::int from public.workspace_members), 3, 'B sees all three members');
update public.profiles set display_name = 'Renamed' where id = 'aaaaaaaa-0000-0000-0000-000000000001';
select pg_temp.logout();
select is((select display_name from public.profiles where id = 'aaaaaaaa-0000-0000-0000-000000000001'),
          'Asha', 'a member cannot edit the partner''s profile');

select pg_temp.login('aaaaaaaa-0000-0000-0000-000000000001');
select throws_ok($$ update public.profiles set timezone = 'Mars/Olympus' where id = auth.uid() $$,
                 '22023', null, 'unknown time zones are rejected');
select lives_ok($$ update public.workspaces set name = 'Moonshot Crew' where id = (select id from ws_a) $$,
                'a member can rename the workspace');

-- Anonymous access ------------------------------------------------------------------------
select pg_temp.logout();
select set_config('role', 'anon', true);
select is((select count(*)::int from public.profiles), 0, 'anon sees no profiles');
select is((select count(*)::int from public.workspaces), 0, 'anon sees no workspaces');
select throws_ok($$ select public.create_workspace('Anon') $$, '42501', null,
                 'anon cannot call create_workspace');
select pg_temp.logout();

-- Rate limit on acceptance (NFR-SEC-07) -------------------------------------------------------
select pg_temp.login('cccccccc-0000-0000-0000-000000000003');
select public.accept_workspace_invitation('wrong-token-000000000000000000000' || g) from generate_series(1, 10) g;
select is((select public.accept_workspace_invitation('wrong-token-00000000000000000000000x') ->> 'code'),
          'RATE_LIMITED', 'the 11th attempt in an hour is rate limited');

select * from finish();
rollback;
