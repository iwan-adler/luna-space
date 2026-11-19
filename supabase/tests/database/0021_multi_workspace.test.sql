-- Many workspaces per person, bigger teams (ADR 0018).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create function pg_temp.new_user(p_id uuid, p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated', now(),
          jsonb_build_object('display_name', initcap(split_part(p_email, '@', 1))))
  returning id;
$$;
create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('request.headers', '{}', true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.use_ws(p_ws uuid) returns void language sql as $$
  select set_config('request.headers', json_build_object('x-workspace-id', p_ws)::text, true);
$$;

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@pgtap-multi.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'ben@pgtap-multi.test');
select pg_temp.new_user('cccccccc-0000-0000-0000-00000000000c', 'cy@pgtap-multi.test');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where name = p $$;

-- Ana runs two workspaces: "Hack Club" (with Ben and Cy) and "Study duo" (with Ben).
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
insert into ids select 'club', public.create_workspace('Hack Club');
insert into ids select 'duo', public.create_workspace('Study duo');
select pg_temp.use_ws(pg_temp.id('club'));
create temp table club_inv on commit drop as select public.create_workspace_invitation() ->> 'token' as t;
select pg_temp.use_ws(pg_temp.id('duo'));
create temp table duo_inv on commit drop as select public.create_workspace_invitation() ->> 'token' as t;
grant all on club_inv, duo_inv to authenticated;
select pg_temp.use_ws(pg_temp.id('club'));
insert into public.notes (workspace_id, owner_id, title)
values (pg_temp.id('club'), 'aaaaaaaa-0000-0000-0000-00000000000a', 'Club plan');
select pg_temp.use_ws(pg_temp.id('duo'));
insert into public.notes (workspace_id, owner_id, title)
values (pg_temp.id('duo'), 'aaaaaaaa-0000-0000-0000-00000000000a', 'Exam notes');

select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select public.accept_workspace_invitation((select t from club_inv));
select public.accept_workspace_invitation((select t from duo_inv));
select pg_temp.login('cccccccc-0000-0000-0000-00000000000c');
select public.accept_workspace_invitation((select t from club_inv));

-- The header picks the workspace; everything else follows.
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select array_agg(name order by name) from public.my_workspaces()), array['Hack Club', 'Study duo'],
          'Ben sees both workspaces in the switcher');
select pg_temp.use_ws(pg_temp.id('club'));
select is((select array_agg(title) from public.notes), array['Club plan'], 'with the club header, club notes only');
select is((select count(*)::int from public.workspace_members), 3, 'and the club''s three members');
select pg_temp.use_ws(pg_temp.id('duo'));
select is((select array_agg(title) from public.notes), array['Exam notes'], 'with the duo header, duo notes only');

-- Without a header the last chosen workspace applies; a header for someone else's workspace is ignored.
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select public.set_active_workspace(pg_temp.id('club'));
select is((select array_agg(title) from public.notes), array['Club plan'], 'no header: the last chosen workspace');
select pg_temp.login('cccccccc-0000-0000-0000-00000000000c');
select pg_temp.use_ws(pg_temp.id('duo'));
select is((select array_agg(title) from public.notes), array['Club plan'],
          'a header for a workspace you are not in is ignored');
select throws_ok(format($$select public.set_active_workspace(%L)$$, pg_temp.id('duo')), '42501', null,
                 'you cannot switch to a workspace you are not in');
select is((select count(*)::int from public.workspaces where id = pg_temp.id('duo')), 0,
          'nor see it');

-- Chat notifies everyone else.
select pg_temp.use_ws(pg_temp.id('club'));
insert into public.messages (workspace_id, sender_id, body)
values (pg_temp.id('club'), 'cccccccc-0000-0000-0000-00000000000c', 'Who is in for the weekend hackathon?');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.notifications where type = 'chat.message'), 1, 'Ana is notified');
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.notifications where type = 'chat.message'), 1, 'and so is Ben');

-- Roles: only the owner removes members; leaving hands ownership on; the last one out deletes.
select pg_temp.use_ws(pg_temp.id('club'));
select throws_ok($$select public.remove_workspace_member('cccccccc-0000-0000-0000-00000000000c')$$, '42501', null,
                 'a member cannot remove others');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select pg_temp.use_ws(pg_temp.id('club'));
select lives_ok($$select public.remove_workspace_member('cccccccc-0000-0000-0000-00000000000c')$$,
                'the owner can remove a member');
select public.leave_workspace(pg_temp.id('club'));
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select role from public.my_workspaces() where id = pg_temp.id('club')), 'owner',
          'when the owner leaves, the longest-standing member becomes owner');
select public.leave_workspace(pg_temp.id('club'));
select is((select array_agg(name) from public.my_workspaces()), array['Study duo'], 'Ben left the club');
reset role;
select isnt((select deleted_at from public.workspaces where id = pg_temp.id('club')), null,
            'the last member leaving deletes the workspace');

select pg_temp.login('cccccccc-0000-0000-0000-00000000000c');
select is((select count(*)::int from public.my_workspaces()), 0, 'a removed member no longer sees the workspace');

select * from finish();
rollback;
