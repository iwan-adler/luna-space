-- Phase 4: projects, tasks, comments, files, checklists (FR-PRJ-01–10, FR-OPP-15; AC-16).
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

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
create function pg_temp.anon() returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('role', 'anon')::text, true);
  select set_config('role', 'anon', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-prj.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-prj.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-prj.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Prj WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated, anon;

-- Convert an opportunity (FR-OPP-15, AC-16) --------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
insert into ids select 'opp', public.save_opportunity(null,
  '{"type":"hackathon","title":"Moonshot Hack","team_min":2,"team_max":4,"official_url":"https://moon.example/hack"}',
  '[{"kind":"event_start","all_day":true,"on_date":"2026-12-10"},
    {"kind":"submission_deadline","all_day":false,"at_time":"2026-12-20T18:29:00Z","source_timezone":"Asia/Kolkata"}]',
  null);
update public.opportunities set status = 'interested' where id = (select id from ids where name = 'opp');
insert into ids select 'proj', public.convert_opportunity_to_project((select id from ids where name = 'opp'));

select is((select name || '|' || category || '|' || stage from public.projects where id = (select id from ids where name = 'proj')),
          'Moonshot Hack|hackathon|planning', 'conversion copies the title and maps the category');
select is((select start_date::text || '→' || end_date::text from public.projects where id = (select id from ids where name = 'proj')),
          '2026-12-10→2026-12-20', 'dates come from the event start and the submission deadline (in its zone)');
select is((select links -> 0 ->> 'url' from public.projects where id = (select id from ids where name = 'proj')),
          'https://moon.example/hack', 'official link carried over');
select is((select status::text from public.opportunities where id = (select id from ids where name = 'opp')),
          'planning', 'opportunity moves to planning');
select is(public.convert_opportunity_to_project((select id from ids where name = 'opp')),
          (select id from ids where name = 'proj'), 'converting again returns the same project');
select is((select count(*)::int from public.project_members where project_id = (select id from ids where name = 'proj')),
          1, 'the creator becomes a project member');

-- Private project
with r as (insert into public.projects (workspace_id, owner_id, visibility, name)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'private', 'Secret plan')
  returning id) insert into ids select 'private', id from r;

-- Tasks -------------------------------------------------------------------------------------
with r as (insert into public.tasks (workspace_id, owner_id, project_id, title, assignee_id, position)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        (select id from ids where name = 'proj'), 'Build the demo', 'bbbbbbbb-0000-0000-0000-00000000000b', 1024)
  returning id) insert into ids select 'task', id from r;
select is((select workspace_id from public.tasks where id = (select id from ids where name = 'task')),
          '11111111-0000-0000-0000-000000000001'::uuid, 'task workspace comes from the project');

with r as (insert into public.tasks (workspace_id, owner_id, parent_task_id, title)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        (select id from ids where name = 'task'), 'Record the video')
  returning id) insert into ids select 'sub', id from r;
select is((select project_id from public.tasks where id = (select id from ids where name = 'sub')),
          (select id from ids where name = 'proj'), 'subtask inherits the project');
select throws_ok(format($$insert into public.tasks (workspace_id, owner_id, parent_task_id, title)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', %L, 'Too deep')$$,
  (select id from ids where name = 'sub')), '23514', 'Subtasks cannot have subtasks', 'only one level of subtasks');

select throws_ok(format($$insert into public.tasks (workspace_id, owner_id, project_id, title, assignee_id)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', %L, 'X',
          'dddddddd-0000-0000-0000-00000000000d')$$, (select id from ids where name = 'proj')),
  '23514', null, 'outsiders cannot be assigned');

update public.tasks set status = 'done' where id = (select id from ids where name = 'task');
select isnt((select completed_at from public.tasks where id = (select id from ids where name = 'task')), null,
            'completing sets completed_at');
update public.tasks set status = 'review' where id = (select id from ids where name = 'task');
select is((select completed_at from public.tasks where id = (select id from ids where name = 'task')), null,
          'reopening clears completed_at');
select ok((select count(*) >= 2 from public.activity_log where entity_id = (select id from ids where name = 'task')
             and action in ('task.completed', 'task.moved')), 'status changes are logged with the project');
select is((select project_id from public.activity_log
            where entity_id = (select id from ids where name = 'task') and action = 'task.created'),
          (select id from ids where name = 'proj'), 'task activity carries the project');

select throws_ok(format($$insert into public.tasks (workspace_id, owner_id, project_id, title, due_date, due_at, due_timezone)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', %L, 'X',
          '2026-12-01', now(), 'Asia/Kolkata')$$, (select id from ids where name = 'proj')),
  '23514', null, 'a task has either a due date or a due time, not both');

insert into public.tasks (workspace_id, owner_id, project_id, title)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        (select id from ids where name = 'private'), 'Private task');

