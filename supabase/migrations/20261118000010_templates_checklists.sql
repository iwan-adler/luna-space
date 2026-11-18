-- Migration 0010 — templates and checklists (Schema §18; FR-PRJ-08, FR-PRJ-09, FR-AUTO-08).

create table public.templates (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid references public.workspaces (id) on delete cascade,   -- null = built-in
  kind          text not null check (kind in
                  ('submission_checklist', 'packing_list', 'meeting_note', 'retrospective', 'pitch', 'project')),
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  body          jsonb not null check (jsonb_typeof(body -> 'items') = 'array'),
  is_builtin    boolean not null default false,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  check (is_builtin = (workspace_id is null))
);

create table public.checklists (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  project_id    uuid,
  trip_id       uuid,
  template_id   uuid references public.templates (id) on delete set null,
  title         text not null check (char_length(btrim(title)) between 1 and 120),
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (id, workspace_id),
  foreign key (project_id, workspace_id) references public.projects (id, workspace_id) on delete cascade,
  check (num_nonnulls(project_id, trip_id) = 1)
);
create index on public.checklists (project_id) where deleted_at is null;

create table public.checklist_items (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null,
  checklist_id  uuid not null,
  label         text not null check (char_length(btrim(label)) between 1 and 300),
  position      double precision not null default 0,
  is_done       boolean not null default false,
  done_by       uuid references public.profiles (id) on delete set null,
  done_at       timestamptz,
  assignee_id   uuid references public.profiles (id) on delete set null,
  due_date      date,
  for_user_id   uuid references public.profiles (id) on delete set null,
  client_id     uuid unique,
  foreign key (checklist_id, workspace_id) references public.checklists (id, workspace_id) on delete cascade,
  check (is_done = (done_at is not null))
);
create index on public.checklist_items (checklist_id, position);

create trigger checklists_ws before insert on public.checklists
  for each row execute function private.inherit_workspace_from('projects', 'project_id');
create trigger checklist_items_ws before insert on public.checklist_items
  for each row execute function private.inherit_workspace_from('checklists', 'checklist_id');

create or replace function private.prepare_checklist_item()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.is_done and (tg_op = 'INSERT' or not old.is_done) then
    new.done_at := now();
    new.done_by := (select auth.uid());
  elsif not new.is_done then
    new.done_at := null;
    new.done_by := null;
  end if;
  if new.assignee_id is not null and not exists (
       select 1 from public.workspace_members m
        where m.workspace_id = new.workspace_id and m.user_id = new.assignee_id) then
    raise exception 'The assignee is not a member of this workspace' using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger checklist_items_prepare before insert or update on public.checklist_items
  for each row execute function private.prepare_checklist_item();

------------------------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------------------------
alter table public.templates enable row level security;
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;

create policy templates_select on public.templates for select to authenticated
  using (workspace_id is null or workspace_id = (select private.current_workspace_id()));
create policy templates_insert on public.templates for insert to authenticated
  with check (workspace_id = (select private.current_workspace_id()) and not is_builtin
              and created_by = (select auth.uid()));
create policy templates_update on public.templates for update to authenticated
  using (workspace_id = (select private.current_workspace_id()))
  with check (workspace_id = (select private.current_workspace_id()) and not is_builtin);
create policy templates_delete on public.templates for delete to authenticated
  using (workspace_id = (select private.current_workspace_id()));

create policy checklists_all on public.checklists for all to authenticated
  using (project_id is not null and exists (select 1 from public.projects p where p.id = project_id))
  with check (project_id is not null and exists (select 1 from public.projects p where p.id = project_id));
create policy checklist_items_all on public.checklist_items for all to authenticated
  using (exists (select 1 from public.checklists c where c.id = checklist_id))
  with check (exists (select 1 from public.checklists c where c.id = checklist_id));
revoke all on public.templates, public.checklists, public.checklist_items from anon;

