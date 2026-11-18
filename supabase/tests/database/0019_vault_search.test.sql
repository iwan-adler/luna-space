-- Vault and search (FR-VAULT-01, 03–06; FR-PLAT-11): folders, bookmarks, privacy, search.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

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

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-vault.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-vault.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-vault.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Vault WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where name = p $$;
create function pg_temp.folder(p_name text, p_parent text, p_vis text default 'shared') returns uuid
language sql as $$
  with r as (insert into public.vault_folders (workspace_id, owner_id, parent_id, name, visibility)
             values ('11111111-0000-0000-0000-000000000001', (select auth.uid()), pg_temp.id(p_parent), p_name,
                     p_vis::public.visibility) returning id)
  insert into ids select p_name, id from r returning id;
$$;

-- Ana builds Research > Papers > 2026 > Spring, and a private Diary with a sub-folder.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select pg_temp.folder('Research', null);
select pg_temp.folder('Papers', 'Research');
select pg_temp.folder('2026', 'Papers');
select pg_temp.folder('Spring', '2026');
select is((select depth from public.vault_folders where id = pg_temp.id('Spring')), 4::smallint,
          'depth follows the parent');
select throws_ok($$select pg_temp.folder('Too deep', 'Spring')$$, 'P0001', null,
                 'folders nest at most 4 levels');
select throws_ok($$select pg_temp.folder('papers', 'Research')$$, '23505', null,
                 'sibling folder names are unique');
select pg_temp.folder('Diary', null, 'private');
select pg_temp.folder('Dreams', 'Diary');
select is((select visibility::text from public.vault_folders where id = pg_temp.id('Dreams')), 'private',
          'a folder inside a private folder is private');

with r as (insert into public.notes (workspace_id, owner_id, title, body_md, folder_id)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   'Hackathon ideas', 'Build a lunar rover dashboard for the hackathon', pg_temp.id('Spring'))
           returning id)
  insert into ids select 'note', id from r;
with r as (insert into public.notes (workspace_id, owner_id, title, body_md, visibility)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   'Secret hackathon plan', 'just mine', 'private') returning id)
  insert into ids select 'private note', id from r;
with r as (insert into public.bookmarks (workspace_id, owner_id, url, title, description, tags, folder_id)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                   'https://example.org/rovers', 'Rover design guide', 'Wheels and suspension',
                   '{robotics}', pg_temp.id('Papers')) returning id)
  insert into ids select 'bookmark', id from r;
insert into public.bookmarks (workspace_id, owner_id, url, title, visibility)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        'https://example.org/me', 'My private link', 'private');
select throws_ok($$insert into public.bookmarks (workspace_id, owner_id, url, title)
                   values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                           'javascript:alert(1)', 'Bad')$$, '23514', null, 'only http(s) links are accepted');
insert into public.messages (workspace_id, sender_id, body)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        'Shall we enter the robotics hackathon?');

-- Ben, the partner.
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.vault_folders), 4, 'the partner sees shared folders only');
select is((select array_agg(title) from public.bookmarks), array['Rover design guide'],
          'the partner sees shared bookmarks only');
select throws_ok(format($$insert into public.vault_folders (workspace_id, owner_id, parent_id, name)
                          values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', %L, 'Mine')$$,
                        pg_temp.id('Diary')),
                 '42501', null, 'the partner cannot add a folder inside a private folder');
select throws_ok(format($$update public.notes set folder_id = %L where id = %L$$, pg_temp.id('Diary'), pg_temp.id('note')),
                 'P0002', null, 'the partner cannot file a note into a private folder');
select lives_ok(format($$update public.bookmarks set folder_id = %L, tags = '{robotics,reading}' where id = %L$$,
                       pg_temp.id('Research'), pg_temp.id('bookmark')),
                'the partner can move and tag a shared bookmark');
select throws_ok(format($$update public.vault_folders set parent_id = null where id = %L$$, pg_temp.id('Papers')),
                 '42501', null, 'folders cannot be moved by changing the parent');

-- Search.
select is((select array_agg(kind order by kind) from public.search_workspace('hack')),
          array['message', 'note'], 'a prefix finds the shared note and the message');
select ok((select snippet from public.search_workspace('lunar rov') where kind = 'note') like '%⟦lunar⟧%',
          'matches come back marked for highlighting');
select is((select count(*)::int from public.search_workspace('secret')), 0,
          'search never returns the partner''s private note');
select is((select array_agg(kind) from public.search_workspace('rover', array['bookmark'])), array['bookmark'],
          'search can be limited to kinds');
select is((select count(*)::int from public.search_workspace('the and of')), 0,
          'a query of only common words returns nothing');

-- Deleting a folder keeps its contents: they move up to its parent.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
update public.vault_folders set deleted_at = now(), deleted_by = 'aaaaaaaa-0000-0000-0000-00000000000a'
 where id = pg_temp.id('Papers');
select is((select folder_id from public.notes where id = pg_temp.id('note')), pg_temp.id('Research'),
          'a note in a deleted sub-folder moves to the deleted folder''s parent');
select is((select count(*)::int from public.vault_folders where deleted_at is null), 3,
          'sub-folders are deleted with their folder');

-- Outsiders and anonymous visitors.
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.vault_folders) + (select count(*)::int from public.bookmarks)
          + (select count(*)::int from public.search_workspace('hackathon')), 0,
          'an outsider sees no folders, bookmarks or search results');
select pg_temp.logout();
set local role anon;
select throws_ok($$select * from public.search_workspace('hack')$$, '42501', null,
                 'anonymous visitors cannot search');

select * from finish();
rollback;
