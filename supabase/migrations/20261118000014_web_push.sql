-- Migration 0014 — Web Push (Schema §26; FR-PLAT-08; ADR 0009).
-- Notifications created by Phase 5a are pushed to every device a person opted in on, outside
-- their quiet hours. pg_cron calls the dispatch-push Edge Function every minute; the function
-- claims a batch through public.claim_push_batch() and sends it.

create table public.push_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  endpoint        text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh          text not null check (char_length(p256dh) between 20 and 200),
  auth            text not null check (char_length(auth) between 10 and 100),
  user_agent      text check (char_length(user_agent) <= 300),
  created_at      timestamptz not null default now(),
  last_success_at timestamptz,
  failure_count   smallint not null default 0
);
create index on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_subscriptions_own_select on public.push_subscriptions for select to authenticated
  using (user_id = (select auth.uid()));
create policy push_subscriptions_own_delete on public.push_subscriptions for delete to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon, authenticated;
grant select, delete on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- Registers this device for the caller. An endpoint belongs to one browser profile, so a device
-- that signs in with another account moves to that account.
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text,
                                                         p_user_agent text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300));
  insert into public.notification_preferences (user_id, push_enabled) values (uid, true)
  on conflict (user_id) do update set push_enabled = true;
end;
$$;

-- A notification to oneself, to check that pushes arrive on this device (5 per hour).
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
  select workspace_id into ws from public.workspace_members where user_id = uid;
  if ws is null then
    select workspace_id into ws from public.project_guest_memberships
     where user_id = uid and removed_at is null limit 1;
  end if;
  if ws is null then
    return jsonb_build_object('ok', false, 'code', 'NOT_MEMBER');
  end if;
  insert into public.notifications (workspace_id, recipient_id, type, title, body, link_path, dedupe_key)
  values (ws, uid, 'push.test', 'Test notification', 'Notifications are working on this device.',
          '/notifications', 'test:' || gen_random_uuid());
  return jsonb_build_object('ok', true);
end;
$$;

-- Quiet hours in the person's own zone; a window may wrap past midnight (23:00–07:00).
create or replace function private.in_quiet_hours(p_start time, p_end time, p_tz text, p_at timestamptz)
returns boolean language sql stable set search_path = '' as $$
  select case
    when p_start = p_end then false
    when p_start < p_end then (p_at at time zone p_tz)::time >= p_start and (p_at at time zone p_tz)::time < p_end
    else (p_at at time zone p_tz)::time >= p_start or (p_at at time zone p_tz)::time < p_end
  end;
$$;

-- Claims notifications that should be pushed now and marks them pushed, so two dispatchers never
-- send the same one. Notifications during quiet hours wait (up to 12 hours) for the window to end.
create or replace function public.claim_push_batch(p_limit integer default 200)
returns table (notification_id uuid, recipient_id uuid, title text, body text, link_path text,
               show_details boolean, subscriptions jsonb)
language plpgsql security definer set search_path = '' as $$
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
    returning n.id, n.recipient_id, n.title, n.body, n.link_path)
  select c.id, c.recipient_id, c.title, c.body, c.link_path,
         coalesce((select p.lockscreen_details from public.notification_preferences p
                    where p.user_id = c.recipient_id), true),
         coalesce((select jsonb_agg(jsonb_build_object('id', s.id, 'endpoint', s.endpoint,
                                                       'p256dh', s.p256dh, 'auth', s.auth))
                     from public.push_subscriptions s where s.user_id = c.recipient_id), '[]'::jsonb)
    from claimed c;
end;
$$;

-- Called every minute. The function URL and its token live in Vault, per environment; without
-- them (CI, a fresh local stack) this does nothing.
create or replace function private.trigger_push_dispatch()
returns void language plpgsql security definer set search_path = '' as $$
declare
  url   text;
  token text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'push_dispatch_url';
  select decrypted_secret into token from vault.decrypted_secrets where name = 'push_dispatch_token';
  if url is null or token is null then
    return;
  end if;
  if not exists (select 1 from public.notifications n
                  join public.notification_preferences p on p.user_id = n.recipient_id and p.push_enabled
                 where n.pushed_at is null and n.created_at > now() - interval '12 hours') then
    return;                                       -- nothing to send: no HTTP call
  end if;
  perform net.http_post(url := url,
                        headers := jsonb_build_object('Content-Type', 'application/json',
                                                      'Authorization', 'Bearer ' || token),
                        body := '{}'::jsonb,
                        timeout_milliseconds := 20000);
end;
$$;

select cron.schedule('dispatch-push', '* * * * *', 'select private.trigger_push_dispatch()');

revoke all on function public.save_push_subscription, public.send_test_notification from public, anon;
grant execute on function public.save_push_subscription, public.send_test_notification to authenticated;
revoke all on function public.claim_push_batch, private.trigger_push_dispatch, private.in_quiet_hours
  from public, anon, authenticated;
grant execute on function public.claim_push_batch to service_role;
grant update (push_enabled, quiet_start, quiet_end, lockscreen_details) on public.notification_preferences
  to authenticated;