------------------------------------------------------------------------------------------
-- RPCs (security invoker)
------------------------------------------------------------------------------------------
create or replace function public.create_checklist_from_template(p_project uuid, p_template uuid)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  t   public.templates%rowtype;
  cid uuid;
begin
  select * into t from public.templates where id = p_template;
  if not found then
    raise exception 'Template not found' using errcode = 'P0002';
  end if;
  insert into public.checklists (workspace_id, project_id, template_id, title, created_by)
  values (private.current_workspace_id(), p_project, t.id, t.title, (select auth.uid()))
  returning id into cid;
  insert into public.checklist_items (workspace_id, checklist_id, label, position)
  select private.current_workspace_id(), cid, left(item ->> 'label', 300), ord * 1024
    from jsonb_array_elements(t.body -> 'items') with ordinality as x(item, ord)
   where coalesce(btrim(item ->> 'label'), '') <> '';
  return cid;
end;
$$;

create or replace function public.save_checklist_as_template(p_checklist uuid, p_title text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  tid uuid;
begin
  if not exists (select 1 from public.checklists where id = p_checklist) then
    raise exception 'Checklist not found' using errcode = 'P0002';
  end if;
  insert into public.templates (workspace_id, kind, title, body, created_by)
  values (private.current_workspace_id(), 'submission_checklist', btrim(p_title),
          jsonb_build_object('items', coalesce((select jsonb_agg(jsonb_build_object('label', label) order by position)
                                                 from public.checklist_items where checklist_id = p_checklist), '[]'::jsonb)),
          (select auth.uid()))
  returning id into tid;
  return tid;
end;
$$;
revoke all on function public.create_checklist_from_template, public.save_checklist_as_template from public, anon;
grant execute on function public.create_checklist_from_template, public.save_checklist_as_template to authenticated;

alter publication supabase_realtime add table public.checklist_items;

------------------------------------------------------------------------------------------
-- Built-in templates (FR-PRJ-08)
------------------------------------------------------------------------------------------
insert into public.templates (workspace_id, kind, title, body, is_builtin) values
 (null, 'submission_checklist', 'Generic hackathon submission', '{"items":[
   {"label":"Team registered and all members confirmed"},
   {"label":"Problem statement / track chosen"},
   {"label":"Public code repository with a clear README"},
   {"label":"Setup and run instructions tested on a clean machine"},
   {"label":"Demo video recorded (check the length limit)"},
   {"label":"Pitch deck finished and exported to PDF"},
   {"label":"Screenshots added to the submission"},
   {"label":"All required links work in a private browser window"},
   {"label":"Submission form completed and submitted before the deadline"},
   {"label":"Confirmation email or screenshot saved"}]}', true),
 (null, 'submission_checklist', 'Devpost-style submission', '{"items":[
   {"label":"Project page created with title and tagline"},
   {"label":"Inspiration, what it does, how we built it written"},
   {"label":"Challenges, accomplishments and what we learned written"},
   {"label":"Built-with technologies tagged"},
   {"label":"Demo video link (YouTube/Vimeo) added"},
   {"label":"Repository link added and public"},
   {"label":"Team members invited to the project page"},
   {"label":"Prize categories / tracks selected"},
   {"label":"Submitted before the deadline"}]}', true),
 (null, 'pitch', 'Pitch deck checklist', '{"items":[
   {"label":"Problem: who has it and why it matters"},
   {"label":"Solution in one sentence"},
   {"label":"Live demo or screenshots"},
   {"label":"How it works (architecture in one slide)"},
   {"label":"Impact, users or market"},
   {"label":"What is next"},
   {"label":"Team slide"},
   {"label":"Timed rehearsal within the limit"}]}', true),
 (null, 'pitch', 'Demo video checklist', '{"items":[
   {"label":"Script written (hook, problem, demo, close)"},
   {"label":"Screen recording in 1080p"},
   {"label":"Audio is clear; captions added"},
   {"label":"Length within the limit"},
   {"label":"Uploaded and link set to public or unlisted"},
   {"label":"Link tested while signed out"}]}', true);
