-- Migration 0011 — project-scoped guest access (Schema §31; FR-GUEST-01–15; AC-26–34).
-- Guests never enter workspace_members. They reach a room only through the guest policies below.
-- Invitations use security-definer RPCs instead of Edge Functions, as workspace invitations do
-- (ADR 0002, ADR 0006).

------------------------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------------------------
create table public.project_guest_invitations (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null,
  project_id    uuid not null,
  token_hash    bytea not null unique check (octet_length(token_hash) = 32),
  role          public.guest_role not null default 'collaborator',
  label         text check (char_length(label) <= 60),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  max_uses      smallint check (max_uses between 1 and 25),
  use_count     smallint not null default 0 check (use_count >= 0),
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  revoked_by    uuid references public.profiles (id) on delete set null,
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade,
  check (expires_at > created_at and expires_at <= created_at + interval '30 days'),
  check (max_uses is null or use_count <= max_uses)
);
create index on public.project_guest_invitations (project_id, created_at desc);

create table public.project_guest_memberships (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null,
  project_id      uuid not null,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  role            public.guest_role not null,
  invitation_id   uuid references public.project_guest_invitations (id) on delete set null,
  joined_at       timestamptz not null default now(),
  role_changed_at timestamptz,
  role_changed_by uuid references public.profiles (id) on delete set null,
  removed_at      timestamptz,
  removed_by      uuid references public.profiles (id) on delete set null,
  removal_reason  text check (removal_reason in ('removed', 'left', 'became_member', 'project_deleted')),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade,
  check ((removed_at is null) = (removal_reason is null))
);
create unique index project_guest_memberships_one_active
  on public.project_guest_memberships (project_id, user_id) where removed_at is null;
create index on public.project_guest_memberships (user_id) where removed_at is null;

create table public.project_guest_settings (
  project_id                     uuid primary key,
  workspace_id                   uuid not null,
  collaborators_can_upload_files boolean not null default true,
  collaborators_can_create_tasks boolean not null default true,
  collaborators_can_schedule     boolean not null default true,
  viewers_can_comment            boolean not null default false,
  guests_see_activity            boolean not null default true,
  max_guests                     smallint not null default 10 check (max_guests between 1 and 25),
  updated_at                     timestamptz not null default now(),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade
);
create trigger project_guest_settings_updated_at before update on public.project_guest_settings
  for each row execute function private.set_updated_at();

-- "Visible to guests" flags (Schema §31.2, FR-GUEST-08)
alter table public.tasks add column guest_visible boolean not null default true,
  add constraint tasks_guest_vis check (not guest_visible or project_id is not null);
alter table public.checklists add column guest_visible boolean not null default true;
alter table public.files add column guest_visible boolean not null default false,
  add constraint files_guest_vis check (not guest_visible or (project_id is not null and visibility = 'shared'));

------------------------------------------------------------------------------------------
-- Helpers (Schema §31.3)
------------------------------------------------------------------------------------------
create or replace function private.guest_role(p_project uuid)
returns public.guest_role language sql stable security definer set search_path = '' as $$
  select g.role from public.project_guest_memberships g
   where g.project_id = p_project and g.user_id = (select auth.uid()) and g.removed_at is null;
$$;

create or replace function private.guest_setting(p_project uuid, p_key text)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select (to_jsonb(s) ->> p_key)::boolean
                     from public.project_guest_settings s where s.project_id = p_project), false);
$$;

-- True when the caller is a member of the project's workspace and can see the project.
create or replace function private.is_room_member(p_project uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects p
                  where p.id = p_project and p.workspace_id = private.current_workspace_id()
                    and (p.visibility = 'shared' or p.owner_id = (select auth.uid())));
$$;

-- Whether a person may be attached to a row of this project (Schema §31.4 validate_room_person).
create or replace function private.is_room_person(p_workspace uuid, p_project uuid, p_user uuid,
                                                  p_guest_visible boolean)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_members m
                  where m.workspace_id = p_workspace and m.user_id = p_user)
      or (p_project is not null and p_guest_visible and exists (
            select 1 from public.project_guest_memberships g
             where g.project_id = p_project and g.user_id = p_user and g.removed_at is null));
$$;

