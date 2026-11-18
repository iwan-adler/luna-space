-- Recycle bin, restore and purge (FR-PLAT-10, AC-07).
begin;
create extension if not exists pgtap with schema extensions;
select plan(19);

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

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-bin.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-bin.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-bin.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Bin WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where name = p $$;

-- Ana: a project with a task (with a comment and a file), notes, a folder tree.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.projects (workspace_id, owner_id, name)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Rover')
           returning id) insert into ids select 'project', id from r;
with r as (insert into public.tasks (workspace_id, owner_id, project_id, title, position)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   pg_temp.id('project'), 'Wire the motors', 1024) returning id)
  insert into ids select 'task', id from r;
insert into public.task_comments (workspace_id, task_id, author_id, body)
values ('11111111-0000-0000-0000-000000000001', pg_temp.id('task'), 'aaaaaaaa-0000-0000-0000-00000000000a', 'Use the 12V ones');
with r as (insert into public.vault_folders (workspace_id, owner_id, name)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Research')
           returning id) insert into ids select 'folder', id from r;
with r as (insert into public.vault_folders (workspace_id, owner_id, parent_id, name)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   pg_temp.id('folder'), 'Papers') returning id) insert into ids select 'subfolder', id from r;
with r as (insert into public.notes (workspace_id, owner_id, title, folder_id)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Ideas',
                   pg_temp.id('folder')) returning id) insert into ids select 'note', id from r;
with r as (insert into public.notes (workspace_id, owner_id, title, visibility)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Diary',
                   'private') returning id) insert into ids select 'private', id from r;
select pg_temp.logout();
with r as (insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes,
                                     task_id, upload_state)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   '11111111-0000-0000-0000-000000000001/f1/wiring.pdf', 'wiring.pdf', 'application/pdf', 10,
                   pg_temp.id('task'), 'stored') returning id) insert into ids select 'file', id from r;

-- Ana deletes the task, the private note and the Research folder (the note moves out of it).
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
update public.tasks set deleted_at = now(), deleted_by = 'aaaaaaaa-0000-0000-0000-00000000000a' where id = pg_temp.id('task');
update public.notes set deleted_at = now(), deleted_by = 'aaaaaaaa-0000-0000-0000-00000000000a' where id = pg_temp.id('private');
update public.notes set deleted_at = now(), deleted_by = 'aaaaaaaa-0000-0000-0000-00000000000a' where id = pg_temp.id('note');
update public.vault_folders set deleted_at = now(), deleted_by = 'aaaaaaaa-0000-0000-0000-00000000000a' where id = pg_temp.id('folder');
select is((select array_agg(kind || ':' || title order by kind, title) from public.recycle_bin()),
          array['folder:Research', 'note:Diary', 'note:Ideas', 'task:Wire the motors'],
          'the owner sees what was deleted (a sub-folder is listed with its folder)');

-- Ben, the partner.
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select array_agg(kind || ':' || title order by kind, title) from public.recycle_bin()),
          array['folder:Research', 'note:Ideas', 'task:Wire the motors'],
          'the partner sees shared items, not the private note');
select lives_ok(format($$select public.restore_item('task', %L)$$, pg_temp.id('task')),
                'the partner can restore a shared task');
select is((select deleted_at from public.tasks where id = pg_temp.id('task')), null, 'the task is back (AC-07)');
select is((select count(*)::int from public.task_comments where task_id = pg_temp.id('task')), 1,
          'with its comment');
select is((select count(*)::int from public.files where task_id = pg_temp.id('task') and deleted_at is null), 1,
          'and its attachment');
select throws_ok(format($$select public.restore_item('note', %L)$$, pg_temp.id('private')),
                 'P0002', null, 'the partner cannot restore the owner''s private note');
select throws_ok(format($$select public.restore_item('folder', %L)$$, pg_temp.id('subfolder')),
                 'P0001', null, 'a sub-folder waits for its parent folder');
select lives_ok(format($$select public.restore_item('folder', %L)$$, pg_temp.id('folder')), 'a folder can be restored');
select is((select count(*)::int from public.vault_folders where deleted_at is null), 2,
          'with the sub-folders deleted together with it');

-- A note whose folder is deleted comes back at the top level.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
update public.notes set folder_id = pg_temp.id('subfolder') where id = pg_temp.id('note');
select pg_temp.logout();
-- (skip the trigger that would move the note out, as if the folder had gone some other way)
set local session_replication_role = replica;
update public.vault_folders set deleted_at = now() where id = pg_temp.id('subfolder');
set local session_replication_role = origin;
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select public.restore_item('note', pg_temp.id('note'));
select is((select folder_id from public.notes where id = pg_temp.id('note')), null,
          'a note whose folder is gone is restored to the top level');

-- After 30 days an item is no longer restorable or listed.
select pg_temp.logout();
update public.notes set deleted_at = now() - interval '31 days' where id = pg_temp.id('private');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select ok(not exists (select 1 from public.recycle_bin() where id = pg_temp.id('private')),
          'items older than 30 days are not listed');
select throws_ok(format($$select public.restore_item('note', %L)$$, pg_temp.id('private')),
                 'P0002', null, 'and cannot be restored');

-- Outsiders and anonymous visitors.
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.recycle_bin()), 0, 'an outsider sees an empty bin');
select throws_ok($$select public.purge_prepare()$$, '42501', null, 'members cannot run the purge');
select pg_temp.logout();
set local role anon;
select throws_ok($$select * from public.recycle_bin()$$, '42501', null, 'anonymous visitors have no bin');
reset role;

-- Purge: a project deleted 31 days ago takes its task's file along; nothing is left behind.
update public.projects set deleted_at = now() - interval '31 days' where id = pg_temp.id('project');
select is((select array_agg(storage_path) from public.purge_prepare()),
          array['11111111-0000-0000-0000-000000000001/f1/wiring.pdf'],
          'files of an expired project are handed over for storage removal');
select is(public.purge_finish(array[pg_temp.id('file')]) ->> 'projects', '1',
          'the project is purged once its files are gone');
select is((select count(*)::int from public.notes where id = pg_temp.id('private')), 0,
          'expired notes are purged');

select * from finish();
rollback;
