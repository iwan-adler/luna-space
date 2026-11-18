-- Migration 0019 — Vault and global search (Schema §20; FR-VAULT-01, 03–06; FR-PLAT-11; ADR 0015).
-- Folders hold notes, files and bookmarks. One search function covers the whole workspace and,
-- being security invoker, only ever returns rows the caller could already read.

------------------------------------------------------------------------------------------
-- Folders (nested up to 4 levels)
------------------------------------------------------------------------------------------
create table public.vault_folders (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  owner_id      uuid references public.profiles (id) on delete set null,
  visibility    public.visibility not null default 'shared',
  parent_id     uuid,
  name          text not null check (char_length(btrim(name)) between 1 and 80),
  depth         smallint not null default 1 check (depth between 1 and 4),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  foreign key (parent_id, workspace_id) references public.vault_folders (id, workspace_id) on delete cascade,
  check (visibility = 'shared' or owner_id is not null)
);
-- Names are unique among live siblings (deleted folders free their name).
create unique index vault_folders_sibling_name on public.vault_folders
  (workspace_id, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)))
  where deleted_at is null;
create index on public.vault_folders (parent_id);

create trigger vault_folders_updated_at before update on public.vault_folders
  for each row execute function private.set_updated_at();
create trigger vault_folders_protect_owner before update on public.vault_folders
  for each row execute function private.protect_owner();

-- Depth comes from the parent; a folder inside a private folder is private too.
create or replace function private.prepare_vault_folder()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.vault_folders%rowtype;
begin
  new.name := btrim(new.name);
  if new.parent_id is null then
    new.depth := 1;
    return new;
  end if;
  select * into p from public.vault_folders where id = new.parent_id;
  -- The parent must be one the creator can see (checked here: a policy on this table that reads
  -- the same table would recurse).
  if (select auth.uid()) is not null and p.visibility = 'private' and p.owner_id is distinct from (select auth.uid()) then
    raise exception 'Folder not found' using errcode = '42501';
  end if;
  if p.deleted_at is not null then
    raise exception 'The parent folder was deleted' using errcode = 'P0001';
  end if;
  if p.depth >= 4 then
    raise exception 'Folders can be nested at most 4 levels deep' using errcode = 'P0001';
  end if;
  new.depth := p.depth + 1;
  if p.visibility = 'private' then
    new.visibility := 'private';
  end if;
  return new;
end;
$$;
create trigger vault_folders_prepare before insert on public.vault_folders
  for each row execute function private.prepare_vault_folder();

-- Deleting a folder deletes its sub-folders and moves everything inside up to its parent,
-- so no note, file or bookmark is lost with it.
create or replace function private.on_vault_folder_deleted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ids uuid[];
begin
  if new.deleted_at is null or old.deleted_at is not null then
    return null;
  end if;
  with recursive tree as (
    select f.id from public.vault_folders f where f.parent_id = new.id and f.deleted_at is null
    union all
    select f.id from public.vault_folders f join tree t on f.parent_id = t.id where f.deleted_at is null
  )
  select array_agg(id) || new.id into ids from tree;
  ids := coalesce(ids, array[new.id]);
  update public.notes set folder_id = new.parent_id where folder_id = any (ids);
  update public.files set folder_id = new.parent_id where folder_id = any (ids);
  update public.bookmarks set folder_id = new.parent_id where folder_id = any (ids);
  update public.vault_folders set deleted_at = new.deleted_at, deleted_by = new.deleted_by
   where id = any (ids) and id <> new.id and deleted_at is null;
  return null;
end;
$$;

------------------------------------------------------------------------------------------
-- Bookmarks and research references (FR-VAULT-04)
------------------------------------------------------------------------------------------
create table public.bookmarks (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  owner_id      uuid references public.profiles (id) on delete set null,
  visibility    public.visibility not null default 'shared',
  kind          text not null default 'bookmark' check (kind in ('bookmark', 'reference')),
  url           text not null check (url ~* '^https?://[^\s]+$' and char_length(url) <= 2048),
  title         text not null check (char_length(btrim(title)) between 1 and 300),
  description   text check (char_length(description) <= 2000),
  site_name     text check (char_length(site_name) <= 200),
  folder_id     uuid,
  project_id    uuid,
  tags          text[] not null default '{}' check (cardinality(tags) <= 20),
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(site_name, '')), 'B') ||
                  setweight(to_tsvector('english', coalesce(description, '')), 'C')) stored,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  foreign key (folder_id, workspace_id) references public.vault_folders (id, workspace_id) on delete set null (folder_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete set null (project_id),
  check (visibility = 'shared' or owner_id is not null)
);
create index on public.bookmarks (workspace_id, updated_at desc) where deleted_at is null;
create index on public.bookmarks (folder_id) where folder_id is not null;
create index on public.bookmarks using gin (search);
create index on public.bookmarks using gin (tags);

