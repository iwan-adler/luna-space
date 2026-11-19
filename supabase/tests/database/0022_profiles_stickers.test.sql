-- Profile bio and links; stickers in chat (ADR 0021).
begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

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

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@pgtap-prof.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'ben@pgtap-prof.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'out@pgtap-prof.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Prof WS');
insert into public.workspace_members (workspace_id, user_id, seat, role) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1, 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2, 'member');

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select lives_ok($$update public.profiles set bio = 'Builds rovers', github_username = 'ana-dev',
                   linkedin_url = 'https://www.linkedin.com/in/ana-dev/', website_url = 'https://ana.dev',
                   devpost_username = 'ana_dev' where id = auth.uid()$$, 'a member fills in bio and links');
select throws_ok($$update public.profiles set website_url = 'javascript:alert(1)' where id = auth.uid()$$,
                 '23514', null, 'only https websites');
select throws_ok($$update public.profiles set website_url = 'http://ana.dev' where id = auth.uid()$$,
                 '23514', null, 'plain http is refused');
select throws_ok($$update public.profiles set linkedin_url = 'https://evil.example/in/ana' where id = auth.uid()$$,
                 '23514', null, 'LinkedIn links must point at linkedin.com/in/…');
select throws_ok($$update public.profiles set github_username = 'bad--name' where id = auth.uid()$$,
                 '23514', null, 'GitHub usernames follow GitHub''s rules');

select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select github_username from public.profiles where id = 'aaaaaaaa-0000-0000-0000-00000000000a'),
          'ana-dev', 'workspace members see each other''s links');
update public.profiles set bio = 'hijacked' where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.profiles where id = 'aaaaaaaa-0000-0000-0000-00000000000a'), 0,
          'outsiders see nothing');

-- Stickers.
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select bio from public.profiles where id = 'aaaaaaaa-0000-0000-0000-00000000000a'), 'Builds rovers',
          'nobody else can change your bio');
select lives_ok($$insert into public.messages (workspace_id, sender_id, kind, metadata)
                  values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b',
                          'sticker', '{"sticker": "ship-it"}')$$, 'a sticker can be sent');
select throws_ok($$insert into public.messages (workspace_id, sender_id, kind, metadata)
                   values ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b',
                           'sticker', '{"sticker": "<img onerror>"}')$$, '23514', null,
                 'sticker ids are plain names');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select title from public.notifications where type = 'chat.message' limit 1), 'Ben: sent a sticker',
          'the notification says a sticker arrived');

select * from finish();
rollback;
