-- Phase 4b: project-scoped guests (FR-GUEST-01–15; AC-26, 27, 29–34; Schema §31.6).
begin;
create extension if not exists pgtap with schema extensions;
select plan(50);

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

-- People: members A and B; guests V (viewer), C (collaborator), P (project admin), X (another room);
-- outsider O with a workspace of their own.
select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-gst.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-gst.test');
select pg_temp.new_user('c1c1c1c1-0000-0000-0000-0000000000c1', 'viewer@pgtap-gst.test');
select pg_temp.new_user('c2c2c2c2-0000-0000-0000-0000000000c2', 'collab@pgtap-gst.test');
select pg_temp.new_user('c3c3c3c3-0000-0000-0000-0000000000c3', 'padmin@pgtap-gst.test');
select pg_temp.new_user('c4c4c4c4-0000-0000-0000-0000000000c4', 'other@pgtap-gst.test');
select pg_temp.new_user('c5c5c5c5-0000-0000-0000-0000000000c5', 'late@pgtap-gst.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-gst.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Guest WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid, token text) on commit drop;
grant all on ids to authenticated;

-- A sets up two rooms, a private project, tasks, an opportunity and a loose task ------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.projects (workspace_id, owner_id, name)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Room One')
           returning id) insert into ids select 'room', id from r;
with r as (insert into public.projects (workspace_id, owner_id, name)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Room Two')
           returning id) insert into ids select 'room2', id from r;
with r as (insert into public.projects (workspace_id, owner_id, name, visibility)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Mine', 'private')
           returning id) insert into ids select 'private', id from r;
with r as (insert into public.tasks (workspace_id, owner_id, project_id, title)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   (select id from ids where name = 'room'), 'Shared with guests') returning id)
  insert into ids select 'task', id from r;
with r as (insert into public.tasks (workspace_id, owner_id, project_id, title, guest_visible)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   (select id from ids where name = 'room'), 'Members only', false) returning id)
  insert into ids select 'hidden', id from r;
insert into public.tasks (workspace_id, owner_id, project_id, title)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        (select id from ids where name = 'room2'), 'Other room task');
insert into public.tasks (workspace_id, owner_id, title)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Loose task');
select public.save_opportunity(null, '{"type":"hackathon","title":"Secret Hack"}', '[]', null);

select is((select count(*)::int from public.project_guest_settings where project_id = (select id from ids where name = 'room')),
          1, 'every new project gets guest settings');
select is((select guest_visible from public.tasks where title = 'Loose task'), false,
          'loose tasks are never visible to guests');

-- Invitations (FR-GUEST-01–03) --------------------------------------------------------------
create function pg_temp.invite(p_name text, p_project text, p_role public.guest_role, p_max int) returns void
language sql as $$
  insert into ids select p_name, (r ->> 'id')::uuid, r ->> 'token'
    from (select public.create_project_invitation((select id from ids where name = p_project), p_role, 168, p_max, p_name) r) x;
$$;
select pg_temp.invite('inv_view', 'room', 'viewer', 1);
select pg_temp.invite('inv_collab', 'room', 'collaborator', 2);
select pg_temp.invite('inv_admin', 'room', 'project_admin', 1);
select pg_temp.invite('inv_other', 'room2', 'collaborator', null);
select is((select count(*)::int from ids where name like 'inv_%' and token is not null), 4,
          'members can create invitations with every role');
select is(public.create_project_invitation((select id from ids where name = 'private'), 'viewer', 168, null, null) ->> 'code',
          'ROOM_NOT_SHAREABLE', 'private projects cannot have guests');
select is(public.create_project_invitation((select id from ids where name = 'room'), 'viewer', 5, null, null) ->> 'code',
          '22023', 'only the offered expiry options are accepted');
select throws_ok('select token_hash from public.project_guest_invitations', '42501', null,
                 'token hashes are never readable');

-- Acceptance (FR-GUEST-04/05, AC-26/27) ------------------------------------------------------
select pg_temp.login('c1c1c1c1-0000-0000-0000-0000000000c1');
select is(public.accept_project_invitation((select token from ids where name = 'inv_view')) ->> 'role', 'viewer',
          'viewer joins with the invited role');
select pg_temp.login('c2c2c2c2-0000-0000-0000-0000000000c2');
select is(public.accept_project_invitation((select token from ids where name = 'inv_collab')) ->> 'ok', 'true',
          'collaborator joins');
select is(public.accept_project_invitation((select token from ids where name = 'inv_collab')) ->> 'ok', 'true',
          'accepting again is idempotent');
select pg_temp.login('c3c3c3c3-0000-0000-0000-0000000000c3');
select is(public.accept_project_invitation((select token from ids where name = 'inv_admin')) ->> 'role', 'project_admin',
          'project admin joins');
select pg_temp.login('c4c4c4c4-0000-0000-0000-0000000000c4');
select is(public.accept_project_invitation((select token from ids where name = 'inv_view')) ->> 'code', 'INVITE_INVALID',
          'a used-up invitation is invalid');