create trigger bookmarks_updated_at before update on public.bookmarks
  for each row execute function private.set_updated_at();
create trigger bookmarks_protect_owner before update on public.bookmarks
  for each row execute function private.protect_owner();

-- The folder trigger needs bookmarks to exist.
create trigger vault_folders_deleted after update of deleted_at on public.vault_folders
  for each row execute function private.on_vault_folder_deleted();

------------------------------------------------------------------------------------------
-- Notes and files join folders; files get tags and a name search (FR-VAULT-03, 05)
------------------------------------------------------------------------------------------
alter table public.notes
  add foreign key (folder_id, workspace_id) references public.vault_folders (id, workspace_id) on delete set null (folder_id);
create index on public.notes (folder_id) where folder_id is not null;
create index on public.notes using gin (tags);

alter table public.files
  add column folder_id uuid,
  add column tags text[] not null default '{}' check (cardinality(tags) <= 20),
  add column search tsvector generated always as (
    to_tsvector('english', regexp_replace(file_name, '[^[:alnum:]]+', ' ', 'g'))) stored,
  add foreign key (folder_id, workspace_id) references public.vault_folders (id, workspace_id) on delete set null (folder_id);
create index on public.files (folder_id) where folder_id is not null;
create index on public.files using gin (search);
create index on public.files using gin (tags);

-- An item may only go into a live folder of the same workspace that the caller can see.
-- (Guests can never see folders, so they cannot file anything.)
create or replace function private.check_vault_folder()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.folder_id is null or (select auth.uid()) is null
     or (tg_op = 'UPDATE' and new.folder_id is not distinct from old.folder_id) then
    return new;
  end if;
  if new.workspace_id is distinct from private.current_workspace_id()
     or not exists (select 1 from public.vault_folders f
                     where f.id = new.folder_id and f.workspace_id = new.workspace_id and f.deleted_at is null
                       and (f.visibility = 'shared' or f.owner_id = (select auth.uid()))) then
    raise exception 'Folder not found' using errcode = 'P0002';
  end if;
  return new;
end;
$$;
create trigger notes_folder before insert or update of folder_id on public.notes
  for each row execute function private.check_vault_folder();
create trigger files_folder before insert or update of folder_id on public.files
  for each row execute function private.check_vault_folder();
create trigger bookmarks_folder before insert or update of folder_id on public.bookmarks
  for each row execute function private.check_vault_folder();

------------------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------------------
alter table public.vault_folders enable row level security;
alter table public.bookmarks enable row level security;

-- Both members see shared folders; private folders only their owner.
create policy vault_folders_select on public.vault_folders for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
-- A new folder belongs to its creator; the trigger above checks the creator can see its parent.
create policy vault_folders_insert on public.vault_folders for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid()));
create policy vault_folders_update on public.vault_folders for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));

create policy bookmarks_select on public.bookmarks for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
create policy bookmarks_insert on public.bookmarks for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid())
              and (project_id is null or exists (select 1 from public.projects p where p.id = project_id)));
create policy bookmarks_update on public.bookmarks for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));

------------------------------------------------------------------------------------------
-- Global search (FR-PLAT-11, FR-VAULT-06)
------------------------------------------------------------------------------------------
-- Every word typed becomes a prefix match, so results appear while typing ("hack" → hackathon).
create or replace function private.prefix_tsquery(p text)
returns tsquery language sql immutable set search_path = '' as $$
  select case when count(*) = 0 then null
              else to_tsquery('english', string_agg(w || ':*', ' & ')) end
    from (select w from regexp_split_to_table(lower(coalesce(left(p, 200), '')), '[^[:alnum:]]+') w
           where w <> '' limit 8) words;
$$;

-- Matches marked with ⟦ ⟧ so the app can highlight them without rendering any HTML.
create or replace function public.search_workspace(p_q text, p_kinds text[] default null, p_limit integer default 40)
returns table (kind text, id uuid, title text, snippet text, project_id uuid, folder_id uuid,
               rank real, updated_at timestamptz)