-- People of a room for display: names, avatars, kind and role only.
create or replace function public.project_directory(p_project uuid)
returns table (user_id uuid, display_name text, avatar_path text, kind text, role text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, p.display_name, p.avatar_path, 'member', null
    from public.projects pr
    join public.workspace_members m on m.workspace_id = pr.workspace_id
    join public.profiles p on p.id = m.user_id
   where pr.id = p_project and (private.is_room_member(p_project) or private.guest_role(p_project) is not null)
  union all
  select g.user_id, p.display_name, p.avatar_path, 'guest', g.role::text
    from public.project_guest_memberships g join public.profiles p on p.id = g.user_id
   where g.project_id = p_project and g.removed_at is null
     and (private.is_room_member(p_project) or private.guest_role(p_project) is not null);
$$;

revoke all on function private.guest_role, private.guest_setting, private.is_room_member,
  private.is_room_person from public;
grant execute on function private.guest_role, private.guest_setting, private.is_room_member,
  private.is_room_person to authenticated;
revoke all on function public.project_directory from public, anon;
grant execute on function public.project_directory to authenticated;

------------------------------------------------------------------------------------------
-- Integrity triggers (Schema §31.4)
------------------------------------------------------------------------------------------
-- Every project gets a settings row (and existing ones are back-filled).
create or replace function private.add_guest_settings()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.project_guest_settings (project_id, workspace_id) values (new.id, new.workspace_id)
  on conflict do nothing;
  return null;
end;
$$;
create trigger projects_guest_settings after insert on public.projects
  for each row execute function private.add_guest_settings();
insert into public.project_guest_settings (project_id, workspace_id) select id, workspace_id from public.projects;

-- Members can't be guests; rooms have a cap (row-locks the project so concurrent joins serialise).
create or replace function private.check_new_guest()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  cap smallint;
begin
  if exists (select 1 from public.workspace_members m
              where m.workspace_id = new.workspace_id and m.user_id = new.user_id) then
    raise exception 'Workspace members cannot be guests' using errcode = '23514';
  end if;
  perform 1 from public.projects where id = new.project_id for update;
  select max_guests into cap from public.project_guest_settings where project_id = new.project_id;
  if (select count(*) from public.project_guest_memberships
       where project_id = new.project_id and removed_at is null) >= coalesce(cap, 10) then
    raise exception 'ROOM_FULL' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger guest_memberships_check before insert on public.project_guest_memberships
  for each row execute function private.check_new_guest();

-- Removal clears the guest's open assignments in that room (FR-GUEST-09, AC-31).
create or replace function private.on_guest_removed()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.tasks set assignee_id = null
   where project_id = new.project_id and assignee_id = new.user_id and status <> 'done';
  update public.checklist_items i set assignee_id = null
    from public.checklists c
   where c.id = i.checklist_id and c.project_id = new.project_id and i.assignee_id = new.user_id
     and not i.is_done;
  return null;
end;
$$;
create trigger guest_memberships_removed after update of removed_at on public.project_guest_memberships
  for each row when (old.removed_at is null and new.removed_at is not null)
  execute function private.on_guest_removed();

-- Joining the workspace ends guest memberships there; deleting a project ends its guests.
create or replace function private.end_guest_on_membership()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.project_guest_memberships
     set removed_at = now(), removal_reason = 'became_member'
   where workspace_id = new.workspace_id and user_id = new.user_id and removed_at is null;
  return null;
end;
$$;
create trigger workspace_members_end_guest after insert on public.workspace_members
  for each row execute function private.end_guest_on_membership();

create or replace function private.end_guests_on_project_delete()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.project_guest_memberships
     set removed_at = now(), removed_by = (select auth.uid()), removal_reason = 'project_deleted'
   where project_id = new.id and removed_at is null;
  update public.project_guest_invitations set revoked_at = now(), revoked_by = (select auth.uid())
   where project_id = new.id and revoked_at is null;
  return null;
end;
$$;
create trigger projects_end_guests after update of deleted_at on public.projects
  for each row when (old.deleted_at is null and new.deleted_at is not null)
  execute function private.end_guests_on_project_delete();

-- Guest writes: fixed placement, forced visibility, limited columns (Schema §31.4 guard_guest_write).
create or replace function private.guard_guest_write()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  uid      uuid := (select auth.uid());
  project  uuid;
  allowed  text[];
  owner_col text;
  role_    public.guest_role;
begin
  if uid is null or private.is_member(new.workspace_id) then
    return new;                                   -- members and server code are not restricted here
  end if;

  project := case tg_table_name
               when 'projects' then (to_jsonb(new) ->> 'id')::uuid
               when 'task_comments' then (select project_id from public.tasks where id = (to_jsonb(new) ->> 'task_id')::uuid)
               when 'checklist_items' then (select project_id from public.checklists where id = (to_jsonb(new) ->> 'checklist_id')::uuid)
               else (to_jsonb(new) ->> 'project_id')::uuid end;
  role_ := private.guest_role(project);

  if tg_op = 'INSERT' then
    if tg_table_name in ('tasks', 'files') then
      return jsonb_populate_record(new, jsonb_build_object('owner_id', uid, 'guest_visible', true, 'visibility', 'shared'));
    elsif tg_table_name = 'checklists' then
      return jsonb_populate_record(new, jsonb_build_object('created_by', uid, 'guest_visible', true));
    end if;
    return new;
  end if;

  allowed := case tg_table_name
    when 'projects' then array['name', 'summary', 'stage', 'start_date', 'end_date', 'links', 'repo_urls', 'updated_at']
    when 'tasks' then array['title', 'description', 'status', 'priority', 'assignee_id', 'due_date', 'due_at',
                            'due_timezone', 'position', 'tags', 'completed_at', 'updated_at', 'deleted_at', 'deleted_by']
    when 'task_comments' then array['body', 'edited_at', 'deleted_at']
    when 'checklist_items' then array['label', 'position', 'is_done', 'done_by', 'done_at', 'assignee_id', 'due_date']
    when 'files' then array['file_name', 'upload_state', 'deleted_at', 'deleted_by']
    else array[]::text[] end;
  if (to_jsonb(new) - allowed - 'search') is distinct from (to_jsonb(old) - allowed - 'search') then
    raise exception 'Guests cannot change these fields' using errcode = '42501';
  end if;
  if tg_table_name = 'projects' and (role_ is distinct from 'project_admin' or to_jsonb(new) ->> 'stage' = 'archived') then
    raise exception 'Only a project admin can edit project details' using errcode = '42501';
  end if;

  -- Soft delete: own rows; a project admin may also remove rows other guests created.
  if (to_jsonb(new) ->> 'deleted_at') is distinct from (to_jsonb(old) ->> 'deleted_at') then
    owner_col := case tg_table_name when 'task_comments' then 'author_id' else 'owner_id' end;
    if (to_jsonb(old) ->> owner_col)::uuid is distinct from uid
       and not (role_ = 'project_admin'
                and not private.is_room_person(new.workspace_id, null, (to_jsonb(old) ->> owner_col)::uuid, false)) then
      raise exception 'Guests can only delete items they created' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;
create trigger projects_guest_guard before update on public.projects
  for each row execute function private.guard_guest_write();
create trigger tasks_guest_guard before insert or update on public.tasks
  for each row execute function private.guard_guest_write();
create trigger task_comments_guest_guard before update on public.task_comments
  for each row execute function private.guard_guest_write();
create trigger checklists_guest_guard before insert or update on public.checklists
  for each row execute function private.guard_guest_write();
create trigger checklist_items_guest_guard before update on public.checklist_items
  for each row execute function private.guard_guest_write();
create trigger files_guest_guard before insert or update on public.files
  for each row execute function private.guard_guest_write();

-- Assignees may now be active guests of the room (replaces the member-only check of 0008/0010).
create or replace function private.prepare_task()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  parent public.tasks%rowtype;
begin
  if tg_op = 'INSERT' then
    if new.project_id is not null then
      select workspace_id into new.workspace_id from public.projects where id = new.project_id;
    end if;
    if new.parent_task_id is not null then
      select * into parent from public.tasks where id = new.parent_task_id;
      if parent.parent_task_id is not null then
        raise exception 'Subtasks cannot have subtasks' using errcode = '23514';
      end if;
      new.project_id := parent.project_id;
      new.workspace_id := parent.workspace_id;
      new.visibility := parent.visibility;
      new.guest_visible := parent.guest_visible;
    end if;
  end if;
  if new.project_id is null then
    new.guest_visible := false;                  -- loose tasks are never visible to guests
  end if;
  if new.status = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  if new.assignee_id is not null
     and not private.is_room_person(new.workspace_id, new.project_id, new.assignee_id, new.guest_visible) then
    raise exception 'The assignee is not a member or guest of this room' using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.prepare_checklist_item()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c public.checklists%rowtype;
begin
  if new.is_done and (tg_op = 'INSERT' or not old.is_done) then
    new.done_at := now();
    new.done_by := (select auth.uid());
  elsif not new.is_done then
    new.done_at := null;
    new.done_by := null;
  end if;
  if new.assignee_id is not null then
    select * into c from public.checklists where id = new.checklist_id;
    if not private.is_room_person(new.workspace_id, c.project_id, new.assignee_id, c.guest_visible) then
      raise exception 'The assignee is not a member or guest of this room' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

-- Activity about guest-visible items is visible to guests (FR-GUEST-13).
create or replace function private.log_task_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  label text := '"' || left(new.title, 80) || '"';
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.workspace_id, 'task.created', 'Added task ' || label,
      'activity', 'task', new.id, '{}', new.visibility, new.project_id, new.guest_visible);
  elsif new.deleted_at is not null and old.deleted_at is null then
    perform private.log_activity(new.workspace_id, 'task.deleted', 'Deleted task ' || label,
      'activity', 'task', new.id, '{}', new.visibility, new.project_id, new.guest_visible);
  else
    if new.status is distinct from old.status then
      perform private.log_activity(new.workspace_id,
        case when new.status = 'done' then 'task.completed' else 'task.moved' end,
        case when new.status = 'done' then 'Completed ' || label
             else 'Moved ' || label || ' to ' || replace(new.status::text, '_', ' ') end,
        'activity', 'task', new.id, jsonb_build_object('from', old.status, 'to', new.status),
        new.visibility, new.project_id, new.guest_visible);
    end if;
    if new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
      perform private.log_activity(new.workspace_id, 'task.assigned',
        'Assigned ' || label || ' to ' || coalesce((select display_name from public.profiles where id = new.assignee_id), 'someone'),
        'activity', 'task', new.id, '{}', new.visibility, new.project_id, new.guest_visible);
    end if;
  end if;
  return null;
