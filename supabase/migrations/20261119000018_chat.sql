-- Migration 0018 — chat (Schema §20 messages; FR-CHAT-01–09; AC-21; ADR 0014).
-- One conversation per workspace (the two members). Guests have no access.

create table public.messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  sender_id     uuid references public.profiles (id) on delete set null,
  project_id    uuid,
  reply_to_id   uuid,
  kind          text not null default 'text'
                check (kind in ('text', 'file', 'voice', 'system', 'command', 'poll')),
  body          text check (char_length(body) <= 8000),
  metadata      jsonb not null default '{}' check (jsonb_typeof(metadata) = 'object'),
  client_id     uuid unique,
  edited_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  search        tsvector generated always as (to_tsvector('english', coalesce(body, ''))) stored,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete set null (project_id),
  foreign key (reply_to_id, workspace_id) references public.messages (id, workspace_id) on delete set null (reply_to_id),
  check (deleted_at is null or body is null),
  check (kind <> 'text' or deleted_at is not null or char_length(btrim(body)) >= 1)
);
create index on public.messages (workspace_id, created_at desc, id desc);
create index on public.messages (project_id, created_at desc) where project_id is not null;
create index on public.messages using gin (search);

create table public.message_reactions (
  message_id    uuid not null,
  workspace_id  uuid not null,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  emoji         text not null check (char_length(emoji) between 1 and 16),
  created_at    timestamptz not null default now(),
  primary key (message_id, user_id, emoji),
  foreign key (message_id, workspace_id) references public.messages (id, workspace_id) on delete cascade
);

create table public.chat_read_state (
  workspace_id         uuid not null references public.workspaces (id) on delete cascade,
  user_id              uuid not null references public.profiles (id) on delete cascade,
  last_read_message_id uuid references public.messages (id) on delete set null,
  last_read_at         timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

-- Attachments are files rows linked to a message (FR-CHAT-07).
alter table public.files add column message_id uuid,
  add foreign key (message_id, workspace_id) references public.messages (id, workspace_id) on delete set null (message_id);
create index on public.files (message_id) where message_id is not null;

drop policy files_insert on public.files;
create policy files_insert on public.files for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid())
              and upload_state = 'pending'
              and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id))
              and (project_id is null or exists (select 1 from public.projects p where p.id = project_id))
              and (message_id is null or exists (select 1 from public.messages m
                                                  where m.id = message_id and m.sender_id = (select auth.uid()))));

------------------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------------------
-- The workspace of a reaction comes from its message, never from the client.
create trigger message_reactions_ws before insert on public.message_reactions
  for each row execute function private.inherit_workspace_from('messages', 'message_id');

-- Editing stamps edited_at; deleting removes the content and the attachments (AC-21).
create or replace function private.prepare_message_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.deleted_at is not null and old.deleted_at is null then
    new.body := null;
    new.metadata := '{}';
    update public.files set deleted_at = now(), deleted_by = (select auth.uid())
     where message_id = new.id and deleted_at is null;
  elsif new.body is distinct from old.body then
    new.edited_at := now();
  end if;
  return new;
end;
$$;
create trigger messages_prepare_update before update on public.messages
  for each row execute function private.prepare_message_update();

-- One notification per burst: at most one every 10 minutes for the partner (also pushed).
create or replace function private.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  partner uuid;
  sender  text;
begin
  select user_id into partner from public.workspace_members
   where workspace_id = new.workspace_id and user_id is distinct from new.sender_id limit 1;
  if partner is null then
    return null;
  end if;
  select display_name into sender from public.profiles where id = new.sender_id;
  perform private.notify(new.workspace_id, partner, 'chat.message',
    coalesce(sender, 'Your partner') || ': ' ||
      left(coalesce(nullif(btrim(new.body), ''), case when new.kind = 'file' then 'sent a file' else 'sent a message' end), 120),
    '/chat', 'message', new.id,
    'chat:' || partner || ':' || floor(extract(epoch from new.created_at) / 600)::bigint);
  return null;
end;
$$;
create trigger messages_notify after insert on public.messages
  for each row when (new.kind <> 'system')
  execute function private.notify_new_message();

------------------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------------------
alter table public.messages enable row level security;
alter table public.message_reactions enable row level security;
alter table public.chat_read_state enable row level security;

create policy messages_select on public.messages for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));
create policy messages_insert on public.messages for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and sender_id = (select auth.uid())
              and kind in ('text', 'file'));
-- A reply's target is in the same conversation by the composite foreign key (reply_to_id, workspace_id).
create policy messages_update_own on public.messages for update to authenticated
  using (workspace_id = (select private.current_workspace_id()) and sender_id = (select auth.uid()))
  with check (workspace_id = (select private.current_workspace_id()) and sender_id = (select auth.uid()));

create policy reactions_select on public.message_reactions for select to authenticated
  using (exists (select 1 from public.messages m where m.id = message_id));
create policy reactions_insert_own on public.message_reactions for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (select 1 from public.messages m
                                                         where m.id = message_id and m.deleted_at is null));
create policy reactions_delete_own on public.message_reactions for delete to authenticated
  using (user_id = (select auth.uid()));

create policy chat_read_state_select on public.chat_read_state for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));

-- Marks the conversation read up to a message (one row per member; Schema §20).
create or replace function public.mark_chat_read(p_message uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ws uuid := private.current_workspace_id();
  at timestamptz;
begin
  if ws is null then
    return;
  end if;
  select created_at into at from public.messages where id = p_message and workspace_id = ws;
  if at is null then
    return;
  end if;
  insert into public.chat_read_state (workspace_id, user_id, last_read_message_id, last_read_at)
  values (ws, (select auth.uid()), p_message, at)
  on conflict (workspace_id, user_id) do update
    set last_read_message_id = excluded.last_read_message_id, last_read_at = excluded.last_read_at
    where public.chat_read_state.last_read_at < excluded.last_read_at;
  -- Reading the chat also clears its notifications.
  update public.notifications set read_at = now()
   where recipient_id = (select auth.uid()) and type = 'chat.message' and read_at is null;
end;
$$;

revoke all on public.messages, public.message_reactions, public.chat_read_state from anon, authenticated;
grant select, insert on public.messages to authenticated;
grant update (body, deleted_at) on public.messages to authenticated;
grant select, insert, delete on public.message_reactions to authenticated;
grant select on public.chat_read_state to authenticated;
grant all on public.messages, public.message_reactions, public.chat_read_state to service_role;
grant update (message_id) on public.files to service_role;
revoke all on function public.mark_chat_read from public, anon;
grant execute on function public.mark_chat_read to authenticated;
revoke all on function private.prepare_message_update, private.notify_new_message from public, anon, authenticated;

alter publication supabase_realtime add table public.messages, public.message_reactions, public.chat_read_state;
