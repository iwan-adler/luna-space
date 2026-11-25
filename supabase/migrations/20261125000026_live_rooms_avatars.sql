-- Migration 0026 — Studio Meet live rooms and inline avatars (Luna Iron merge, ADR 0023).
--
-- Studio Meet (from the Luna Iron redesign) kept its "a meeting is live" state in each browser's
-- localStorage, so teammates never saw it. A live room is now one shared row per workspace (the
-- Studio) or per project, updated live through Realtime.
--
-- Avatars are stored inline as small image data URLs (the redesign's crop tool makes 512 px WebP).
-- Profiles are read with every member list, so the size is capped.

create table public.live_rooms (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  project_id    uuid,
  -- A Google Meet address, or meet.google.com/new to create one; no query or fragment.
  meet_url      text not null default 'https://meet.google.com/new'
                check (meet_url ~ '^https://meet\.google\.com/(new|[a-z0-9-]{3,64})$'),
  is_active     boolean not null default false,
  started_by    uuid references public.profiles (id) on delete set null,
  started_at    timestamptz,
  updated_at    timestamptz not null default now(),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade,
  check (not is_active or started_at is not null)
);
-- One room per workspace (the Studio) and one per project.
create unique index live_rooms_one_per_place on public.live_rooms
  (workspace_id, coalesce(project_id, '00000000-0000-0000-0000-000000000000'::uuid));

create trigger live_rooms_updated_at before update on public.live_rooms
  for each row execute function private.set_updated_at();

-- Starting a meeting stamps who and when; ending clears it.
create or replace function private.prepare_live_room()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_active and (tg_op = 'INSERT' or not old.is_active) then
    new.started_by := (select auth.uid());
    new.started_at := now();
  elsif not new.is_active then
    new.started_by := null;
    new.started_at := null;
  end if;
  return new;
end;
$$;
create trigger live_rooms_prepare before insert or update on public.live_rooms
  for each row execute function private.prepare_live_room();

alter table public.live_rooms enable row level security;
-- Workspace members see and use the Studio room and the rooms of projects they can see.
create policy live_rooms_select on public.live_rooms for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (project_id is null or private.is_room_member(project_id)));
create policy live_rooms_insert on public.live_rooms for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id())
              and (project_id is null or private.is_room_member(project_id)));
create policy live_rooms_update on public.live_rooms for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (project_id is null or private.is_room_member(project_id)))
  with check (workspace_id = (select private.current_workspace_id())
              and (project_id is null or private.is_room_member(project_id)));

revoke all on public.live_rooms from anon, authenticated;
grant select, insert on public.live_rooms to authenticated;
grant update (meet_url, is_active) on public.live_rooms to authenticated;
grant all on public.live_rooms to service_role;
revoke all on function private.prepare_live_room from public, anon, authenticated;

alter publication supabase_realtime add table public.live_rooms;

-- Avatars: an inline PNG, JPEG, WebP or GIF data URL of at most ~220 KB.
alter table public.profiles add constraint profiles_avatar_check check (
  avatar_path is null
  or (char_length(avatar_path) <= 300000
      and avatar_path ~ '^data:image/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$'));
