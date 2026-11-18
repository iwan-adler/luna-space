-- Chat (FR-CHAT-01–07; AC-21): access, own edits and deletes, reactions, read state, notifications.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create function pg_temp.login(p_id uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('role', 'authenticated', true);
$$;
create function pg_temp.logout() returns void language sql as $$
  select set_config('request.jwt.claims', '', true);
  select set_config('role', 'postgres', true);
$$;

insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data) values
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'a@pgtap-chat.test', 'authenticated', 'authenticated', now(), '{"display_name":"Ana"}'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'b@pgtap-chat.test', 'authenticated', 'authenticated', now(), '{"display_name":"Ben"}'),
  ('dddddddd-0000-0000-0000-00000000000d', 'o@pgtap-chat.test', 'authenticated', 'authenticated', now(), '{"display_name":"Olu"}');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Chat WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1);

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.messages (workspace_id, sender_id, body)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Hi **Ben**')
           returning id) insert into ids select 'm1', id from r;
insert into public.messages (workspace_id, sender_id, body)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'Second one');
select throws_ok($$insert into public.messages (workspace_id, sender_id, body)
  values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'spoof')$$,
  '42501', null, 'nobody can send as someone else');
select throws_ok($$insert into public.messages (workspace_id, sender_id, kind, body)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'system', 'x')$$,
  '42501', null, 'clients cannot post system messages');

select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.messages), 2, 'the partner sees the conversation');
select is((select count(*)::int from public.notifications where type = 'chat.message'), 1,
          'a burst of messages makes one notification');
select is((select title from public.notifications where type = 'chat.message'), 'Ana: Hi **Ben**',
          'the notification says who wrote what');
update public.messages set body = 'hacked' where id = (select id from ids where name = 'm1');
select is((select body from public.messages where id = (select id from ids where name = 'm1')), 'Hi **Ben**',
          'the partner cannot edit someone else''s message');
with r as (insert into public.messages (workspace_id, sender_id, body, reply_to_id)
           values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 'Hello!',
                   (select id from ids where name = 'm1')) returning id) insert into ids select 'reply', id from r;
insert into public.message_reactions (workspace_id, message_id, user_id, emoji)
values ('22222222-0000-0000-0000-000000000002', (select id from ids where name = 'm1'),
        'bbbbbbbb-0000-0000-0000-00000000000b', '❤️');
select is((select workspace_id from public.message_reactions limit 1), '11111111-0000-0000-0000-000000000001'::uuid,
          'a reaction''s workspace comes from its message');
select throws_ok(format($$insert into public.message_reactions (workspace_id, message_id, user_id, emoji)
  values ('11111111-0000-0000-0000-000000000001', %L, 'aaaaaaaa-0000-0000-0000-00000000000a', '👍')$$,
  (select id from ids where name = 'm1')), '42501', null, 'nobody reacts as someone else');
select public.mark_chat_read((select id from ids where name = 'reply'));
select is((select count(*)::int from public.notifications where type = 'chat.message' and read_at is null), 0,
          'reading the chat clears its notifications');

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select last_read_message_id from public.chat_read_state where user_id = 'bbbbbbbb-0000-0000-0000-00000000000b'),
          (select id from ids where name = 'reply'), 'the sender can see how far the partner has read (receipts)');
update public.messages set body = 'Hi Ben, edited' where id = (select id from ids where name = 'm1');
select isnt((select edited_at from public.messages where id = (select id from ids where name = 'm1')), null,
            'editing marks the message as edited');
insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes, message_id)
values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
        '11111111-0000-0000-0000-000000000001/c1/a.pdf', 'a.pdf', 'application/pdf', 10,
        (select id from ids where name = 'm1'));
select throws_ok(format($$insert into public.files (workspace_id, owner_id, storage_path, file_name, mime_type, size_bytes, message_id)
  values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
          '11111111-0000-0000-0000-000000000001/c2/b.pdf', 'b.pdf', 'application/pdf', 10, %L)$$,
  (select id from ids where name = 'reply')), '42501', null, 'attachments only go on your own messages');
update public.messages set deleted_at = now() where id = (select id from ids where name = 'm1');
select is((select body from public.messages where id = (select id from ids where name = 'm1')), null,
          'deleting removes the content (AC-21)');
select pg_temp.logout();
select isnt((select deleted_at from public.files where storage_path like '%/c1/a.pdf'), null,
            'and soft-deletes its attachments');

select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.messages), 0, 'outsiders read no messages');
select is((select count(*)::int from public.chat_read_state), 0, 'nor read states');

select pg_temp.logout();
select * from finish();
rollback;
