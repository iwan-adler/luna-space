-- Migration 0022 — profile bio and links; stickers in chat (ADR 0021).

------------------------------------------------------------------------------------------
-- Profiles: a short bio and four links. Everyone who shares a workspace with you sees them
-- (the existing profiles_select policy); only you can change yours (profiles_update).
------------------------------------------------------------------------------------------
alter table public.profiles
  add column bio text check (char_length(bio) <= 280),
  -- GitHub usernames: letters, digits and single hyphens, up to 39 characters.
  add column github_username text check (github_username ~ '^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$'),
  add column linkedin_url text check (
    char_length(linkedin_url) <= 200
    and linkedin_url ~ '^https://([a-z]{2,3}\.)?linkedin\.com/in/[A-Za-z0-9_%.-]{2,100}/?$'),
  -- Only https links, so a profile can never carry a javascript: or plain-http link.
  add column website_url text check (char_length(website_url) <= 300 and website_url ~ '^https://[^\s/$.?#][^\s]*$'),
  add column devpost_username text check (devpost_username ~ '^[A-Za-z0-9_-]{1,40}$');

grant update (bio, github_username, linkedin_url, website_url, devpost_username)
  on public.profiles to authenticated;

------------------------------------------------------------------------------------------
-- Stickers: a message of kind 'sticker' names a sticker from the app's built-in pack.
------------------------------------------------------------------------------------------
alter table public.messages drop constraint messages_kind_check;
alter table public.messages add constraint messages_kind_check
  check (kind in ('text', 'file', 'voice', 'system', 'command', 'poll', 'sticker'));
-- A sticker carries its id (deleting a message clears metadata, so deleted ones are exempt).
alter table public.messages add constraint messages_sticker_check
  check (kind <> 'sticker' or deleted_at is not null
         or (metadata ->> 'sticker') ~ '^[a-z0-9-]{1,40}$');

drop policy messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and sender_id = (select auth.uid())
              and kind in ('text', 'file', 'sticker'));
-- Clients may now write metadata on insert (the sticker id); updates still allow only body and
-- deleted_at (column grants from migration 0018).

-- Notifications describe stickers too.
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
                                    else 'sent a message' end), 120),
      '/chat', 'message', new.id,
      'chat:' || member || ':' || floor(extract(epoch from new.created_at) / 600)::bigint);
  end loop;
  return null;
end;
$$;
