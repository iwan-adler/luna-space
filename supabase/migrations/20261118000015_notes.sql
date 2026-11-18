-- Migration 0015 — shared notepad (Schema §20 notes; FR-VAULT-02, 05, 06; ADR 0011).
-- Vault folders and bookmarks (Phase 7) add folder_id's foreign key later. Notes are not visible
-- to project guests yet (guest_visible exists for that, default false).

create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  owner_id      uuid references public.profiles (id) on delete set null,
  visibility    public.visibility not null default 'shared',
  folder_id     uuid,
  project_id    uuid,
  kind          text not null default 'note' check (kind in ('note', 'meeting', 'research')),
  title         text not null check (char_length(btrim(title)) between 1 and 200),
  body_md       text not null default '' check (char_length(body_md) <= 200000),
  version       integer not null default 1,
  pinned        boolean not null default false,
  tags          text[] not null default '{}' check (cardinality(tags) <= 20),
  guest_visible boolean not null default false,
  client_id     uuid unique,
  updated_by    uuid references public.profiles (id) on delete set null,
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(body_md, '')), 'D')) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete set null (project_id),
  check (visibility = 'shared' or owner_id is not null),
  check (not guest_visible or (project_id is not null and visibility = 'shared'))
);
create index on public.notes (workspace_id, pinned desc, updated_at desc) where deleted_at is null;
create index on public.notes using gin (search);
create index on public.notes (project_id) where project_id is not null;

create trigger notes_updated_at before update on public.notes
  for each row execute function private.set_updated_at();
create trigger notes_protect_owner before update on public.notes
  for each row execute function private.protect_owner();

create or replace function private.stamp_note_editor()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.updated_by := coalesce((select auth.uid()), new.updated_by);
  return new;
end;
$$;
create trigger notes_stamp_editor before insert or update on public.notes
  for each row execute function private.stamp_note_editor();

create or replace function private.log_note_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.workspace_id, 'note.created', 'Created the note "' || left(new.title, 80) || '"',
      'activity', 'note', new.id, '{}', new.visibility, new.project_id, false);
  elsif new.deleted_at is not null and old.deleted_at is null then
    perform private.log_activity(new.workspace_id, 'note.deleted', 'Deleted the note "' || left(new.title, 80) || '"',
      'activity', 'note', new.id, '{}', new.visibility, new.project_id, false);
  end if;
  return null;
end;
$$;
create trigger notes_activity after insert or update of deleted_at on public.notes
  for each row execute function private.log_note_activity();

alter table public.notes enable row level security;
create policy notes_select on public.notes for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
create policy notes_insert on public.notes for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid()));
create policy notes_update on public.notes for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));

-- Saves a note only if nobody else saved it since the caller loaded it (optimistic concurrency).
-- On a conflict the current version is returned so the app can let the person choose.
create or replace function public.save_note(p_id uuid, p_title text, p_body text, p_version integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  n public.notes%rowtype;
begin
  update public.notes
     set title = btrim(p_title), body_md = p_body, version = version + 1
   where id = p_id and version = p_version and deleted_at is null
  returning * into n;
  if found then
    return jsonb_build_object('ok', true, 'version', n.version, 'updated_at', n.updated_at);
  end if;
  select * into n from public.notes where id = p_id and deleted_at is null;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  return jsonb_build_object('ok', false, 'code', 'VERSION_CONFLICT', 'version', n.version,
                            'title', n.title, 'body_md', n.body_md, 'updated_by', n.updated_by,
                            'updated_at', n.updated_at);
end;
$$;

revoke all on public.notes from anon, authenticated;
grant select, insert on public.notes to authenticated;
grant update (title, body_md, version, pinned, tags, visibility, kind, project_id, deleted_at, deleted_by)
  on public.notes to authenticated;
grant all on public.notes to service_role;
revoke all on function public.save_note from public, anon;
grant execute on function public.save_note to authenticated;
revoke all on function private.stamp_note_editor, private.log_note_activity from public, anon, authenticated;

alter publication supabase_realtime add table public.notes;
