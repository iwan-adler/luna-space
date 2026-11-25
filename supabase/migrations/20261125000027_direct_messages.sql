-- Migration 0027 — direct messages, private or public (ADR 0024).
--
-- A chat message may now be addressed to one person (recipient_id):
--   * team message      recipient_id null                    everyone in the workspace sees it
--   * public DM         recipient_id set, is_private false   everyone sees it (shown "→ Ben")
--   * private DM        recipient_id set, is_private true    only the sender and the recipient
--
-- Privacy is enforced here, not in the app: restrictive policies hide private messages (and
-- their reactions, poll votes, attachments and read positions) from everybody else, so search,
-- the data export and Realtime follow automatically.

alter table public.messages
  add column recipient_id uuid references public.profiles (id) on delete set null,
  add column is_private boolean not null default false,
  add constraint messages_private_needs_recipient check (not is_private or recipient_id is not null),
  add constraint messages_not_to_self check (recipient_id is distinct from sender_id);
create index messages_dm on public.messages (workspace_id, recipient_id, sender_id, created_at desc)
  where recipient_id is not null;

-- Can the signed-in person see this message? (Used by policies on rows that hang off a message;
-- security definer so it can look at the message without recursing into its policies.)
create or replace function private.can_see_message(p_message uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.messages m
                  where m.id = p_message
                    and (not m.is_private or (select auth.uid()) in (m.sender_id, m.recipient_id)));
$$;

------------------------------------------------------------------------------------------
-- Sending: a DM goes to a member of the same workspace; a reply stays in its conversation.
------------------------------------------------------------------------------------------
create or replace function private.prepare_message_insert()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  target public.messages%rowtype;
begin
  if new.recipient_id is not null and not exists (
       select 1 from public.workspace_members
        where workspace_id = new.workspace_id and user_id = new.recipient_id) then
    raise exception 'The recipient is not in this workspace' using errcode = '23514';
  end if;
  if new.reply_to_id is not null then
    select * into target from public.messages where id = new.reply_to_id;
    -- Replying to a private message: only inside that same private conversation.
    if target.is_private and not (
         new.is_private
         and least(new.sender_id::text, new.recipient_id::text) = least(target.sender_id::text, target.recipient_id::text)
         and greatest(new.sender_id::text, new.recipient_id::text) = greatest(target.sender_id::text, target.recipient_id::text)) then
      raise exception 'A reply to a private message must stay in that conversation' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;
create trigger messages_prepare_insert before insert on public.messages
  for each row execute function private.prepare_message_insert();

------------------------------------------------------------------------------------------
-- RLS: restrictive policies add the privacy rule on top of the existing workspace policies.
------------------------------------------------------------------------------------------
-- Messages: a private message is visible only to its sender and its recipient.
create policy messages_private on public.messages as restrictive for select to authenticated
  using (not is_private or (select auth.uid()) in (sender_id, recipient_id));
-- Reactions and poll votes on a private message: only for those two people.
create policy reactions_private on public.message_reactions as restrictive for all to authenticated
  using (private.can_see_message(message_id)) with check (private.can_see_message(message_id));
create policy poll_votes_private on public.poll_votes as restrictive for all to authenticated
  using (private.can_see_message(message_id)) with check (private.can_see_message(message_id));
-- Attachments of a private message: the file row and the stored object.
create policy files_message_private on public.files as restrictive for select to authenticated
  using (message_id is null or private.can_see_message(message_id));
create policy files_message_private_update on public.files as restrictive for update to authenticated
  using (message_id is null or private.can_see_message(message_id));

create or replace function private.can_read_object(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.files f
     where f.storage_path = p_name and f.deleted_at is null
       and (f.message_id is null or private.can_see_message(f.message_id))
       and ((private.is_member(f.workspace_id) and (f.visibility = 'shared' or f.owner_id = (select auth.uid())))
            or (f.project_id is not null and f.guest_visible and private.guest_role(f.project_id) is not null)));
$$;

