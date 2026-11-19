-- Migration 0024 — usage panel (FR-PLAT, ADR 0022).
-- Counts and storage for the current workspace, plus the size of the whole database, so members
-- can see how close the project is to its plan limits. Numbers only: no content, no names.

create or replace function public.workspace_usage()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  ws uuid := private.current_workspace_id();
begin
  if ws is null then
    raise exception 'Not a workspace member' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'members',        (select count(*) from public.workspace_members where workspace_id = ws),
    'opportunities',  (select count(*) from public.opportunities where workspace_id = ws and deleted_at is null),
    'projects',       (select count(*) from public.projects where workspace_id = ws and deleted_at is null),
    'tasks',          (select count(*) from public.tasks where workspace_id = ws and deleted_at is null),
    'notes',          (select count(*) from public.notes where workspace_id = ws and deleted_at is null),
    'messages',       (select count(*) from public.messages where workspace_id = ws and deleted_at is null),
    'files',          (select count(*) from public.files where workspace_id = ws and deleted_at is null
                                                          and upload_state = 'stored'),
    'storage_bytes',  (select coalesce(sum(size_bytes), 0) from public.files
                        where workspace_id = ws and deleted_at is null and upload_state = 'stored'),
    'trash_bytes',    (select coalesce(sum(size_bytes), 0) from public.files
                        where workspace_id = ws and deleted_at is not null),
    'database_bytes', pg_database_size(current_database())
  );
end;
$$;

revoke all on function public.workspace_usage from public, anon;
grant execute on function public.workspace_usage to authenticated;