select is(public.accept_project_invitation((select token from ids where name = 'inv_other')) ->> 'ok', 'true',
          'X joins the other room');
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is(public.accept_project_invitation((select token from ids where name = 'inv_collab')) ->> 'code', 'ALREADY_MEMBER',
          'a workspace member does not become a guest');
select pg_temp.logout();
select is((select count(*)::int from public.workspace_members where workspace_id = '11111111-0000-0000-0000-000000000001'),
          2, 'guests never enter workspace_members (AC-26)');
select is((select use_count::int from public.project_guest_invitations where id = (select id from ids where name = 'inv_collab')),
          1, 'use count only counts new memberships');

-- Viewer (FR-GUEST-06) ----------------------------------------------------------------------
select pg_temp.login('c1c1c1c1-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.projects), 1, 'viewer sees only their room');
select is((select array_agg(title) from public.tasks), array['Shared with guests'],
          'viewer sees only guest-visible tasks of their room');
select throws_ok(format($$insert into public.tasks (workspace_id, owner_id, project_id, title)
  values ('11111111-0000-0000-0000-000000000001', 'c1c1c1c1-0000-0000-0000-0000000000c1', %L, 'V task')$$,
  (select id from ids where name = 'room')), '42501', null, 'viewer cannot create tasks (AC-33)');
update public.tasks set title = 'Renamed by viewer' where id = (select id from ids where name = 'task');
select pg_temp.logout();
select is((select title from public.tasks where id = (select id from ids where name = 'task')), 'Shared with guests',
          'viewer cannot update tasks');
select pg_temp.login('c1c1c1c1-0000-0000-0000-0000000000c1');
select throws_ok(format($$insert into public.task_comments (workspace_id, task_id, author_id, body)
  values ('11111111-0000-0000-0000-000000000001', %L, 'c1c1c1c1-0000-0000-0000-0000000000c1', 'Hi')$$,
  (select id from ids where name = 'task')), '42501', null, 'viewers cannot comment by default');

-- AC-29: nothing outside the room ------------------------------------------------------------
select is((select count(*)::int from public.opportunities), 0, 'guest reads no opportunities');
select is((select count(*)::int from public.workspace_members), 0, 'guest reads no workspace members');
select is((select count(*)::int from public.profiles where id <> 'c1c1c1c1-0000-0000-0000-0000000000c1'), 0,
          'guest reads no other profiles directly');
select is((select count(*)::int from public.project_directory((select id from ids where name = 'room'))), 5,
          'the room directory lists 2 members and 3 guests');
select is((select count(*)::int from public.project_guest_invitations), 0, 'viewers do not see invitations');

-- Collaborator ------------------------------------------------------------------------------
select pg_temp.login('c2c2c2c2-0000-0000-0000-0000000000c2');
with r as (insert into public.tasks (workspace_id, owner_id, project_id, title, guest_visible)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   (select id from ids where name = 'room'), 'Guest task', false) returning id)
  insert into ids select 'gtask', id from r;
select pg_temp.logout();
select is((select owner_id::text || ' ' || guest_visible from public.tasks where id = (select id from ids where name = 'gtask')),
          'c2c2c2c2-0000-0000-0000-0000000000c2 true', 'guest-created tasks are owned by the guest and visible to guests');
select pg_temp.login('c2c2c2c2-0000-0000-0000-0000000000c2');
select throws_ok(format($$insert into public.tasks (workspace_id, owner_id, project_id, title)
  values ('11111111-0000-0000-0000-000000000001', 'c2c2c2c2-0000-0000-0000-0000000000c2', %L, 'Elsewhere')$$,
  (select id from ids where name = 'room2')), '42501', null, 'collaborator cannot create tasks in another room');
select throws_ok(format($$update public.tasks set guest_visible = false where id = %L$$, (select id from ids where name = 'task')),
                 '42501', null, 'guests cannot hide items from guests');
select throws_ok(format($$update public.tasks set deleted_at = now() where id = %L$$, (select id from ids where name = 'task')),
                 '42501', null, 'guests cannot delete items members created');
update public.tasks set status = 'in_progress', assignee_id = 'c2c2c2c2-0000-0000-0000-0000000000c2'
 where id = (select id from ids where name = 'task');
select is((select status::text from public.tasks where id = (select id from ids where name = 'task')), 'in_progress',
          'collaborator can move and take a guest-visible task');
update public.tasks set title = 'Peek' where id = (select id from ids where name = 'hidden');
insert into public.task_comments (workspace_id, task_id, author_id, body)
values ('11111111-0000-0000-0000-000000000001', (select id from ids where name = 'task'),
        'c2c2c2c2-0000-0000-0000-0000000000c2', 'On it');
select is((select count(*)::int from public.task_comments), 1, 'collaborator can comment');
select pg_temp.logout();
select is((select title from public.tasks where id = (select id from ids where name = 'hidden')), 'Members only',
          'hidden tasks cannot be changed by guests');