end;
$$;

------------------------------------------------------------------------------------------
-- Tighten Phase 4 policies that relied on "can see the project" (guests can now see rooms)
------------------------------------------------------------------------------------------
drop policy project_members_all on public.project_members;
create policy project_members_all on public.project_members for all to authenticated
  using (private.is_room_member(project_id)) with check (private.is_room_member(project_id));

drop policy checklists_all on public.checklists;
create policy checklists_member_all on public.checklists for all to authenticated
  using (project_id is not null and private.is_room_member(project_id))
  with check (project_id is not null and private.is_room_member(project_id));

drop policy checklist_items_all on public.checklist_items;
create policy checklist_items_member_all on public.checklist_items for all to authenticated
  using (exists (select 1 from public.checklists c where c.id = checklist_id and private.is_room_member(c.project_id)))
  with check (exists (select 1 from public.checklists c where c.id = checklist_id and private.is_room_member(c.project_id)));

drop policy task_comments_insert on public.task_comments;
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (
    select 1 from public.tasks t where t.id = task_id and (
         t.workspace_id = (select private.current_workspace_id())
      or private.guest_role(t.project_id) >= 'collaborator'
      or (private.guest_role(t.project_id) = 'viewer' and private.guest_setting(t.project_id, 'viewers_can_comment')))));

