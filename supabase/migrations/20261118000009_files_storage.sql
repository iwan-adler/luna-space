-- Migration 0009 — file metadata and the private workspace-files bucket (Schema §21, §29;
-- FR-PRJ-05 attachments, FR-PRJ-07 file library; NFR-SEC-08).
-- Vault folders (Phase 7) and chat messages (Phase 6) add their FK columns later.

create table public.files (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  owner_id      uuid references public.profiles (id) on delete set null,
  visibility    public.visibility not null default 'shared',
  bucket        text not null default 'workspace-files' check (bucket = 'workspace-files'),
  storage_path  text not null unique,
  file_name     text not null check (char_length(btrim(file_name)) between 1 and 255),
  mime_type     text not null check (mime_type in (
                  'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf', 'text/plain',
                  'text/markdown', 'text/csv', 'application/zip',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                  'application/vnd.oasis.opendocument.text', 'audio/webm', 'audio/ogg', 'audio/mp4')),
  size_bytes    bigint not null check (size_bytes between 1 and 26214400),
  sha256        bytea,
  project_id    uuid,
  task_id       uuid,
  upload_state  text not null default 'pending' check (upload_state in ('pending', 'stored')),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  deleted_by    uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  check (visibility = 'shared' or owner_id is not null),
  check (storage_path like workspace_id::text || '/%'),
  check (storage_path !~ '\.\.' and storage_path !~ '//'),
  check (not (mime_type like 'audio/%') or size_bytes <= 5242880),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete set null (project_id),
  foreign key (task_id, workspace_id) references public.tasks (id, workspace_id) on delete cascade
);
create index on public.files (project_id, created_at desc) where deleted_at is null;
create index on public.files (task_id) where deleted_at is null;
create index on public.files (workspace_id, created_at desc);

-- Attachments of a task belong to the task's project.
create or replace function private.prepare_file()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.task_id is not null then
    select project_id into new.project_id from public.tasks where id = new.task_id;
  end if;
  return new;
end;
$$;
create trigger files_prepare before insert on public.files
  for each row execute function private.prepare_file();
create trigger files_protect_owner before update on public.files
  for each row execute function private.protect_owner();

alter table public.files enable row level security;
create policy files_select on public.files for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
create policy files_insert on public.files for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid())
              and upload_state = 'pending'
              and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id))
              and (project_id is null or exists (select 1 from public.projects p where p.id = project_id)));
create policy files_update on public.files for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));
revoke all on public.files from anon;
revoke update on public.files from authenticated;
grant update (file_name, deleted_at, deleted_by) on public.files to authenticated;

-- Marks an upload complete once the object really exists in storage.
create or replace function public.confirm_upload(p_file uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  f public.files%rowtype;
begin
  select * into f from public.files where id = p_file and owner_id = (select auth.uid()) for update;
  if not found then
    raise exception 'File not found' using errcode = 'P0002';
  end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = f.bucket and o.name = f.storage_path) then
    raise exception 'The file has not been uploaded' using errcode = 'P0001';
  end if;
  update public.files set upload_state = 'stored' where id = p_file;
end;
$$;
revoke all on function public.confirm_upload from public, anon;
grant execute on function public.confirm_upload to authenticated;

------------------------------------------------------------------------------------------
-- Storage: private bucket, access delegated to the files table's RLS (Schema §29)
------------------------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('workspace-files', 'workspace-files', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit;

create policy wf_read on storage.objects for select to authenticated
  using (bucket_id = 'workspace-files'
         and exists (select 1 from public.files f where f.storage_path = name and f.deleted_at is null));

create policy wf_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-files'
              and exists (select 1 from public.files f
                           where f.storage_path = name and f.owner_id = (select auth.uid())
                             and f.upload_state = 'pending'));
-- No update/delete policies: objects are immutable; the nightly purge uses the service role.

-- Partners see new uploads without reloading (TRD §9).
alter publication supabase_realtime add table public.files;