------------------------------------------------------------------------------------------
-- Read positions: one per person per conversation (peer_id null = the team chat).
------------------------------------------------------------------------------------------
alter table public.chat_read_state drop constraint chat_read_state_pkey;
alter table public.chat_read_state add column peer_id uuid references public.profiles (id) on delete cascade;
-- A plain key, so Realtime can still publish updates (peer_id may be null).
alter table public.chat_read_state add column id uuid not null default gen_random_uuid() primary key;
alter table public.chat_read_state
  add constraint chat_read_state_one unique nulls not distinct (workspace_id, user_id, peer_id);
-- Where you are in a private conversation is visible only to its two people.
create policy chat_read_state_private on public.chat_read_state as restrictive for select to authenticated
  using (peer_id is null or (select auth.uid()) in (user_id, peer_id));

drop function public.mark_chat_read(uuid);
create or replace function public.mark_chat_read(p_message uuid, p_peer uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ws  uuid := private.current_workspace_id();
  me  uuid := (select auth.uid());
  at  timestamptz;
begin
  if ws is null or p_peer = me then
    return;
  end if;
  select m.created_at into at from public.messages m
   where m.id = p_message and m.workspace_id = ws
     and (not m.is_private or me in (m.sender_id, m.recipient_id));
  if at is null then
    return;
  end if;
  insert into public.chat_read_state (workspace_id, user_id, peer_id, last_read_message_id, last_read_at)
  values (ws, me, p_peer, p_message, at)
  on conflict (workspace_id, user_id, peer_id) do update
    set last_read_message_id = excluded.last_read_message_id, last_read_at = excluded.last_read_at
    where public.chat_read_state.last_read_at < excluded.last_read_at;
  -- Reading a conversation also clears its notifications.
  update public.notifications set read_at = now()
   where recipient_id = me and workspace_id = ws and type = 'chat.message' and read_at is null
     and link_path = case when p_peer is null then '/chat' else '/chat?with=' || p_peer end;
end;
$$;
revoke all on function public.mark_chat_read from public, anon;
grant execute on function public.mark_chat_read to authenticated;

------------------------------------------------------------------------------------------
-- Notifications: a DM notifies only its recipient; team messages notify everyone else.
------------------------------------------------------------------------------------------
create or replace function private.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  member uuid;
  sender text;
  what   text;
begin
  select display_name into sender from public.profiles where id = new.sender_id;
  what := left(coalesce(nullif(btrim(new.body), ''),
                        case new.kind when 'file' then 'sent a file'
                                      when 'sticker' then 'sent a sticker'
                                      when 'poll' then 'started a poll: ' || coalesce(new.metadata ->> 'question', '')
                                      else 'sent a message' end), 120);
  if new.recipient_id is not null then
    perform private.notify(new.workspace_id, new.recipient_id, 'chat.message',
      coalesce(sender, 'Someone') || case when new.is_private then ' (private): ' else ': ' end || what,
      '/chat?with=' || new.sender_id, 'message', new.id,
      'dm:' || new.recipient_id || ':' || new.sender_id || ':' || floor(extract(epoch from new.created_at) / 600)::bigint);
    return null;
  end if;
  for member in select user_id from public.workspace_members
                 where workspace_id = new.workspace_id and user_id is distinct from new.sender_id loop
    perform private.notify(new.workspace_id, member, 'chat.message',
      coalesce(sender, 'Someone') || ': ' || what,
      '/chat', 'message', new.id,
      'chat:' || member || ':' || floor(extract(epoch from new.created_at) / 600)::bigint);
  end loop;
  return null;
end;
$$;

------------------------------------------------------------------------------------------
-- Grants: the new columns are set when sending and never changed afterwards.
------------------------------------------------------------------------------------------
grant insert (recipient_id, is_private) on public.messages to authenticated;
revoke all on function private.can_see_message from public, anon;
revoke all on function private.prepare_message_insert from public, anon, authenticated;
grant execute on function private.can_see_message to authenticated;