------------------------------------------------------------------------------------------
-- Guest policies (Schema §31.5). A null role makes every comparison false.
------------------------------------------------------------------------------------------
create policy projects_guest_select on public.projects for select to authenticated
  using (deleted_at is null and private.guest_role(id) is not null);
create policy projects_guest_admin_update on public.projects for update to authenticated
  using (private.guest_role(id) = 'project_admin') with check (private.guest_role(id) = 'project_admin');

create policy tasks_guest_select on public.tasks for select to authenticated
  using (project_id is not null and guest_visible and deleted_at is null
         and private.guest_role(project_id) is not null);
create policy tasks_guest_insert on public.tasks for insert to authenticated
  with check (project_id is not null and guest_visible and owner_id = (select auth.uid())
              and private.guest_role(project_id) >= 'collaborator'
              and private.guest_setting(project_id, 'collaborators_can_create_tasks'));
create policy tasks_guest_update on public.tasks for update to authenticated
  using (project_id is not null and guest_visible and private.guest_role(project_id) >= 'collaborator')
  with check (project_id is not null and guest_visible and private.guest_role(project_id) >= 'collaborator');

create policy checklists_guest_select on public.checklists for select to authenticated
  using (project_id is not null and guest_visible and deleted_at is null
         and private.guest_role(project_id) is not null);
