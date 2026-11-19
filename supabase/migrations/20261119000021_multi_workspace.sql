-- Migration 0021 — many workspaces per person, more members per workspace (ADR 0018).
-- Supersedes the two-seat model (NFR-SEC-02 as written, Schema §14–15). A person can belong to
-- several workspaces; each workspace holds up to `max_members` people (default 12).
--
-- Which workspace a request is about: the browser sends `x-workspace-id` with every API call.
-- private.current_workspace_id() uses it when the caller is a member of that workspace,
-- otherwise the caller's last chosen workspace (profiles.active_workspace_id), otherwise their
-- oldest membership. Every existing policy keeps working unchanged, and a header naming a
-- workspace the caller is not in is simply ignored.

------------------------------------------------------------------------------------------
-- Schema
------------------------------------------------------------------------------------------
alter table public.workspace_members drop constraint workspace_members_user_id_key;
alter table public.workspace_members drop constraint workspace_members_seat_check;
alter table public.workspace_members add constraint workspace_members_seat_check check (seat between 1 and 50);
alter table public.workspace_members
  add column role text not null default 'member' check (role in ('owner', 'member'));
update public.workspace_members m set role = 'owner'
  from public.workspaces w
 where w.id = m.workspace_id and w.created_by = m.user_id;
-- Workspaces whose creator has left get their longest-standing member as owner.
update public.workspace_members m set role = 'owner'
 where not exists (select 1 from public.workspace_members o where o.workspace_id = m.workspace_id and o.role = 'owner')
   and m.joined_at = (select min(joined_at) from public.workspace_members x where x.workspace_id = m.workspace_id);
create index on public.workspace_members (user_id);

alter table public.workspaces
  add column max_members smallint not null default 12 check (max_members between 2 and 50),
  add column emoji text check (char_length(emoji) <= 8);

alter table public.profiles
  add column active_workspace_id uuid references public.workspaces (id) on delete set null;

alter table public.workspace_invitations
  add column use_count smallint not null default 0;

------------------------------------------------------------------------------------------
-- The current workspace
------------------------------------------------------------------------------------------
create or replace function private.requested_workspace_id()
returns uuid language sql stable set search_path = '' as $$
  select case when h ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then h::uuid end
    from (select nullif(current_setting('request.headers', true), '')::json ->> 'x-workspace-id' as h) r;
$$;

create or replace function private.current_workspace_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select m.workspace_id from public.workspace_members m
      where m.user_id = (select auth.uid()) and m.workspace_id = private.requested_workspace_id()),
    (select m.workspace_id from public.workspace_members m
       join public.profiles p on p.id = m.user_id and p.active_workspace_id = m.workspace_id
      where m.user_id = (select auth.uid())),
    (select m.workspace_id from public.workspace_members m
      where m.user_id = (select auth.uid()) order by m.joined_at, m.workspace_id limit 1));
$$;
revoke all on function private.requested_workspace_id() from public;
grant execute on function private.requested_workspace_id() to authenticated, service_role;

-- Everyone may see the workspaces they belong to (for the switcher), not only the current one.
drop policy workspaces_select on public.workspaces;
create policy workspaces_select on public.workspaces for select to authenticated
  using (private.is_member(id));

-- The switcher: every workspace I belong to, with my role and the member count.
create or replace function public.my_workspaces()
returns table (id uuid, name text, emoji text, role text, member_count integer, max_members smallint,
               joined_at timestamptz, is_active boolean)
language sql stable security definer set search_path = '' as $$
  select w.id, w.name, w.emoji, m.role,
         (select count(*)::int from public.workspace_members x where x.workspace_id = w.id),
         w.max_members, m.joined_at,
         w.id = (select p.active_workspace_id from public.profiles p where p.id = (select auth.uid()))
    from public.workspace_members m join public.workspaces w on w.id = m.workspace_id
   where m.user_id = (select auth.uid()) and w.deleted_at is null
   order by m.joined_at;
$$;