language plpgsql stable security invoker set search_path = '' as $$
declare
  q    tsquery := private.prefix_tsquery(p_q);
  lim  integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  hl   text := 'StartSel=⟦, StopSel=⟧, MaxWords=22, MinWords=6, MaxFragments=1';
  hall text := 'StartSel=⟦, StopSel=⟧, HighlightAll=true';
begin
  if q is null or numnode(q) = 0 then
    return;
  end if;
  return query
  select r.* from (
    (select 'note'::text, n.id, ts_headline('english', n.title, q, hall),
            ts_headline('english', n.body_md, q, hl), n.project_id, n.folder_id, ts_rank(n.search, q), n.updated_at
       from public.notes n
      where n.deleted_at is null and n.search @@ q and (p_kinds is null or 'note' = any (p_kinds))
      order by 7 desc limit lim)
    union all
    (select 'bookmark', b.id, ts_headline('english', b.title, q, hall),
            ts_headline('english', coalesce(b.description, b.url), q, hl), b.project_id, b.folder_id,
            ts_rank(b.search, q), b.updated_at
       from public.bookmarks b
      where b.deleted_at is null and b.search @@ q and (p_kinds is null or 'bookmark' = any (p_kinds))
      order by 7 desc limit lim)
    union all
    (select 'file', f.id, ts_headline('english', f.file_name, q, hall), null::text, f.project_id, f.folder_id,
            ts_rank(f.search, q), f.created_at
       from public.files f
      where f.deleted_at is null and f.upload_state = 'stored' and f.search @@ q
        and (p_kinds is null or 'file' = any (p_kinds))
      order by 7 desc limit lim)
    union all
    (select 'message', m.id, null::text, ts_headline('english', m.body, q, hl), m.project_id, null::uuid,
            ts_rank(m.search, q), m.created_at
       from public.messages m
      where m.deleted_at is null and m.search @@ q and (p_kinds is null or 'message' = any (p_kinds))
      order by 7 desc limit lim)
    union all
    (select 'opportunity', o.id, ts_headline('english', o.title, q, hall),
            ts_headline('english', coalesce(o.description, ''), q, hl), null::uuid, null::uuid,
            ts_rank(o.search, q), o.updated_at
       from public.opportunities o
      where o.deleted_at is null and o.search @@ q and (p_kinds is null or 'opportunity' = any (p_kinds))
      order by 7 desc limit lim)
    union all
    (select 'task', t.id, ts_headline('english', t.title, q, hall),
            ts_headline('english', coalesce(t.description, ''), q, hl), t.project_id, null::uuid,
            ts_rank(t.search, q), t.updated_at
       from public.tasks t
      where t.deleted_at is null and t.search @@ q and (p_kinds is null or 'task' = any (p_kinds))
      order by 7 desc limit lim)
    union all
    (select 'project', p.id, ts_headline('english', p.name, q, hall),
            ts_headline('english', coalesce(p.summary, ''), q, hl), p.id, null::uuid,
            ts_rank(p.search, q), p.updated_at
       from public.projects p
      where p.deleted_at is null and p.search @@ q and (p_kinds is null or 'project' = any (p_kinds))
      order by 7 desc limit lim)
  ) r (kind, id, title, snippet, project_id, folder_id, rank, updated_at)
  order by r.rank desc, r.updated_at desc
  limit lim;
end;
$$;

------------------------------------------------------------------------------------------
-- Grants
------------------------------------------------------------------------------------------
revoke all on public.vault_folders, public.bookmarks from anon, authenticated;
grant select, insert on public.vault_folders, public.bookmarks to authenticated;
grant update (name, deleted_at, deleted_by) on public.vault_folders to authenticated;
grant update (kind, url, title, description, site_name, folder_id, project_id, tags, visibility,
              deleted_at, deleted_by) on public.bookmarks to authenticated;
grant all on public.vault_folders, public.bookmarks to service_role;
grant update (folder_id) on public.notes to authenticated;
grant update (folder_id, tags) on public.files to authenticated;
grant update (folder_id, tags) on public.files to service_role;

revoke all on function public.search_workspace from public, anon;
grant execute on function public.search_workspace to authenticated;
revoke all on function private.prefix_tsquery from public, anon;
grant execute on function private.prefix_tsquery to authenticated;
revoke all on function private.prepare_vault_folder, private.on_vault_folder_deleted, private.check_vault_folder
  from public, anon, authenticated;

alter publication supabase_realtime add table public.vault_folders, public.bookmarks;