create policy checklist_items_guest_select on public.checklist_items for select to authenticated
  using (exists (select 1 from public.checklists c where c.id = checklist_id and c.guest_visible
                  and c.deleted_at is null and private.guest_role(c.project_id) is not null));
create policy checklist_items_guest_insert on public.checklist_items for insert to authenticated
  with check (exists (select 1 from public.checklists c where c.id = checklist_id and c.guest_visible
                       and private.guest_role(c.project_id) >= 'collaborator'));
create policy checklist_items_guest_update on public.checklist_items for update to authenticated
  using (exists (select 1 from public.checklists c where c.id = checklist_id and c.guest_visible
                  and private.guest_role(c.project_id) >= 'collaborator'))
  with check (exists (select 1 from public.checklists c where c.id = checklist_id and c.guest_visible
                       and private.guest_role(c.project_id) >= 'collaborator'));

create policy files_guest_select on public.files for select to authenticated
  using (project_id is not null and guest_visible and deleted_at is null
         and private.guest_role(project_id) is not null);
create policy files_guest_insert on public.files for insert to authenticated
  with check (project_id is not null and guest_visible and visibility = 'shared'
              and owner_id = (select auth.uid()) and upload_state = 'pending'
              and private.guest_role(project_id) >= 'collaborator'
              and private.guest_setting(project_id, 'collaborators_can_upload_files')
              and (task_id is null or exists (select 1 from public.tasks t where t.id = task_id)));
create policy files_guest_update on public.files for update to authenticated
  using (project_id is not null and guest_visible and private.guest_role(project_id) >= 'collaborator')
  with check (project_id is not null and guest_visible and private.guest_role(project_id) >= 'collaborator');
grant update (guest_visible) on public.files to authenticated;

create policy activity_guest_select on public.activity_log for select to authenticated
  using (project_id is not null and guest_visible and private.guest_role(project_id) is not null
         and private.guest_setting(project_id, 'guests_see_activity'));

-- Guest tables: read only; every change goes through the RPCs below.
alter table public.project_guest_invitations enable row level security;
alter table public.project_guest_memberships enable row level security;
alter table public.project_guest_settings enable row level security;

create policy pgi_select on public.project_guest_invitations for select to authenticated
  using (private.is_room_member(project_id) or private.guest_role(project_id) = 'project_admin');
create policy pgm_select on public.project_guest_memberships for select to authenticated
  using (user_id = (select auth.uid()) or private.is_room_member(project_id)
         or private.guest_role(project_id) = 'project_admin');
create policy pgs_select on public.project_guest_settings for select to authenticated
  using (private.is_room_member(project_id) or private.guest_role(project_id) is not null);
create policy pgs_update on public.project_guest_settings for update to authenticated
  using (private.is_room_member(project_id) or private.guest_role(project_id) = 'project_admin')
  with check (private.is_room_member(project_id) or private.guest_role(project_id) = 'project_admin');

revoke all on public.project_guest_invitations, public.project_guest_memberships,
  public.project_guest_settings from anon, authenticated;
grant select (id, workspace_id, project_id, role, label, created_by, created_at, expires_at, max_uses,
              use_count, last_used_at, revoked_at, revoked_by)
  on public.project_guest_invitations to authenticated;          -- never token_hash