with r as (insert into public.task_comments (workspace_id, task_id, author_id, body)
values ('22222222-0000-0000-0000-000000000002', (select id from ids where name = 'task'),
        'aaaaaaaa-0000-0000-0000-00000000000a', 'Looks good')
  returning id) insert into ids select 'comment', id from r;
select is((select workspace_id from public.task_comments where id = (select id from ids where name = 'comment')),
          '11111111-0000-0000-0000-000000000001'::uuid, 'comment workspace is taken from the task, not the client');

-- Partner B ---------------------------------------------------------------------------------
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.projects where workspace_id = '11111111-0000-0000-0000-000000000001'),
          1, 'partner sees the shared project but not the private one');
select is((select count(*)::int from public.tasks where project_id = (select id from ids where name = 'proj')),
          2, 'partner sees tasks of the shared project');
select is((select count(*)::int from public.tasks where project_id = (select id from ids where name = 'private')),
          0, 'partner cannot see tasks of a private project');
update public.tasks set status = 'in_progress', position = 512 where id = (select id from ids where name = 'task');
select is((select status::text from public.tasks where id = (select id from ids where name = 'task')),
          'in_progress', 'partner can move a shared task');
select throws_ok(format($$insert into public.task_comments (task_id, author_id, body)
  values (%L, 'aaaaaaaa-0000-0000-0000-00000000000a', 'Spoof')$$, (select id from ids where name = 'task')),
  '42501', null, 'partner cannot comment as someone else');
update public.task_comments set body = 'Edited by B' where id = (select id from ids where name = 'comment');
select is((select body from public.task_comments where id = (select id from ids where name = 'comment')),
          'Looks good', 'partner cannot edit A''s comment');

-- Outsider and anonymous ---------------------------------------------------------------------
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.projects where workspace_id = '11111111-0000-0000-0000-000000000001'),
          0, 'outsider sees no projects');
select is((select count(*)::int from public.tasks where workspace_id = '11111111-0000-0000-0000-000000000001'),
          0, 'outsider sees no tasks');
select throws_ok(format($$select public.convert_opportunity_to_project(%L)$$, (select id from ids where name = 'opp')),
                 'P0002', null, 'outsider cannot convert another workspace''s opportunity');
select pg_temp.anon();
select throws_ok('select count(*) from public.tasks', '42501', null, 'anon cannot read tasks');

-- Files (FR-PRJ-07, NFR-SEC-08) --------------------------------------------------------------
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes, task_id)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        '11111111-0000-0000-0000-000000000001/f1/deck.pdf', 'deck.pdf', 'application/pdf', 2048,
        (select id from ids where name = 'task'))
  returning id) insert into ids select 'file', id from r;
select is((select project_id from public.files where id = (select id from ids where name = 'file')),
          (select id from ids where name = 'proj'), 'task attachment belongs to the task''s project');
select throws_ok($$insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
          '11111111-0000-0000-0000-000000000001/x/run.exe', 'run.exe', 'application/x-msdownload', 10)$$,
  '23514', null, 'disallowed MIME types are rejected');
select throws_ok($$insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
          '22222222-0000-0000-0000-000000000002/x/a.pdf', 'a.pdf', 'application/pdf', 10)$$,
  '23514', null, 'storage path must start with the workspace id');
select throws_ok(format($$select public.confirm_upload(%L)$$, (select id from ids where name = 'file')),
                 'P0001', 'The file has not been uploaded', 'cannot confirm an upload that is not in storage');
select throws_ok(format($$update public.files set upload_state = 'stored' where id = %L$$, (select id from ids where name = 'file')),
                 '42501', null, 'clients cannot mark files stored directly');
select pg_temp.logout();
select is((select public from storage.buckets where id = 'workspace-files'), false, 'the bucket is private');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');

-- Checklists (FR-PRJ-08/09) ------------------------------------------------------------------
select is((select count(*)::int from public.templates where is_builtin), 4, 'four built-in templates');
insert into ids select 'checklist', public.create_checklist_from_template((select id from ids where name = 'proj'),
  (select id from public.templates where title = 'Generic hackathon submission'));
select is((select count(*)::int from public.checklist_items where checklist_id = (select id from ids where name = 'checklist')),
          10, 'checklist created with every template item');
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
update public.checklist_items set is_done = true
 where checklist_id = (select id from ids where name = 'checklist') and position = 1024;
select is((select done_by from public.checklist_items
            where checklist_id = (select id from ids where name = 'checklist') and position = 1024),
          'bbbbbbbb-0000-0000-0000-00000000000b'::uuid, 'ticking records who completed the item');
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.checklist_items where checklist_id = (select id from ids where name = 'checklist')),
          0, 'outsider cannot see checklist items');

select pg_temp.logout();
select * from finish();
rollback;
