-- Migration 0005 — activity/audit log, rate limits, config, client errors, and the workspace
-- RPCs that depend on them (Schema §26–27; invitations per ADR 0002).

------------------------------------------------------------------------------------------
-- Activity and audit log (append-only)
------------------------------------------------------------------------------------------
create table public.activity_log (
  id            bigint generated always as identity primary key,
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  actor_id      uuid references public.profiles (id) on delete set null,
  category      text not null default 'activity' check (category in ('activity', 'security')),
  action        text not null check (char_length(action) between 1 and 80),
  entity_type   text,
  entity_id     uuid,
  project_id    uuid,
  visibility    public.visibility not null default 'shared',
  guest_visible boolean not null default false,
  summary       text not null check (char_length(summary) <= 300),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index on public.activity_log (workspace_id, created_at desc);
create index on public.activity_log (project_id, created_at desc) where project_id is not null;

alter table public.activity_log enable row level security;
create policy activity_select on public.activity_log for select to authenticated
  using (workspace_id = (select private.current_workspace_id())
         and (visibility = 'shared' or actor_id = (select auth.uid())));
revoke insert, update, delete on public.activity_log from anon, authenticated;

create or replace function private.log_activity(
  p_workspace uuid, p_action text, p_summary text,
  p_category text default 'activity', p_entity_type text default null, p_entity_id uuid default null,
  p_metadata jsonb default '{}', p_visibility public.visibility default 'shared',
  p_project uuid default null, p_guest_visible boolean default false)
returns void language sql security definer set search_path = '' as $$
  insert into public.activity_log (workspace_id, actor_id, category, action, entity_type, entity_id,
                                   project_id, visibility, guest_visible, summary, metadata)
  values (p_workspace, (select auth.uid()), p_category, p_action, p_entity_type, p_entity_id,
          p_project, p_visibility, p_guest_visible, left(p_summary, 300), coalesce(p_metadata, '{}'));
$$;
revoke all on function private.log_activity from public;

------------------------------------------------------------------------------------------
-- Rate limits (server-side only)
------------------------------------------------------------------------------------------
create table public.rate_limit_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index on public.rate_limit_events (user_id, action, created_at);
alter table public.rate_limit_events enable row level security;   -- no policies: server only
revoke all on public.rate_limit_events from anon, authenticated;

-- Records an attempt and returns false when the caller exceeded p_max in p_window.
create or replace function private.consume_rate_limit(p_action text, p_max int, p_window interval)
returns boolean language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  used int;
begin
  if uid is null then
    return false;
  end if;
  select count(*) into used from public.rate_limit_events
   where user_id = uid and action = p_action and created_at > now() - p_window;
  if used >= p_max then
    return false;
  end if;
  insert into public.rate_limit_events (user_id, action) values (uid, p_action);
  return true;
end;
$$;
revoke all on function private.consume_rate_limit from public;

------------------------------------------------------------------------------------------
-- App config and client error reports
------------------------------------------------------------------------------------------
create table public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;
create policy app_config_select on public.app_config for select to authenticated using (true);
revoke insert, update, delete on public.app_config from anon, authenticated;

create table public.client_errors (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles (id) on delete set null,
  error_id    uuid not null,
  route       text check (char_length(route) <= 300),
  message     varchar(500),
  app_version text check (char_length(app_version) <= 40),
  created_at  timestamptz not null default now()
);
alter table public.client_errors enable row level security;   -- no client policies
revoke all on public.client_errors from anon, authenticated;

create or replace function public.report_client_error(
  p_error_id uuid, p_route text, p_message text, p_app_version text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.consume_rate_limit('client_error', 20, interval '1 hour') then
    return;
  end if;
  insert into public.client_errors (user_id, error_id, route, message, app_version)
  values ((select auth.uid()), p_error_id, left(p_route, 300), left(p_message, 500), left(p_app_version, 40));
end;
$$;
revoke all on function public.report_client_error from public, anon;
grant execute on function public.report_client_error to authenticated;

------------------------------------------------------------------------------------------
-- Workspace creation (FR-PLAT-02)
------------------------------------------------------------------------------------------
create or replace function public.create_workspace(p_name text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  uid  uuid := (select auth.uid());
  ws   uuid;
  nm   text := btrim(coalesce(p_name, ''));
  disp text;
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  if char_length(nm) not between 1 and 60 then
    raise exception 'Workspace name must be 1–60 characters' using errcode = '22023';
  end if;
  if exists (select 1 from public.workspace_members where user_id = uid) then
    raise exception 'You already belong to a workspace' using errcode = 'P0001', hint = 'ALREADY_IN_WORKSPACE';
  end if;

  insert into public.workspaces (name, created_by) values (nm, uid) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, seat) values (ws, uid, 1);
  select display_name into disp from public.profiles where id = uid;
  insert into public.workspace_member_history (workspace_id, user_id, seat, display_name, joined_at)
  values (ws, uid, 1, coalesce(disp, 'Member'), now());
  perform private.log_activity(ws, 'workspace.created', 'Created the workspace "' || nm || '"',
                               'security', 'workspace', ws);
  return ws;
end;
$$;
revoke all on function public.create_workspace from public, anon;
grant execute on function public.create_workspace to authenticated;

------------------------------------------------------------------------------------------
-- Workspace invitations as RPCs (ADR 0002). Tokens: 32 random bytes, SHA-256 stored only.
-- Functions return a status object instead of raising for expected failures, so the
-- rate-limit record survives (a raised exception would roll it back).
------------------------------------------------------------------------------------------
create or replace function public.create_workspace_invitation()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid     uuid := (select auth.uid());
  ws      uuid := private.current_workspace_id();
  token   text;
  expires timestamptz := now() + interval '7 days';
begin
  if uid is null or ws is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  if not private.consume_rate_limit('invite.create', 5, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  if (select count(*) from public.workspace_members where workspace_id = ws) >= 2 then
    return jsonb_build_object('ok', false, 'code', 'WORKSPACE_FULL');
  end if;

  update public.workspace_invitations set revoked_at = now()
   where workspace_id = ws and accepted_at is null and revoked_at is null;

  token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.workspace_invitations (workspace_id, token_hash, created_by, expires_at)
  values (ws, extensions.digest(token, 'sha256'), uid, expires);

  perform private.log_activity(ws, 'invitation.created', 'Created a partner invitation', 'security',
                               'workspace', ws);
  return jsonb_build_object('ok', true, 'token', token, 'expires_at', expires);
end;
$$;

create or replace function public.revoke_workspace_invitation()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  ws uuid := private.current_workspace_id();
  n  int;
begin
  if ws is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  update public.workspace_invitations set revoked_at = now()
   where workspace_id = ws and accepted_at is null and revoked_at is null;
  get diagnostics n = row_count;
  if n > 0 then
    perform private.log_activity(ws, 'invitation.revoked', 'Revoked the partner invitation', 'security',
                                 'workspace', ws);
  end if;
  return jsonb_build_object('ok', true, 'revoked', n);
end;
$$;

create or replace function public.accept_workspace_invitation(p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := (select auth.uid());
  inv   public.workspace_invitations%rowtype;
  seat_ smallint;
  disp  text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_SIGNED_IN');
  end if;
  if not private.consume_rate_limit('invite.accept', 10, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  if p_token is null or char_length(p_token) not between 20 and 100 then
    return jsonb_build_object('ok', false, 'code', 'INVITE_INVALID');
  end if;

  select * into inv from public.workspace_invitations
   where token_hash = extensions.digest(p_token, 'sha256')
     and accepted_at is null and revoked_at is null and expires_at > now()
   for update;
  if not found then
    return jsonb_build_object('ok', false, 'code', 'INVITE_INVALID');
  end if;

  if exists (select 1 from public.workspace_members where user_id = uid) then
    return jsonb_build_object('ok', false,
      'code', case when exists (select 1 from public.workspace_members
                                 where user_id = uid and workspace_id = inv.workspace_id)
                   then 'ALREADY_MEMBER' else 'ALREADY_IN_WORKSPACE' end);
  end if;

  seat_ := case when exists (select 1 from public.workspace_members
                              where workspace_id = inv.workspace_id and seat = 1) then 2 else 1 end;
  begin
    insert into public.workspace_members (workspace_id, user_id, seat) values (inv.workspace_id, uid, seat_);
  exception when unique_violation or check_violation then
    return jsonb_build_object('ok', false, 'code', 'WORKSPACE_FULL');
  end;

  update public.workspace_invitations set accepted_at = now(), accepted_by = uid where id = inv.id;
  select display_name into disp from public.profiles where id = uid;
  insert into public.workspace_member_history (workspace_id, user_id, seat, display_name, joined_at)
  values (inv.workspace_id, uid, seat_, coalesce(disp, 'Member'), now());
  perform private.log_activity(inv.workspace_id, 'invitation.accepted',
                               coalesce(disp, 'A new member') || ' joined the workspace', 'security',
                               'workspace', inv.workspace_id);
  return jsonb_build_object('ok', true, 'workspace_id', inv.workspace_id);
end;
$$;

revoke all on function public.create_workspace_invitation, public.revoke_workspace_invitation,
  public.accept_workspace_invitation from public, anon;
grant execute on function public.create_workspace_invitation, public.revoke_workspace_invitation,
  public.accept_workspace_invitation to authenticated;
