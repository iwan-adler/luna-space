-- Migration 0020 — recycle bin, restore and the nightly purge (FR-PLAT-10, AC-07, DB6; ADR 0016).
-- Deleted items stay restorable for 30 days. The `maintenance` Edge Function then removes their
-- storage objects through the Storage API and deletes the rows (purge_prepare → purge_finish).

------------------------------------------------------------------------------------------
-- Recycle bin: what the caller deleted-and-can-see, newest first. Security invoker: each table's
-- own policies decide (private items only for their owner; guests see nothing).
------------------------------------------------------------------------------------------
create or replace function public.recycle_bin()
returns table (kind text, id uuid, title text, deleted_at timestamptz, deleted_by uuid,
               project_id uuid, purge_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select r.kind, r.id, r.title, r.deleted_at, r.deleted_by, r.project_id, r.deleted_at + interval '30 days'
    from (
      select 'opportunity'::text as kind, o.id, o.title, o.deleted_at, o.deleted_by, null::uuid as project_id
        from public.opportunities o where o.deleted_at is not null
      union all
      select 'project', p.id, p.name, p.deleted_at, p.deleted_by, p.id
        from public.projects p where p.deleted_at is not null
      union all
      select 'task', t.id, t.title, t.deleted_at, t.deleted_by, t.project_id
        from public.tasks t where t.deleted_at is not null
      union all
      select 'note', n.id, n.title, n.deleted_at, n.deleted_by, n.project_id
        from public.notes n where n.deleted_at is not null
      union all
      select 'bookmark', b.id, b.title, b.deleted_at, b.deleted_by, b.project_id
        from public.bookmarks b where b.deleted_at is not null
      union all
      -- Only the folder that was deleted, not the sub-folders that went with it.
      select 'folder', f.id, f.name, f.deleted_at, f.deleted_by, null::uuid
        from public.vault_folders f
       where f.deleted_at is not null
         and not exists (select 1 from public.vault_folders p
                          where p.id = f.parent_id and p.deleted_at = f.deleted_at)
      union all
      -- Chat attachments go with their message and are not restorable on their own.
      select 'file', f.id, f.file_name, f.deleted_at, f.deleted_by, f.project_id
        from public.files f where f.deleted_at is not null and f.message_id is null
      union all
      select 'event', e.id, e.title, e.deleted_at, e.deleted_by, e.project_id
        from public.calendar_events e where e.deleted_at is not null
    ) r
   where private.current_workspace_id() is not null
     and r.deleted_at > now() - interval '30 days'
   order by r.deleted_at desc
   limit 500;
$$;

-- Restores one item. Runs as the caller, so the table's update policy decides who may.
-- A note, file or link whose folder is gone comes back at the top of the Vault; a folder comes
-- back with the sub-folders deleted together with it.
create or replace function public.restore_item(p_kind text, p_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare
  cutoff  timestamptz := now() - interval '30 days';
  n       integer;
  removed timestamptz;
begin
  if private.current_workspace_id() is null then
    raise exception 'Not a workspace member' using errcode = '42501';
  end if;
  case p_kind
    when 'opportunity' then
      update public.opportunities set deleted_at = null, deleted_by = null where id = p_id and deleted_at > cutoff;
    when 'project' then
      update public.projects set deleted_at = null, deleted_by = null where id = p_id and deleted_at > cutoff;
    when 'task' then
      update public.tasks set deleted_at = null, deleted_by = null where id = p_id and deleted_at > cutoff;
    when 'event' then
      update public.calendar_events set deleted_at = null, deleted_by = null where id = p_id and deleted_at > cutoff;
    when 'note' then
      update public.notes n set deleted_at = null, deleted_by = null,
             folder_id = case when exists (select 1 from public.vault_folders f
                                            where f.id = n.folder_id and f.deleted_at is null)
                              then n.folder_id end
       where n.id = p_id and n.deleted_at > cutoff;
    when 'bookmark' then
      update public.bookmarks b set deleted_at = null, deleted_by = null,
             folder_id = case when exists (select 1 from public.vault_folders f
                                            where f.id = b.folder_id and f.deleted_at is null)
                              then b.folder_id end
       where b.id = p_id and b.deleted_at > cutoff;
    when 'file' then
      update public.files x set deleted_at = null, deleted_by = null,
             folder_id = case when exists (select 1 from public.vault_folders f
                                            where f.id = x.folder_id and f.deleted_at is null)
                              then x.folder_id end
       where x.id = p_id and x.deleted_at > cutoff and x.message_id is null;
    when 'folder' then
      if exists (select 1 from public.vault_folders f join public.vault_folders p on p.id = f.parent_id
                  where f.id = p_id and p.deleted_at is not null) then
        raise exception 'Restore the folder it was in first' using errcode = 'P0001';
      end if;
      select deleted_at into removed from public.vault_folders where id = p_id and deleted_at > cutoff;
      if removed is null then
        raise exception 'This item can no longer be restored' using errcode = 'P0002';
      end if;
      update public.vault_folders set deleted_at = null, deleted_by = null where id = p_id;
      with recursive tree as (
        select f.id from public.vault_folders f where f.parent_id = p_id and f.deleted_at = removed
        union all
        select f.id from public.vault_folders f join tree t on f.parent_id = t.id where f.deleted_at = removed
      )
      update public.vault_folders set deleted_at = null, deleted_by = null where id in (select id from tree);
      return;
    else
      raise exception 'Unknown kind %', p_kind using errcode = '22023';
  end case;
  get diagnostics n = row_count;
  if n = 0 then
    raise exception 'This item can no longer be restored' using errcode = 'P0002';
  end if;
end;
$$;

------------------------------------------------------------------------------------------
-- Purge (service role only, called by the `maintenance` Edge Function)
------------------------------------------------------------------------------------------
-- Step 1: files that belong to expired tasks or projects expire with them; returns a batch of
-- expired files whose storage objects the function must remove before the rows go.
create or replace function public.purge_prepare(p_days integer default 30, p_limit integer default 500)
returns table (id uuid, storage_path text)
language plpgsql security definer set search_path = '' as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(p_days, 1));
begin
  update public.files f set deleted_at = t.deleted_at
    from public.tasks t
   where f.task_id = t.id and t.deleted_at < cutoff and (f.deleted_at is null or f.deleted_at > t.deleted_at);
  update public.files f set deleted_at = p.deleted_at
    from public.tasks t join public.projects p on p.id = t.project_id
   where f.task_id = t.id and p.deleted_at < cutoff and (f.deleted_at is null or f.deleted_at > p.deleted_at);
  update public.files f set deleted_at = p.deleted_at
    from public.projects p
   where f.project_id = p.id and p.deleted_at < cutoff and (f.deleted_at is null or f.deleted_at > p.deleted_at);
  return query
    select f.id, f.storage_path from public.files f
     where f.deleted_at < cutoff order by f.deleted_at limit greatest(p_limit, 1);
end;
$$;

-- Step 2: deletes the given files (their objects are gone) and every other expired row. Tasks and
-- projects that still have files wait for the next run, so no object is ever left behind.
create or replace function public.purge_finish(p_files uuid[], p_days integer default 30)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  cutoff timestamptz := now() - make_interval(days => greatest(p_days, 1));
  counts jsonb := '{}';
  n      integer;
begin
  delete from public.files where id = any (coalesce(p_files, '{}')) and deleted_at < cutoff;
  get diagnostics n = row_count; counts := counts || jsonb_build_object('files', n);

  delete from public.task_comments where deleted_at < cutoff;
  delete from public.tasks t where t.deleted_at < cutoff
     and not exists (select 1 from public.files f where f.task_id = t.id);
  get diagnostics n = row_count; counts := counts || jsonb_build_object('tasks', n);
  delete from public.checklists where deleted_at < cutoff;
  delete from public.projects p where p.deleted_at < cutoff
     and not exists (select 1 from public.files f where f.project_id = p.id)
     and not exists (select 1 from public.files f join public.tasks t on t.id = f.task_id where t.project_id = p.id);
  get diagnostics n = row_count; counts := counts || jsonb_build_object('projects', n);
  delete from public.notes where deleted_at < cutoff;
  get diagnostics n = row_count; counts := counts || jsonb_build_object('notes', n);
  delete from public.bookmarks where deleted_at < cutoff;
  get diagnostics n = row_count; counts := counts || jsonb_build_object('bookmarks', n);
  delete from public.vault_folders where deleted_at < cutoff;
  get diagnostics n = row_count; counts := counts || jsonb_build_object('folders', n);
  delete from public.calendar_events where deleted_at < cutoff;
  get diagnostics n = row_count; counts := counts || jsonb_build_object('events', n);
  delete from public.opportunities where deleted_at < cutoff;
  get diagnostics n = row_count; counts := counts || jsonb_build_object('opportunities', n);
  delete from public.messages m where m.deleted_at < cutoff
     and not exists (select 1 from public.files f where f.message_id = m.id);
  get diagnostics n = row_count; counts := counts || jsonb_build_object('messages', n);
  return counts;
end;
$$;

-- Nightly: calls the maintenance function only when something has expired.
create or replace function private.trigger_maintenance()
returns void language plpgsql security definer set search_path = '' as $$
declare
  url    text;
  token  text;
  cutoff timestamptz := now() - interval '30 days';
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'maintenance_url';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'maintenance_token';
  if url is null or token is null then
    return;
  end if;
  if not (exists (select 1 from public.files where deleted_at < cutoff)
          or exists (select 1 from public.tasks where deleted_at < cutoff)
          or exists (select 1 from public.projects where deleted_at < cutoff)
          or exists (select 1 from public.notes where deleted_at < cutoff)
          or exists (select 1 from public.bookmarks where deleted_at < cutoff)
          or exists (select 1 from public.vault_folders where deleted_at < cutoff)
          or exists (select 1 from public.calendar_events where deleted_at < cutoff)
          or exists (select 1 from public.opportunities where deleted_at < cutoff)
          or exists (select 1 from public.messages where deleted_at < cutoff)
          or exists (select 1 from public.checklists where deleted_at < cutoff)
          or exists (select 1 from public.task_comments where deleted_at < cutoff)) then
    return;
  end if;
  perform net.http_post(url := url,
                        headers := jsonb_build_object('Content-Type', 'application/json',
                                                      'Authorization', 'Bearer ' || token),
                        body := '{}'::jsonb,
                        timeout_milliseconds := 60000);
end;
$$;

select cron.schedule('nightly-maintenance', '23 3 * * *', 'select private.trigger_maintenance()');

-- Purge lookups (Schema §15 "soft-delete purge" indexes).
create index if not exists files_deleted_at on public.files (deleted_at) where deleted_at is not null;
create index if not exists tasks_deleted_at on public.tasks (deleted_at) where deleted_at is not null;
create index if not exists projects_deleted_at on public.projects (deleted_at) where deleted_at is not null;
create index if not exists notes_deleted_at on public.notes (deleted_at) where deleted_at is not null;
create index if not exists opportunities_deleted_at on public.opportunities (deleted_at) where deleted_at is not null;
create index if not exists messages_deleted_at on public.messages (deleted_at) where deleted_at is not null;

revoke all on function public.recycle_bin, public.restore_item from public, anon;
grant execute on function public.recycle_bin, public.restore_item to authenticated;
revoke all on function public.purge_prepare, public.purge_finish, private.trigger_maintenance
  from public, anon, authenticated;
grant execute on function public.purge_prepare, public.purge_finish to service_role;
