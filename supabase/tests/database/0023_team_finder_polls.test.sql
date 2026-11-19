-- Team finder and polls (ADR 0021).
begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

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

select pg_temp.new_user('aaaaaaaa-0000-0000-0000-00000000000a', 'ana@pgtap-team.test');
select pg_temp.new_user('bbbbbbbb-0000-0000-0000-00000000000b', 'ben@pgtap-team.test');
select pg_temp.new_user('dddddddd-0000-0000-0000-00000000000d', 'out@pgtap-team.test');
insert into public.workspaces (id, name) values ('11111111-0000-0000-0000-000000000001', 'Team WS'),
                                                ('22222222-0000-0000-0000-000000000002', 'Other WS');
insert into public.workspace_members (workspace_id, user_id, seat, role) values
  ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 1, 'owner'),
  ('11111111-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-00000000000b', 2, 'member'),
  ('22222222-0000-0000-0000-000000000002', 'dddddddd-0000-0000-0000-00000000000d', 1, 'owner');

create temp table ids (name text primary key, id uuid) on commit drop;
grant all on ids to authenticated;
create function pg_temp.id(p text) returns uuid language sql as $$ select id from ids where name = p $$;

select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.opportunities (workspace_id, owner_id, type, title)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'hackathon', 'Rover Hack')
           returning id) insert into ids select 'opp', id from r;
with r as (insert into public.opportunities (workspace_id, owner_id, type, title, visibility)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'hackathon', 'Secret Hack', 'private')
           returning id) insert into ids select 'private-opp', id from r;

-- Team finder.
select lives_ok(format($$insert into public.team_posts (workspace_id, opportunity_id, user_id, kind, skills, spots)
                         values ('11111111-0000-0000-0000-000000000001', %L, 'aaaaaaaa-0000-0000-0000-00000000000a',
                                 'seeking_members', '{design,ml}', 2)$$, pg_temp.id('opp')),
                'a member posts that their team needs people');
select lives_ok($$update public.profiles set skills = '{robotics,react}' where id = auth.uid()$$,
                'members list their skills');
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
select is((select count(*)::int from public.team_posts), 1, 'the other member sees the post');
select is((select title from public.notifications where type = 'team.post'),
          'Ana''s team needs people for Rover Hack', 'and is notified');
select throws_ok(format($$insert into public.team_posts (workspace_id, opportunity_id, user_id, kind)
                          values ('11111111-0000-0000-0000-000000000001', %L, 'aaaaaaaa-0000-0000-0000-00000000000a', 'seeking_team')$$,
                        pg_temp.id('opp')), '42501', null, 'nobody posts as someone else');
select throws_ok(format($$insert into public.team_posts (workspace_id, opportunity_id, user_id, kind)
                          values ('11111111-0000-0000-0000-000000000001', %L, 'bbbbbbbb-0000-0000-0000-00000000000b', 'seeking_team')$$,
                        pg_temp.id('private-opp')), '42501', null, 'nor about an opportunity they cannot see');
update public.team_posts set status = 'closed';
select is((select status from public.team_posts), 'open', 'only the author can close a post');
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.team_posts), 0, 'outsiders see no posts');

-- Polls.
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
with r as (insert into public.messages (workspace_id, sender_id, kind, metadata)
           values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'poll',
                   '{"question": "Which track?", "options": ["AI", "Fintech", "Health"]}') returning id)
  insert into ids select 'poll', id from r;
select throws_ok($$insert into public.messages (workspace_id, sender_id, kind, metadata)
                   values ('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-00000000000a', 'poll',
                           '{"question": "One option?", "options": ["Only"]}')$$, '23514', null,
                 'a poll needs at least two options');
select pg_temp.login('bbbbbbbb-0000-0000-0000-00000000000b');
insert into public.poll_votes (message_id, user_id, option_index) values (pg_temp.id('poll'), 'bbbbbbbb-0000-0000-0000-00000000000b', 0);
insert into public.poll_votes (message_id, user_id, option_index) values (pg_temp.id('poll'), 'bbbbbbbb-0000-0000-0000-00000000000b', 1);
select is((select array_agg(option_index) from public.poll_votes where user_id = auth.uid()), array[1::smallint],
          'a single-choice poll keeps your latest vote');
select throws_ok(format($$insert into public.poll_votes (message_id, user_id, option_index)
                          values (%L, 'bbbbbbbb-0000-0000-0000-00000000000b', 5)$$, pg_temp.id('poll')),
                 '23514', null, 'votes must name an existing option');
select throws_ok(format($$insert into public.poll_votes (message_id, user_id, option_index)
                          values (%L, 'aaaaaaaa-0000-0000-0000-00000000000a', 0)$$, pg_temp.id('poll')),
                 '42501', null, 'nobody votes for someone else');
select pg_temp.login('aaaaaaaa-0000-0000-0000-00000000000a');
select is((select count(*)::int from public.poll_votes), 1, 'the poll author sees the votes');
select pg_temp.login('dddddddd-0000-0000-0000-00000000000d');
select is((select count(*)::int from public.poll_votes), 0, 'outsiders see no votes');

select * from finish();
rollback;
