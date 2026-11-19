-- Migration 0025 — private Realtime channels for presence and typing (security review, ADR 0022).
-- Presence ("online") and typing broadcasts used public channels named after the workspace id:
-- anyone signed in who learned that id could listen. The app now joins them as private channels,
-- and Realtime admits only members of that workspace (Realtime Authorization reads these
-- policies on realtime.messages). Database-change subscriptions were already protected by each
-- table's own RLS.

create or replace function private.channel_workspace(p_topic text)
returns uuid language sql immutable set search_path = '' as $$
  select case when p_topic ~ '^(presence|typing):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              then split_part(p_topic, ':', 2)::uuid end;
$$;
revoke all on function private.channel_workspace from public;
grant execute on function private.channel_workspace to authenticated;

-- Members may listen on (select) and send to (insert) their workspace's presence and typing
-- channels, and nothing else.
create policy luna_members_receive on realtime.messages for select to authenticated
  using (private.is_member(private.channel_workspace(realtime.topic())));
create policy luna_members_send on realtime.messages for insert to authenticated
  with check (private.is_member(private.channel_workspace(realtime.topic())));