select throws_ok(format($$update public.tasks set assignee_id = 'c2c2c2c2-0000-0000-0000-0000000000c2' where id = %L$$,
                 (select id from ids where name = 'hidden')), '23514', null, 'guests can only be assigned guest-visible items');

-- Files and activity (FR-GUEST-08, 13; AC-30) -------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes, project_id)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   '11111111-0000-0000-0000-000000000001/g1/plan.pdf', 'plan.pdf', 'application/pdf', 100,
                   (select id from ids where name = 'room')) returning id) insert into ids select 'file', id from r;
select throws_ok($$insert into public.files (workspace_id, owner_id, visibility, guest_visible, storage_path, file_name,
  mime_type, size_bytes) values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
  'private', true, '11111111-0000-0000-0000-000000000001/g2/a.pdf', 'a.pdf', 'application/pdf', 1)$$,
  '23514', null, 'a private file cannot be visible to guests');
select pg_temp.login('c1c1c1c1-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.files), 0, 'files are hidden from guests by default');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
update public.files set guest_visible = true where id = (select id from ids where name = 'file');
select pg_temp.login('c1c1c1c1-0000-0000-0000-0000000000c1');
select is((select count(*)::int from public.files), 1, 'after a member shares it, guests can see the file');
select ok((select bool_and(guest_visible) from public.activity_log), 'guests see only guest-visible activity');
select ok(exists (select 1 from public.activity_log where action = 'task.created' and summary like '%Guest task%'),
          'guest actions appear in room activity');

-- Project admin (FR-GUEST-06, AC-34) ----------------------------------------------------------
select pg_temp.login('c3c3c3c3-0000-0000-0000-0000000000c3');
update public.projects set name = 'Room One (renamed)' where id = (select id from ids where name = 'room');
select is((select name from public.projects where id = (select id from ids where name = 'room')), 'Room One (renamed)',
          'project admin can edit project details');
select throws_ok(format($$update public.projects set visibility = 'private' where id = %L$$, (select id from ids where name = 'room')),
                 '42501', null, 'project admin cannot change visibility');
select throws_ok(format($$update public.projects set deleted_at = now() where id = %L$$, (select id from ids where name = 'room')),
                 '42501', null, 'project admin cannot delete the project');
select is(public.create_project_invitation((select id from ids where name = 'room'), 'project_admin', 24, null, null) ->> 'code',
          'MEMBERS_ONLY_ADMIN', 'only members can grant project admin');
select is(public.set_guest_role((select id from public.project_guest_memberships
                                  where user_id = 'c1c1c1c1-0000-0000-0000-0000000000c1'), 'project_admin') ->> 'code',
          '42501', 'project admin cannot promote a guest to project admin');
select is((select count(*)::int from public.workspaces), 0, 'project admin cannot read workspace settings');
update public.project_guest_settings set viewers_can_comment = true where project_id = (select id from ids where name = 'room');
select pg_temp.login('c1c1c1c1-0000-0000-0000-0000000000c1');
select lives_ok(format($$insert into public.task_comments (workspace_id, task_id, author_id, body)
  values ('11111111-0000-0000-0000-000000000001', %L, 'c1c1c1c1-0000-0000-0000-0000000000c1', 'Thanks')$$,
  (select id from ids where name = 'task')), 'room settings let viewers comment once enabled');

-- Removal and cap (FR-GUEST-07, 09; AC-31) -----------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is(public.remove_project_guest((select id from public.project_guest_memberships
                                        where user_id = 'c2c2c2c2-0000-0000-0000-0000000000c2')) ->> 'ok', 'true',
          'a member removes the collaborator');
select is((select assignee_id from public.tasks where id = (select id from ids where name = 'task')), null,
          'removal clears the guest''s open assignments');
select pg_temp.login('c2c2c2c2-0000-0000-0000-0000000000c2');
select is((select count(*)::int from public.tasks) + (select count(*)::int from public.projects), 0,
          'a removed guest sees nothing of the room');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
update public.project_guest_settings set max_guests = 2 where project_id = (select id from ids where name = 'room');
select pg_temp.invite('inv_late', 'room', 'viewer', null);
select pg_temp.login('c5c5c5c5-0000-0000-0000-0000000000c5');
select is(public.accept_project_invitation((select token from ids where name = 'inv_late')) ->> 'code', 'ROOM_FULL',
          'a full room rejects new guests');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select public.revoke_project_invitation((select id from ids where name = 'inv_late'));
update public.project_guest_settings set max_guests = 10 where project_id = (select id from ids where name = 'room');
select pg_temp.login('c5c5c5c5-0000-0000-0000-0000000000c5');
select is(public.accept_project_invitation((select token from ids where name = 'inv_late')) ->> 'code', 'INVITE_INVALID',
          'a revoked invitation is invalid (AC-32)');

select pg_temp.logout();
select * from finish();
rollback;
