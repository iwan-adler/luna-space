-- Migration 0008 — projects, project members, tasks, comments (Schema §18; FR-PRJ-01–06, 10; FR-OPP-15).

create table public.projects (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  owner_id        uuid references public.profiles (id) on delete set null,
  visibility      public.visibility not null default 'shared',
  opportunity_id  uuid,
  name            text not null check (char_length(btrim(name)) between 1 and 120),
  category        public.project_category not null default 'hackathon',
  summary         text check (char_length(summary) <= 5000),
  stage           public.project_stage not null default 'idea',
  start_date      date,
  end_date        date,
  repo_urls       text[] not null default '{}',
  links           jsonb not null default '[]',
  search          tsvector generated always as (
                    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(summary, '')), 'C')) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  foreign key (opportunity_id, workspace_id)
    references public.opportunities (id, workspace_id) on delete set null (opportunity_id),
  check (visibility = 'shared' or owner_id is not null),
  check (end_date is null or start_date is null or end_date >= start_date),
  check (jsonb_typeof(links) = 'array')
);
create unique index projects_one_per_opportunity
  on public.projects (opportunity_id) where opportunity_id is not null and deleted_at is null;
create index on public.projects (workspace_id, stage, updated_at desc) where deleted_at is null;
create index on public.projects using gin (search);
create index on public.projects (owner_id);

create table public.project_members (
  project_id    uuid not null,
  workspace_id  uuid not null,
  user_id       uuid not null,
  role_label    text check (char_length(role_label) <= 60),
  primary key (project_id, user_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade,
  foreign key (workspace_id, user_id) references public.workspace_members (workspace_id, user_id) on delete cascade
);

create table public.tasks (
  id              uuid primary key default gen_random_uuid(),
  workspace_id    uuid not null references public.workspaces (id) on delete cascade,
  owner_id        uuid references public.profiles (id) on delete set null,
  visibility      public.visibility not null default 'shared',
  project_id      uuid,
  parent_task_id  uuid,
  title           text not null check (char_length(btrim(title)) between 1 and 300),
  description     text check (char_length(description) <= 20000),
  status          public.task_status not null default 'todo',
  priority        public.task_priority not null default 'medium',
  assignee_id     uuid references public.profiles (id) on delete set null,
  due_date        date,
  due_at          timestamptz,
  due_timezone    text,
  position        double precision not null default 0,
  tags            text[] not null default '{}',
  client_id       uuid unique,
  completed_at    timestamptz,
  search          tsvector generated always as (
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(description, '')), 'C')) stored,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  deleted_by      uuid references public.profiles (id) on delete set null,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade,
  foreign key (parent_task_id, workspace_id) references public.tasks (id, workspace_id) on delete cascade,
  check (visibility = 'shared' or owner_id is not null),
  check (project_id is null or visibility = 'shared'),
  check (due_date is null or due_at is null),
  check (due_at is null or due_timezone is not null),
  check (parent_task_id is null or parent_task_id <> id),
  check ((status = 'done') = (completed_at is not null))
);
create index on public.tasks (project_id, status, position) where deleted_at is null;
create index on public.tasks (assignee_id, due_date) where status <> 'done' and deleted_at is null;
create index on public.tasks (parent_task_id);
create index on public.tasks (workspace_id, updated_at desc) where deleted_at is null;
create index on public.tasks using gin (search);

create table public.task_comments (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null,
  task_id       uuid not null,
  author_id     uuid references public.profiles (id) on delete set null,
  body          text not null check (char_length(btrim(body)) between 1 and 5000),
  edited_at     timestamptz,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  foreign key (task_id, workspace_id) references public.tasks (id, workspace_id) on delete cascade
);
create index on public.task_comments (task_id, created_at);

------------------------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------------------------
create trigger projects_updated_at before update on public.projects
  for each row execute function private.set_updated_at();
create trigger projects_protect_owner before update on public.projects
  for each row execute function private.protect_owner();
create trigger tasks_updated_at before update on public.tasks
  for each row execute function private.set_updated_at();
create trigger tasks_protect_owner before update on public.tasks
  for each row execute function private.protect_owner();
create trigger tasks_due_tz before insert or update on public.tasks
  for each row execute function private.validate_timezone_column('due_timezone');

-- Child rows inherit the workspace of their parent (clients never choose it).
create or replace function private.inherit_workspace_from()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  parent_table text := tg_argv[0];
  parent_col   text := tg_argv[1];
  parent_id    uuid := (to_jsonb(new) ->> parent_col)::uuid;
  ws           uuid;