grant select on public.project_guest_memberships, public.project_guest_settings to authenticated;
grant update (collaborators_can_upload_files, collaborators_can_create_tasks, collaborators_can_schedule,
              viewers_can_comment, guests_see_activity, max_guests)
  on public.project_guest_settings to authenticated;

------------------------------------------------------------------------------------------
-- RPCs. Expected failures return {ok:false, code} so rate-limit records are kept.
------------------------------------------------------------------------------------------
create or replace function public.create_project_invitation(
  p_project uuid, p_role public.guest_role, p_expires_hours int, p_max_uses int, p_label text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid    uuid := (select auth.uid());
  p      public.projects%rowtype;
  member boolean;
  token  text;
  inv_id uuid;
  exp    timestamptz;
begin
  select * into p from public.projects where id = p_project and deleted_at is null;
  if uid is null or not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  member := private.is_room_member(p_project);
  if not member and private.guest_role(p_project) is distinct from 'project_admin' then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  if p_role = 'project_admin' and not member then
    return jsonb_build_object('ok', false, 'code', 'MEMBERS_ONLY_ADMIN');
  end if;
  if p.visibility = 'private' or p.stage = 'archived' then
    return jsonb_build_object('ok', false, 'code', 'ROOM_NOT_SHAREABLE');
  end if;
  if p_expires_hours not in (1, 24, 168, 720) or (p_max_uses is not null and p_max_uses not between 1 and 25)
     or char_length(coalesce(p_label, '')) > 60 then
    return jsonb_build_object('ok', false, 'code', '22023');
  end if;
  if not private.consume_rate_limit('guest_invite.create:' || p_project, 20, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;

  token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  exp := now() + make_interval(hours => p_expires_hours);
  insert into public.project_guest_invitations (workspace_id, project_id, token_hash, role, label, created_by,
                                                expires_at, max_uses)
  values (p.workspace_id, p.id, extensions.digest(token, 'sha256'), p_role, nullif(btrim(p_label), ''), uid,
          exp, p_max_uses)
  returning id into inv_id;
  perform private.log_activity(p.workspace_id, 'guest_invitation.created',
    'Created a ' || replace(p_role::text, '_', ' ') || ' invitation' || coalesce(' "' || nullif(btrim(p_label), '') || '"', ''),
    'security', 'project', p.id, jsonb_build_object('invitation', inv_id), 'shared', p.id, false);
  return jsonb_build_object('ok', true, 'token', token, 'id', inv_id, 'expires_at', exp);
end;
$$;

create or replace function public.revoke_project_invitation(p_invitation uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  inv public.project_guest_invitations%rowtype;
begin
  select * into inv from public.project_guest_invitations where id = p_invitation for update;
  if not found or not (private.is_room_member(inv.project_id)
                       or private.guest_role(inv.project_id) = 'project_admin') then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if inv.revoked_at is null then
    update public.project_guest_invitations set revoked_at = now(), revoked_by = (select auth.uid())
     where id = inv.id;
    perform private.log_activity(inv.workspace_id, 'guest_invitation.revoked', 'Revoked a guest invitation',
      'security', 'project', inv.project_id, jsonb_build_object('invitation', inv.id), 'shared', inv.project_id, false);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.accept_project_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := (select auth.uid());
  inv  public.project_guest_invitations%rowtype;
  p    public.projects%rowtype;
  disp text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_SIGNED_IN');
  end if;
  if not private.consume_rate_limit('guest_invite.accept', 10, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  if (select email_confirmed_at from auth.users where id = uid) is null then
    return jsonb_build_object('ok', false, 'code', 'EMAIL_UNCONFIRMED');
  end if;
  if p_token is null or char_length(p_token) not between 20 and 100 then
    return jsonb_build_object('ok', false, 'code', 'INVITE_INVALID');
  end if;

  select * into inv from public.project_guest_invitations
   where token_hash = extensions.digest(p_token, 'sha256') for update;
  select * into p from public.projects where id = inv.project_id;
  if inv.id is null or inv.revoked_at is not null or inv.expires_at <= now()
     or (inv.max_uses is not null and inv.use_count >= inv.max_uses)
     or p.deleted_at is not null or p.stage = 'archived' or p.visibility = 'private' then
    return jsonb_build_object('ok', false, 'code', 'INVITE_INVALID');
  end if;

  if exists (select 1 from public.workspace_members where workspace_id = inv.workspace_id and user_id = uid) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_MEMBER', 'project_id', inv.project_id);
  end if;
  if exists (select 1 from public.project_guest_memberships
              where project_id = inv.project_id and user_id = uid and removed_at is null) then
    return jsonb_build_object('ok', true, 'project_id', inv.project_id,
      'role', (select role from public.project_guest_memberships
                where project_id = inv.project_id and user_id = uid and removed_at is null));
  end if;

  begin
    insert into public.project_guest_memberships (workspace_id, project_id, user_id, role, invitation_id)
    values (inv.workspace_id, inv.project_id, uid, inv.role, inv.id);
  exception when check_violation then
    return jsonb_build_object('ok', false, 'code', 'ROOM_FULL');
  end;
  update public.project_guest_invitations set use_count = use_count + 1, last_used_at = now() where id = inv.id;
  select display_name into disp from public.profiles where id = uid;
  perform private.log_activity(inv.workspace_id, 'guest.joined',
    coalesce(disp, 'A guest') || ' joined as ' || replace(inv.role::text, '_', ' '),
    'activity', 'project', inv.project_id, jsonb_build_object('invitation', inv.id), 'shared', inv.project_id, true);
  return jsonb_build_object('ok', true, 'project_id', inv.project_id, 'role', inv.role);
end;
$$;

create or replace function public.set_guest_role(p_membership uuid, p_role public.guest_role)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g      public.project_guest_memberships%rowtype;
  member boolean;
begin
  select * into g from public.project_guest_memberships where id = p_membership and removed_at is null for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  member := private.is_room_member(g.project_id);
  if not member and (private.guest_role(g.project_id) is distinct from 'project_admin'
                     or p_role = 'project_admin' or g.role = 'project_admin') then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  if g.role is distinct from p_role then
    update public.project_guest_memberships
       set role = p_role, role_changed_at = now(), role_changed_by = (select auth.uid())
     where id = g.id;
    perform private.log_activity(g.workspace_id, 'guest.role_changed',
      coalesce((select display_name from public.profiles where id = g.user_id), 'A guest') || ' is now a '
        || replace(p_role::text, '_', ' '),
      'security', 'project', g.project_id, '{}', 'shared', g.project_id, false);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.remove_project_guest(p_membership uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g public.project_guest_memberships%rowtype;
begin
  select * into g from public.project_guest_memberships where id = p_membership and removed_at is null for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  if not private.is_room_member(g.project_id)
     and (private.guest_role(g.project_id) is distinct from 'project_admin' or g.role = 'project_admin') then
    return jsonb_build_object('ok', false, 'code', '42501');
  end if;
  update public.project_guest_memberships
     set removed_at = now(), removed_by = (select auth.uid()), removal_reason = 'removed'
   where id = g.id;
  perform private.log_activity(g.workspace_id, 'guest.removed',
    coalesce((select display_name from public.profiles where id = g.user_id), 'A guest') || ' was removed from the room',
    'security', 'project', g.project_id, '{}', 'shared', g.project_id, false);
  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.leave_project(p_project uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  g public.project_guest_memberships%rowtype;
begin
  select * into g from public.project_guest_memberships
   where project_id = p_project and user_id = (select auth.uid()) and removed_at is null for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  end if;
  update public.project_guest_memberships
     set removed_at = now(), removed_by = g.user_id, removal_reason = 'left'
   where id = g.id;
  perform private.log_activity(g.workspace_id, 'guest.left',
    coalesce((select display_name from public.profiles where id = g.user_id), 'A guest') || ' left the room',
    'activity', 'project', g.project_id, '{}', 'shared', g.project_id, false);
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.create_project_invitation, public.revoke_project_invitation,
  public.accept_project_invitation, public.set_guest_role, public.remove_project_guest,
  public.leave_project from public, anon;
grant execute on function public.create_project_invitation, public.revoke_project_invitation,
  public.accept_project_invitation, public.set_guest_role, public.remove_project_guest,
  public.leave_project to authenticated;

alter publication supabase_realtime add table public.project_guest_memberships;