-- Remembers the workspace I last opened (live updates and background jobs follow it).
create or replace function public.set_active_workspace(p_workspace uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(p_workspace) then
    raise exception 'Not a member of that workspace' using errcode = '42501';
  end if;
  update public.profiles set active_workspace_id = p_workspace where id = (select auth.uid());
end;
$$;

------------------------------------------------------------------------------------------
-- Creating, joining, leaving
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
  if (select count(*) from public.workspace_members where user_id = uid) >= 20 then
    raise exception 'You can be in at most 20 workspaces' using errcode = 'P0001', hint = 'TOO_MANY_WORKSPACES';
  end if;

  insert into public.workspaces (name, created_by) values (nm, uid) returning id into ws;
  insert into public.workspace_members (workspace_id, user_id, seat, role) values (ws, uid, 1, 'owner');
  update public.profiles set active_workspace_id = ws where id = uid;
  select display_name into disp from public.profiles where id = uid;
  insert into public.workspace_member_history (workspace_id, user_id, seat, display_name, joined_at)
  values (ws, uid, 1, coalesce(disp, 'Member'), now());
  perform private.log_activity(ws, 'workspace.created', 'Created the workspace "' || nm || '"',
                               'security', 'workspace', ws);
  return ws;
end;
$$;

-- One invite link per workspace, usable by several people until it expires or the workspace is full.
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
  if not private.consume_rate_limit('invite.create', 10, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  if (select count(*) from public.workspace_members where workspace_id = ws)
     >= (select max_members from public.workspaces where id = ws) then
    return jsonb_build_object('ok', false, 'code', 'WORKSPACE_FULL');
  end if;

  update public.workspace_invitations set revoked_at = now()
   where workspace_id = ws and accepted_at is null and revoked_at is null;

  token := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  insert into public.workspace_invitations (workspace_id, token_hash, created_by, expires_at)
  values (ws, extensions.digest(token, 'sha256'), uid, expires);

  perform private.log_activity(ws, 'invitation.created', 'Created an invite link', 'security',
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
    perform private.log_activity(ws, 'invitation.revoked', 'Turned off the invite link', 'security',
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
  cap   smallint;
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
  if exists (select 1 from public.workspace_members where user_id = uid and workspace_id = inv.workspace_id) then
    return jsonb_build_object('ok', false, 'code', 'ALREADY_MEMBER', 'workspace_id', inv.workspace_id);
  end if;
  if (select count(*) from public.workspace_members where user_id = uid) >= 20 then
    return jsonb_build_object('ok', false, 'code', 'TOO_MANY_WORKSPACES');
  end if;

  -- Serialise joins to this workspace so the member cap holds.
  select max_members into cap from public.workspaces where id = inv.workspace_id for update;
  if (select count(*) from public.workspace_members where workspace_id = inv.workspace_id) >= cap then
    return jsonb_build_object('ok', false, 'code', 'WORKSPACE_FULL');
  end if;
  select coalesce(max(seat), 0) + 1 into seat_ from public.workspace_members where workspace_id = inv.workspace_id;
  insert into public.workspace_members (workspace_id, user_id, seat, role) values (inv.workspace_id, uid, seat_, 'member');

  update public.workspace_invitations set use_count = use_count + 1 where id = inv.id;
  update public.profiles set active_workspace_id = inv.workspace_id where id = uid;
  select display_name into disp from public.profiles where id = uid;
  insert into public.workspace_member_history (workspace_id, user_id, seat, display_name, joined_at)
  values (inv.workspace_id, uid, seat_, coalesce(disp, 'Member'), now());
  perform private.log_activity(inv.workspace_id, 'invitation.accepted',
                               coalesce(disp, 'A new member') || ' joined the workspace', 'security',
                               'workspace', inv.workspace_id);
  return jsonb_build_object('ok', true, 'workspace_id', inv.workspace_id);
end;
$$;

-- Ends a membership: the person's open assignments there are cleared, their private items stay
-- theirs (and invisible to others), and the last member leaving deletes the workspace (purged
-- after 30 days). An owner who leaves hands ownership to the longest-standing member.
create or replace function private.end_membership(p_workspace uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  was_owner boolean;
  disp text;
begin
  delete from public.workspace_members where workspace_id = p_workspace and user_id = p_user
  returning role = 'owner' into was_owner;
  if was_owner is null then
    raise exception 'Not a member' using errcode = 'P0002';
  end if;
  update public.workspace_member_history set left_at = now()
   where workspace_id = p_workspace and user_id = p_user and left_at is null;
  update public.tasks set assignee_id = null
   where workspace_id = p_workspace and assignee_id = p_user and status <> 'done';
  update public.profiles set active_workspace_id = null
   where id = p_user and active_workspace_id = p_workspace;
  if not exists (select 1 from public.workspace_members where workspace_id = p_workspace) then
    update public.workspaces set deleted_at = now() where id = p_workspace;
    return;
  end if;
  if was_owner and not exists (select 1 from public.workspace_members
                                where workspace_id = p_workspace and role = 'owner') then
    update public.workspace_members set role = 'owner'
     where workspace_id = p_workspace
       and user_id = (select user_id from public.workspace_members where workspace_id = p_workspace
                       order by joined_at limit 1);
  end if;
  select display_name into disp from public.profiles where id = p_user;
  perform private.log_activity(p_workspace, 'member.left', coalesce(disp, 'A member') || ' left the workspace',
                               'security', 'workspace', p_workspace);
end;
$$;

create or replace function public.leave_workspace(p_workspace uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_member(p_workspace) then
    raise exception 'Not a member of that workspace' using errcode = '42501';
  end if;
  perform private.end_membership(p_workspace, (select auth.uid()));
end;
$$;

-- Owners can remove a member of the current workspace (not themselves: they leave instead).
create or replace function public.remove_workspace_member(p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ws uuid := private.current_workspace_id();
begin
  if ws is null or not exists (select 1 from public.workspace_members
                                where workspace_id = ws and user_id = (select auth.uid()) and role = 'owner') then
    raise exception 'Only the owner can remove members' using errcode = '42501';
  end if;
  if p_user = (select auth.uid()) then
    raise exception 'Use leave instead' using errcode = '22023';
  end if;
  perform private.end_membership(ws, p_user);
end;
$$;

-- Any member can rename the workspace or set its emoji; only the owner changes the member limit.
create or replace function public.update_workspace(p_name text, p_emoji text, p_max_members smallint)
returns void language plpgsql security definer set search_path = '' as $$
declare
  ws uuid := private.current_workspace_id();
  n  integer;
begin
  if ws is null then
    raise exception 'Not a member' using errcode = '42501';
  end if;
  if p_max_members is not null then
    if not exists (select 1 from public.workspace_members where workspace_id = ws
                    and user_id = (select auth.uid()) and role = 'owner') then
      raise exception 'Only the owner can change the member limit' using errcode = '42501';
    end if;
    select count(*) into n from public.workspace_members where workspace_id = ws;
    if p_max_members < greatest(n, 2) then
      raise exception 'The limit cannot be below the current number of members' using errcode = '22023';
    end if;
  end if;
  if p_name is not null and char_length(btrim(p_name)) not between 1 and 60 then
    raise exception 'Workspace name must be 1–60 characters' using errcode = '22023';
  end if;
  update public.workspaces
     set name = coalesce(btrim(p_name), name),
         emoji = case when p_emoji is null then emoji else nullif(btrim(p_emoji), '') end,
         max_members = coalesce(p_max_members, max_members)
   where id = ws;
end;
$$;

------------------------------------------------------------------------------------------
-- Functions that assumed one workspace per person or a single partner
------------------------------------------------------------------------------------------
-- Chat: everyone else in the workspace is notified (one notification per burst each).
create or replace function private.notify_new_message()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  member uuid;
  sender text;
begin
  select display_name into sender from public.profiles where id = new.sender_id;
  for member in select user_id from public.workspace_members
                 where workspace_id = new.workspace_id and user_id is distinct from new.sender_id loop
    perform private.notify(new.workspace_id, member, 'chat.message',
      coalesce(sender, 'Someone') || ': ' ||
        left(coalesce(nullif(btrim(new.body), ''), case when new.kind = 'file' then 'sent a file' else 'sent a message' end), 120),
      '/chat', 'message', new.id,
      'chat:' || member || ':' || floor(extract(epoch from new.created_at) / 600)::bigint);
  end loop;
  return null;
end;
$$;

-- Reminders: a new member's reminders are planned in the workspace they joined; a time-zone change
-- re-plans every workspace the person is in.
create or replace function private.on_reminder_context_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  ws  uuid;
  uid uuid := coalesce(to_jsonb(new) ->> 'user_id', to_jsonb(new) ->> 'id')::uuid;
begin
  if tg_table_name = 'workspace_members' then
    perform private.resync_workspace_reminders((to_jsonb(new) ->> 'workspace_id')::uuid);
    return null;
  end if;
  for ws in select workspace_id from public.workspace_members where user_id = uid loop
    perform private.resync_workspace_reminders(ws);
  end loop;
  return null;
end;
$$;

-- Test push: in the current workspace.
create or replace function public.send_test_notification()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
  ws  uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_SIGNED_IN');
  end if;
  if not private.consume_rate_limit('push.test', 5, interval '1 hour') then
    return jsonb_build_object('ok', false, 'code', 'RATE_LIMITED');
  end if;
  ws := private.current_workspace_id();
  if ws is null then
    select workspace_id into ws from public.project_guest_memberships
     where user_id = uid and removed_at is null limit 1;
  end if;
  if ws is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  insert into public.notifications (workspace_id, recipient_id, type, title, body, link_path, dedupe_key)
  values (ws, uid, 'push.test', 'Test notification', 'Notifications are working on this device.',
          '/notifications', 'push.test:' || gen_random_uuid());
  return jsonb_build_object('ok', true);
end;
$$;

-- Storage: object access follows the file row, checked by membership rather than by the current
-- workspace (uploads and downloads do not carry the workspace header).
create or replace function private.can_read_object(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.files f
     where f.storage_path = p_name and f.deleted_at is null
       and ((private.is_member(f.workspace_id) and (f.visibility = 'shared' or f.owner_id = (select auth.uid())))
            or (f.project_id is not null and f.guest_visible and private.guest_role(f.project_id) is not null)));
$$;
create or replace function private.can_upload_object(p_name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.files f
                  where f.storage_path = p_name and f.owner_id = (select auth.uid()) and f.upload_state = 'pending');
$$;
drop policy wf_read on storage.objects;
create policy wf_read on storage.objects for select to authenticated
  using (bucket_id = 'workspace-files' and private.can_read_object(name));
drop policy wf_insert on storage.objects;
create policy wf_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'workspace-files' and private.can_upload_object(name));

------------------------------------------------------------------------------------------
-- Grants
------------------------------------------------------------------------------------------
revoke all on function public.my_workspaces, public.set_active_workspace, public.leave_workspace,
  public.remove_workspace_member, public.update_workspace from public, anon;
grant execute on function public.my_workspaces, public.set_active_workspace, public.leave_workspace,
  public.remove_workspace_member, public.update_workspace to authenticated;
revoke all on function private.end_membership, private.can_read_object, private.can_upload_object
  from public, anon;
grant execute on function private.can_read_object, private.can_upload_object to authenticated;
grant select (id, workspace_id, created_by, created_at, expires_at, accepted_by, accepted_at, revoked_at, use_count)
  on public.workspace_invitations to authenticated;

------------------------------------------------------------------------------------------
-- Calendar subscription link: covers every workspace the person belongs to
------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.calendar_feed_for_token(p_token text)
 RETURNS TABLE(source_type text, source_id uuid, parent_id uuid, title text, kind text, all_day boolean, start_date date, end_date date, starts_at timestamp with time zone, ends_at timestamp with time zone, timezone text, rrule text, exdates date[], location text, description text, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  uid uuid;
  wss uuid[];
begin
  if p_token is null or char_length(p_token) not between 20 and 100 then
    raise exception 'Unknown calendar link' using errcode = 'P0002';
  end if;
  update public.calendar_feed_tokens set last_used_at = now()
   where token_hash = extensions.digest(p_token, 'sha256')
  returning user_id into uid;
  if uid is null then
    raise exception 'Unknown calendar link' using errcode = 'P0002';
  end if;
  select array_agg(m.workspace_id) into wss from public.workspace_members m where m.user_id = uid;
  if wss is null then
    return;
  end if;

  return query
  select 'event'::text, e.id, null::uuid, e.title, e.kind::text, e.all_day, e.start_date, e.end_date,
         e.starts_at, e.ends_at, e.timezone, e.rrule, e.exdates, e.location, e.description, e.updated_at
    from public.calendar_events e
   where e.workspace_id = any (wss) and e.deleted_at is null and (e.visibility = 'shared' or e.owner_id = uid)
     and (e.rrule is not null
          or coalesce(e.end_date, e.start_date, (e.starts_at at time zone 'UTC')::date) >= current_date - 60)
     and coalesce(e.start_date, (e.starts_at at time zone 'UTC')::date) <= current_date + 730
  union all
  select 'opportunity_date', d.id, o.id, o.title || ' — ' || replace(d.kind::text, '_', ' '), 'deadline',
         d.all_day, d.on_date, d.on_date, d.at_time, d.at_time, d.source_timezone, null, null, null,
         o.official_url, o.updated_at
    from public.opportunity_dates d join public.opportunities o on o.id = d.opportunity_id
   where o.workspace_id = any (wss) and o.deleted_at is null and (o.visibility = 'shared' or o.owner_id = uid)
     and coalesce(d.on_date, (d.at_time at time zone 'UTC')::date) between current_date - 60 and current_date + 730
  union all
  select 'task', t.id, t.project_id, 'Task: ' || t.title, 'task_due', t.due_at is null, t.due_date, t.due_date,
         t.due_at, t.due_at, t.due_timezone, null, null, null, null, t.updated_at
    from public.tasks t
    left join public.projects p on p.id = t.project_id
   where t.workspace_id = any (wss) and t.deleted_at is null and t.status <> 'done'
     and (t.due_date is not null or t.due_at is not null)
     and (case when t.project_id is null then (t.visibility = 'shared' or t.owner_id = uid)
               else p.deleted_at is null and (p.visibility = 'shared' or p.owner_id = uid) end)
     and coalesce(t.due_date, (t.due_at at time zone 'UTC')::date) between current_date - 60 and current_date + 730
  union all
  select 'project_end', p.id, p.id, p.name || ' — project end', 'milestone', true, p.end_date, p.end_date,
         null, null, null, null, null, null, null, p.updated_at
    from public.projects p
   where p.workspace_id = any (wss) and p.deleted_at is null and p.end_date is not null
     and (p.visibility = 'shared' or p.owner_id = uid)
     and p.end_date between current_date - 60 and current_date + 730;
end;
$function$;

------------------------------------------------------------------------------------------
-- Push links name their workspace (?ws=…), so tapping one opens the right workspace
------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_push_batch(p_limit integer DEFAULT 200)
 RETURNS TABLE(notification_id uuid, recipient_id uuid, title text, body text, link_path text, show_details boolean, subscriptions jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  return query
  with candidates as (
    select n.id
      from public.notifications n
      join public.notification_preferences p on p.user_id = n.recipient_id and p.push_enabled
      join public.profiles pr on pr.id = n.recipient_id
     where n.pushed_at is null
       and n.created_at > now() - interval '12 hours'
       and exists (select 1 from public.push_subscriptions s where s.user_id = n.recipient_id)
       and not private.in_quiet_hours(p.quiet_start, p.quiet_end, pr.timezone, now())
     order by n.created_at
     limit p_limit
     for update of n skip locked),
  claimed as (
    update public.notifications n set pushed_at = now()
      from candidates c where n.id = c.id
    returning n.id, n.recipient_id, n.title, n.body, n.link_path, n.workspace_id)
  select c.id, c.recipient_id, c.title, c.body,
         case when c.link_path like '/%' and c.link_path not like '/guest%'
              then c.link_path || case when position('?' in c.link_path) > 0 then '&' else '?' end || 'ws=' || c.workspace_id
              else c.link_path end,
         coalesce((select p.lockscreen_details from public.notification_preferences p
                    where p.user_id = c.recipient_id), true),
         coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint,
                                                       'p256dh', s.p256dh, 'auth', s.auth))
                     from public.push_subscriptions s where s.user_id = c.recipient_id), '[]'::jsonb)
    from claimed c;
end;
$function$;