begin
  if parent_id is null then
    return new;
  end if;
  execute format('select workspace_id from public.%I where id = $1', parent_table) into ws using parent_id;
  new.workspace_id := ws;
  return new;
end;
$$;
create trigger project_members_ws before insert on public.project_members
  for each row execute function private.inherit_workspace_from('projects', 'project_id');
create trigger task_comments_ws before insert on public.task_comments
  for each row execute function private.inherit_workspace_from('tasks', 'task_id');

-- Tasks: workspace from the project (or the caller for loose tasks), completion time,
-- one level of subtasks, and assignees who are members of the workspace (Schema §31.4).
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
    end if;
  end if;
  if new.status = 'done' and new.completed_at is null then
    new.completed_at := now();
  elsif new.status <> 'done' then
    new.completed_at := null;
  end if;
  if new.assignee_id is not null and not exists (
       select 1 from public.workspace_members m
        where m.workspace_id = new.workspace_id and m.user_id = new.assignee_id) then
    raise exception 'The assignee is not a member of this workspace' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger tasks_prepare before insert or update on public.tasks
  for each row execute function private.prepare_task();

-- The creator becomes a project member (role labels are optional).
create or replace function private.add_project_creator()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.owner_id is not null then
    insert into public.project_members (project_id, workspace_id, user_id)
    values (new.id, new.workspace_id, new.owner_id)
    on conflict do nothing;
  end if;
  return null;
end;
$$;
create trigger projects_add_creator after insert on public.projects
  for each row execute function private.add_project_creator();

-- Activity (FR-PLAT-09, FR-PRJ-10)
create or replace function private.log_project_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.workspace_id, 'project.created', 'Created the project "' || new.name || '"',
      'activity', 'project', new.id, '{}', new.visibility, new.id);
  elsif new.deleted_at is not null and old.deleted_at is null then
    perform private.log_activity(new.workspace_id, 'project.deleted', 'Moved "' || new.name || '" to the recycle bin',
      'activity', 'project', new.id, '{}', new.visibility, new.id);
  elsif new.stage is distinct from old.stage then
    perform private.log_activity(new.workspace_id, 'project.stage_changed',
      '"' || new.name || '" moved to ' || new.stage::text, 'activity', 'project', new.id,
      jsonb_build_object('from', old.stage, 'to', new.stage), new.visibility, new.id);
  end if;
  return null;
end;
$$;
create trigger projects_activity after insert or update on public.projects
  for each row execute function private.log_project_activity();

create or replace function private.log_task_activity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  label text := '"' || left(new.title, 80) || '"';
begin
  if tg_op = 'INSERT' then
    perform private.log_activity(new.workspace_id, 'task.created', 'Added task ' || label,
      'activity', 'task', new.id, '{}', new.visibility, new.project_id);
  elsif new.deleted_at is not null and old.deleted_at is null then
    perform private.log_activity(new.workspace_id, 'task.deleted', 'Deleted task ' || label,
      'activity', 'task', new.id, '{}', new.visibility, new.project_id);
  else
    if new.status is distinct from old.status then
      perform private.log_activity(new.workspace_id,
        case when new.status = 'done' then 'task.completed' else 'task.moved' end,
        case when new.status = 'done' then 'Completed ' || label
             else 'Moved ' || label || ' to ' || replace(new.status::text, '_', ' ') end,
        'activity', 'task', new.id, jsonb_build_object('from', old.status, 'to', new.status),
        new.visibility, new.project_id);
    end if;
    if new.assignee_id is distinct from old.assignee_id and new.assignee_id is not null then
      perform private.log_activity(new.workspace_id, 'task.assigned',
        'Assigned ' || label || ' to ' || coalesce((select display_name from public.profiles where id = new.assignee_id), 'someone'),
        'activity', 'task', new.id, '{}', new.visibility, new.project_id);
    end if;
  end if;
  return null;
end;
$$;
create trigger tasks_activity after insert or update on public.tasks
  for each row when (new.parent_task_id is null)
  execute function private.log_task_activity();

------------------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;

create policy projects_select on public.projects for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())));
create policy projects_insert on public.projects for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid()));
create policy projects_update on public.projects for update to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or owner_id = (select auth.uid())))
  with check (workspace_id = (select private.current_workspace_id())
              and (visibility = 'shared' or owner_id = (select auth.uid())));

create policy project_members_all on public.project_members for all to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id))
  with check (exists (select 1 from public.projects p where p.id = project_id));

