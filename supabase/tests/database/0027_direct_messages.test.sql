-- Direct messages, private or public (ADR 0024).
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

create function pg_temp.new_user(p_id uuid, p_email text) returns uuid language sql as $$
  insert into auth.users (id, email, aud, role, email_confirmed_at, raw_user_meta_data)
  values (p_id, p_email, 'authenticated', 'authenticated', now(),
          jsonb_build_object('display_name', initcap(split_part(p_email, '@', 1))))
  returning id;
$$;
create function pg_temp.login(p_id uuid, p_ws uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_id, 'role', 'authenticated')::text, true);
  select set_config('request.headers', json_build_object('x-workspace-id', p_ws)::text, true);
  select set_config('role', 'authenticated', true);
$$;

-- Ana (owner), Ben and Chitra share a workspace; Dev is in another one.
select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@pgtap-dm.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'ben@pgtap-dm.test');
select pg_temp.new_user('cccccccc-0000-0000-0000-00000000000c', 'chitra@pgtap-dm.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'dev@pgtap-dm.test');
insert into public.workspaces (id, name, max_members) values
  ('11111111-0000-0000-0000-000000000001', 'DM WS', 5),
  ('22222222-0000-0000-0000-000000000002', 'Other WS', 2);
insert into public.workspace_members (workspace_id, user_id, seat, role) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1, 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2, 'member'),
  ('11111111-0000-0000-0000-000000000001', 'cccccccc-0000-0000-0000-00000000000c', 3, 'member'),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1, 'owner');

-- Ana sends Ben a private message, a public one, and a team message.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000001');
insert into public.messages (id, workspace_id, sender_id, recipient_id, is_private, body) values
  ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-00000000000b', true, 'secret plan'),
  ('a0000000-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-00000000000b', false, 'public note to Ben'),
  ('a0000000-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001',
   'aaaaaaaa-0000-0000-0000-00000000000a', null, false, 'hello team');
insert into public.message_reactions (message_id, workspace_id, user_id, emoji)
values ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
        'aaaaaaaa-0000-0000-0000-00000000000a', '🎉');
select is((select count(*)::int from public.messages), 3, 'the sender sees all three');

select throws_ok($$insert into public.messages (workspace_id, sender_id, recipient_id, is_private, body)
                   values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                           'dddddddd-0000-0000-0000-00000000000d', true, 'hi')$$,
                 '23514', null, 'no DMs to someone outside the workspace');
select throws_ok($$insert into public.messages (workspace_id, sender_id, recipient_id, is_private, body)
                   values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a',
                           'aaaaaaaa-0000-0000-0000-00000000000a', true, 'hi')$$,
                 '23514', null, 'no DMs to yourself');
select throws_ok($$insert into public.messages (workspace_id, sender_id, is_private, body)
                   values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', true, 'hi')$$,
                 '23514', null, 'a private message needs a recipient');

-- Ben, the recipient, sees the private message and its reaction, and can reply privately.
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b', '11111111-0000-0000-0000-000000000001');
select is((select body from public.messages where id = 'a0000000-0000-0000-0000-000000000001'),
          'secret plan', 'the recipient reads the private message');
select is((select count(*)::int from public.message_reactions), 1, 'the recipient sees its reaction');
select lives_ok($$insert into public.messages (workspace_id, sender_id, recipient_id, is_private, body, reply_to_id)
                  values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b',
                          'aaaaaaaa-0000-0000-0000-00000000000a', true, 'deal',
                          'a0000000-0000-0000-0000-000000000001')$$,
                'a private reply in the same conversation');
select throws_ok($$insert into public.messages (workspace_id, sender_id, body, reply_to_id)
                   values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b',
                           'quoting it to everyone', 'a0000000-0000-0000-0000-000000000001')$$,
                 '23514', null, 'a private message cannot be quoted in the team chat');
select lives_ok($$select public.mark_chat_read('a0000000-0000-0000-0000-000000000001',
                                               'aaaaaaaa-0000-0000-0000-00000000000a')$$,
                'the recipient marks the conversation read');

-- Chitra, a third member, sees the public DM and the team message, nothing private.
select pg_temp.login('cccccccc-0000-0000-0000-00000000000c', '11111111-0000-0000-0000-000000000001');
select is((select count(*)::int from public.messages where is_private), 0, 'a third member sees no private message');
select is((select count(*)::int from public.messages), 2, 'a third member sees the public DM and the team message');
select is((select count(*)::int from public.message_reactions), 0, 'nor reactions on private messages');
select throws_ok($$insert into public.message_reactions (message_id, workspace_id, user_id, emoji)
                   values ('a0000000-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001',
                           'cccccccc-0000-0000-0000-00000000000c', '👀')$$,
                 '42501', null, 'nor react to them');
select is((select count(*)::int from public.chat_read_state where peer_id is not null), 0,
          'nor where others are in private conversations');
select is((select count(*)::int from public.messages where search @@ to_tsquery('english', 'secret')), 0,
          'search finds no private message');

-- Dev, outside the workspace, sees nothing.
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d', '22222222-0000-0000-0000-000000000002');
select is((select count(*)::int from public.messages), 0, 'outsiders see no messages');

select * from finish();
rollback;
