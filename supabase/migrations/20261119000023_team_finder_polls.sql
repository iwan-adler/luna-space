-- Migration 0023 — team finder and polls in chat (ADR 0021).

------------------------------------------------------------------------------------------
-- Skills on profiles (shown in the team finder and on profile cards)
------------------------------------------------------------------------------------------
alter table public.profiles
  add column skills text[] not null default '{}' check (cardinality(skills) <= 12);
grant update (skills) on public.profiles to authenticated;

------------------------------------------------------------------------------------------
-- Team finder: "I'm looking for a team" or "our team needs people", per opportunity
------------------------------------------------------------------------------------------
create table public.team_posts (
  id             uuid primary key default gen_random_uuid(),
  workspace_id   uuid not null references public.workspaces (id) on delete cascade,
  opportunity_id uuid not null,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           text not null check (kind in ('seeking_team', 'seeking_members')),
  skills         text[] not null default '{}' check (cardinality(skills) <= 12),
  note           text check (char_length(note) <= 280),
  spots          smallint check (spots between 1 and 10),
  status         text not null default 'open' check (status in ('open', 'closed')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (opportunity_id, user_id, kind),
  foreign key (opportunity_id, workspace_id) references public.opportunities (id, workspace_id) on delete cascade,
  check (kind = 'seeking_members' or spots is null)
);
create index on public.team_posts (workspace_id, status, created_at desc);

create trigger team_posts_updated_at before update on public.team_posts
  for each row execute function private.set_updated_at();
create trigger team_posts_ws before insert on public.team_posts
  for each row execute function private.inherit_workspace_from('opportunities', 'opportunity_id');

-- Everyone else in the workspace hears about a new post.
create or replace function private.notify_team_post()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  member uuid;
  who    text;
  opp    text;
begin
  select display_name into who from public.profiles where id = new.user_id;
  select title into opp from public.opportunities where id = new.opportunity_id;
  for member in select user_id from public.workspace_members
                 where workspace_id = new.workspace_id and user_id <> new.user_id loop
    perform private.notify(new.workspace_id, member, 'team.post',
      coalesce(who, 'Someone') ||
        case new.kind when 'seeking_team' then ' is looking for a team for '
                      else '''s team needs people for ' end || coalesce(opp, 'an opportunity'),
      '/teams', 'team_post', new.id, 'team:' || new.id || ':' || member);
  end loop;
  return null;
end;
$$;
create trigger team_posts_notify after insert on public.team_posts
  for each row execute function private.notify_team_post();

alter table public.team_posts enable row level security;
-- Members see the workspace's posts, but only for opportunities they can see.
create policy team_posts_select on public.team_posts for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and exists (select 1 from public.opportunities o where o.id = opportunity_id));
-- You post only as yourself, about an opportunity you can see.
create policy team_posts_insert on public.team_posts for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and user_id = (select auth.uid())
              and exists (select 1 from public.opportunities o where o.id = opportunity_id and o.deleted_at is null));
-- Only the author edits or closes a post (no deletes: closing keeps the history).
create policy team_posts_update on public.team_posts for update to authenticated
  using (workspace_id = (select private.current_workspace_id()) and user_id = (select auth.uid()))
  with check (workspace_id = (select private.current_workspace_id()) and user_id = (select auth.uid()));

revoke all on public.team_posts from anon, authenticated;
grant select, insert on public.team_posts to authenticated;
grant update (skills, note, spots, status) on public.team_posts to authenticated;
grant all on public.team_posts to service_role;
revoke all on function private.notify_team_post from public, anon, authenticated;

------------------------------------------------------------------------------------------
-- Polls: a chat message of kind 'poll' with a question and 2–8 options; votes in poll_votes
------------------------------------------------------------------------------------------
create or replace function private.valid_poll(p jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select jsonb_typeof(p -> 'question') = 'string'
     and char_length(btrim(p ->> 'question')) between 1 and 200
     and jsonb_typeof(p -> 'options') = 'array'
     and jsonb_array_length(p -> 'options') between 2 and 8
     and coalesce(jsonb_typeof(p -> 'multi'), 'boolean') = 'boolean'
     and not exists (select 1 from jsonb_array_elements(p -> 'options') o
                      where jsonb_typeof(o) <> 'string' or char_length(btrim(o #>> '{}')) not between 1 and 100);
$$;
alter table public.messages add constraint messages_poll_check
  check (kind <> 'poll' or deleted_at is not null or private.valid_poll(metadata));

drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and sender_id = (select auth.uid())
              and kind in ('text', 'file', 'sticker', 'poll'));

create table public.poll_votes (
  message_id    uuid not null,
  workspace_id  uuid not null,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  option_index  smallint not null check (option_index between 0 and 7),
  created_at    timestamptz not null default now(),
  primary key (message_id, user_id, option_index),
  foreign key (message_id, workspace_id) references public.messages (id, workspace_id) on delete cascade
);
create trigger poll_votes_ws before insert on public.poll_votes
  for each row execute function private.inherit_workspace_from('messages', 'message_id');

-- A vote must name an existing option of a live poll; single-choice polls keep one vote each.
create or replace function private.prepare_poll_vote()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  m public.messages%rowtype;
begin
  select * into m from public.messages where id = new.message_id;
  if m.kind is distinct from 'poll' or m.deleted_at is not null
     or new.option_index >= jsonb_array_length(m.metadata -> 'options') then
    raise exception 'Not a valid poll option' using errcode = '23514';
  end if;
  if not coalesce((m.metadata ->> 'multi')::boolean, false) then
    delete from public.poll_votes where message_id = new.message_id and user_id = new.user_id;
  end if;
  return new;
end;
$$;
create trigger poll_votes_prepare before insert on public.poll_votes
  for each row execute function private.prepare_poll_vote();

alter table public.poll_votes enable row level security;
create policy poll_votes_select on public.poll_votes for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id));
create policy poll_votes_insert_own on public.poll_votes for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m where m.id = message_id));
create policy poll_votes_delete_own on public.poll_votes for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.poll_votes from anon, authenticated;
grant select, insert, delete on public.poll_votes to authenticated;
grant all on public.poll_votes to service_role;
revoke all on function private.prepare_poll_vote from public, anon, authenticated;
grant execute on function private.valid_poll to authenticated, service_role;

-- Notifications describe polls too.
create or replace function private.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  member uuid;
  sender text;
begin
  select display_name into sender from public.profiles where id = new.sender_id;
  for member in select user_id from public.workspace_members
                 where workspace_id = new.workspace_id and user_id is distinct from new.sender_id loop
    perform private.notify(new.workspace_id, member, 'chat.message',
      coalesce(sender, 'Someone') || ': ' ||
        left(coalesce(nullif(btrim(new.body), ''),
                      case new.kind when 'file' then 'sent a file'
                                    when 'sticker' then 'sent a sticker'
                                    when 'poll' then 'started a poll: ' || coalesce(new.metadata ->> 'question', '')
                                    else 'sent a message' end), 120),
      '/chat', 'message', new.id,
      'chat:' || member || ':' || floor(extract(epoch from new.created_at) / 600)::bigint);
  end loop;
  return null;
end;
$$;

alter publication supabase_realtime add table public.team_posts, public.poll_votes;