-- Tasks inherit their project's access; loose tasks use their own visibility.
create policy tasks_select on public.tasks for select to authenticated
  using (workspace_id = (select private.current_workspace_id()) and (
           (project_id is not null and exists (select 1 from public.projects p where p.id = project_id))
        or (project_id is null and (visibility = 'shared' or owner_id = (select auth.uid())))));
create policy tasks_insert on public.tasks for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and owner_id = (select auth.uid()) and (
                (project_id is not null and exists (select 1 from public.projects p where p.id = project_id))
             or project_id is null));
create policy tasks_update on public.tasks for update to authenticated
  using (workspace_id = (select private.current_workspace_id()) and (
           (project_id is not null and exists (select 1 from public.projects p where p.id = project_id))
        or (project_id is null and (visibility = 'shared' or owner_id = (select auth.uid())))))
  with check (workspace_id = (select private.current_workspace_id()) and (
           (project_id is not null and exists (select 1 from public.projects p where p.id = project_id))
        or (project_id is null and (visibility = 'shared' or owner_id = (select auth.uid())))));

create policy task_comments_select on public.task_comments for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id));
create policy task_comments_insert on public.task_comments for insert to authenticated
  with check (author_id = (select auth.uid()) and exists (select 1 from public.tasks t where t.id = task_id));
create policy task_comments_update on public.task_comments for update to authenticated
  using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));

revoke all on public.projects, public.project_members, public.tasks, public.task_comments from anon;
-- Clients never choose the workspace of children; the triggers fill it in.

------------------------------------------------------------------------------------------
-- Convert an opportunity into a project room (FR-OPP-15, AC-16). Security invoker: RLS applies.
------------------------------------------------------------------------------------------
create or replace function public.convert_opportunity_to_project(p_opportunity uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  o        public.opportunities%rowtype;
  existing uuid;
  pid      uuid;
  tz       text;
  start_d  date;
  end_d    date;
  links    jsonb := '[]';
begin
  select * into o from public.opportunities where id = p_opportunity and deleted_at is null;
  if not found then
    raise exception 'Opportunity not found' using errcode = 'P0002';
  end if;
  select id into existing from public.projects where opportunity_id = o.id and deleted_at is null;
  if existing is not null then
    return existing;
  end if;

  select coalesce(p.timezone, 'Asia/Kolkata') into tz from public.profiles p where p.id = (select auth.uid());
  select coalesce(d.on_date, (d.at_time at time zone coalesce(d.source_timezone, tz))::date) into start_d
    from public.opportunity_dates d where d.opportunity_id = o.id and d.kind = 'event_start';
  select coalesce(d.on_date, (d.at_time at time zone coalesce(d.source_timezone, tz))::date) into end_d
    from public.opportunity_dates d where d.opportunity_id = o.id and d.kind = 'submission_deadline';
  if end_d is null then
    select coalesce(d.on_date, (d.at_time at time zone coalesce(d.source_timezone, tz))::date) into end_d
      from public.opportunity_dates d where d.opportunity_id = o.id and d.kind = 'event_end';
  end if;
  if start_d is not null and end_d is not null and end_d < start_d then
    start_d := null;
  end if;
  if o.official_url is not null then
    links := links || jsonb_build_array(jsonb_build_object('label', 'Official website', 'url', o.official_url));
  end if;
  if o.registration_url is not null then
    links := links || jsonb_build_array(jsonb_build_object('label', 'Registration', 'url', o.registration_url));
  end if;

  insert into public.projects (workspace_id, owner_id, visibility, opportunity_id, name, category, summary,
                               stage, start_date, end_date, links)
  values (o.workspace_id, (select auth.uid()), o.visibility, o.id, left(o.title, 120),
          case o.type
            when 'hackathon' then 'hackathon'
            when 'coding_competition' then 'competition'
            when 'innovation_challenge' then 'competition'
            when 'research_programme' then 'research'
            else 'other' end::public.project_category,
          case when o.team_min is not null or o.team_max is not null
               then 'Team size: ' || coalesce(o.team_min::text, '?') || '–' || coalesce(o.team_max::text, '?') end,
          'planning', start_d, end_d, links)
  returning id into pid;

  if o.status in ('saved', 'interested') then
    update public.opportunities set status = 'planning' where id = o.id;
  end if;
  return pid;
end;
$$;
revoke all on function public.convert_opportunity_to_project from public, anon;
grant execute on function public.convert_opportunity_to_project to authenticated;

-- Live updates for the board (TRD §9); Realtime applies RLS to change events.
alter publication supabase_realtime add table public.tasks, public.task_comments, public.projects;
