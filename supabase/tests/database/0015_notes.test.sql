-- Shared notepad (FR-VAULT-02): privacy, optimistic concurrency, editor stamp.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

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
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-notes.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-notes.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-notes.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Notes WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.notes (workspace_id, owner_id, title, body_md)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   'Ideas', '- [ ] pick a track') returning id)
  insert into ids select 'shared', id from r;
with r as (insert into public.notes (workspace_id, owner_id, title, visibility)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   'Diary', 'private') returning id)
  insert into ids select 'private', id from r;

select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select array_agg(title) from public.notes), array['Ideas'], 'the partner sees shared notes only');
select is(public.save_note((select id from ids where name = 'shared'), 'Ideas', '- [x] pick a track', 1) ->> 'version',
          '2', 'the partner can edit a shared note');
select is((select updated_by from public.notes where id = (select id from ids where name = 'shared')),
          'bbbbbbbb-0000-0000-0000-00000000000b'::uuid, 'the last editor is recorded');
select is(public.save_note((select id from ids where name = 'private'), 'Diary', 'peek', 1) ->> 'code',
          'NOT_FOUND', 'the partner cannot edit a private note');
select throws_ok(format($$update public.notes set visibility = 'private' where id = %L$$, (select id from ids where name = 'shared')),
                 '42501', null, 'the partner cannot make someone else''s note private');

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is(public.save_note((select id from ids where name = 'shared'), 'Ideas', 'my stale edit', 1) ->> 'code',
          'VERSION_CONFLICT', 'a save based on an old version is refused');
select is(public.save_note((select id from ids where name = 'shared'), 'Ideas', 'my stale edit', 1) ->> 'body_md',
          '- [x] pick a track', 'and the current text comes back to choose from');
select is(public.save_note((select id from ids where name = 'shared'), 'Ideas v2', 'merged', 2) ->> 'version',
          '3', 'saving on top of the latest version works');
select throws_ok(format($$update public.notes set owner_id = 'bbbbbbbb-0000-0000-0000-00000000000b' where id = %L$$,
                 (select id from ids where name = 'shared')), '42501', null, 'the owner cannot be changed');
select throws_ok($$insert into public.notes (workspace_id, owner_id, title, guest_visible)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'X', true)$$,
  '23514', null, 'only project notes can be visible to guests');

select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.notes), 0, 'outsiders see no notes');
select pg_temp.logout();
select ok(exists (select 1 from public.activity_log where action = 'note.created' and entity_id = (select id from ids where name = 'shared')),
          'creating a note is logged');

select * from finish();
rollback;
