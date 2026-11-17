-- Migration 0004 — profiles, workspaces, two-seat membership, invitations (Schema §14–15).

------------------------------------------------------------------------------------------
-- Profiles
------------------------------------------------------------------------------------------
create table public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text not null check (char_length(display_name) between 1 and 60),
  avatar_path   text,
  timezone      text not null default 'Asia/Kolkata',
  availability  public.availability_status not null default 'available',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger profiles_timezone before insert or update of timezone on public.profiles
  for each row execute function private.validate_timezone();

-- Create a profile for every new auth user. The display name is a cosmetic default taken from
-- sign-up metadata or the email's local part; it is never used for authorization.
create or replace function private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
begin
  if name is null then
    name := split_part(coalesce(new.email, 'member'), '@', 1);
  end if;
  insert into public.profiles (id, display_name)
  values (new.id, left(name, 60));
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

------------------------------------------------------------------------------------------
-- Workspaces and membership
------------------------------------------------------------------------------------------
create table public.workspaces (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create trigger workspaces_updated_at before update on public.workspaces
  for each row execute function private.set_updated_at();

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  seat         smallint not null check (seat in (1, 2)),
  joined_at    timestamptz not null default now(),
  primary key (workspace_id, user_id),
  unique (workspace_id, seat),   -- at most two members per workspace (NFR-SEC-02)
  unique (user_id)               -- at most one workspace per user
);

create table public.workspace_invitations (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  token_hash   bytea not null unique check (octet_length(token_hash) = 32),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  accepted_by  uuid references public.profiles (id) on delete set null,
  accepted_at  timestamptz,
  revoked_at   timestamptz,
  check (expires_at > created_at and expires_at <= created_at + interval '7 days'),
  check (not (accepted_at is not null and revoked_at is not null))
);
create unique index workspace_invitations_one_open
  on public.workspace_invitations (workspace_id)
  where accepted_at is null and revoked_at is null;

create table public.workspace_member_history (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references public.workspaces (id) on delete cascade,
  user_id       uuid,
  seat          smallint not null,
  display_name  text not null,
  joined_at     timestamptz not null,
  left_at       timestamptz
);
create index on public.workspace_member_history (workspace_id);

------------------------------------------------------------------------------------------
-- Helper functions (unexposed schema)
------------------------------------------------------------------------------------------
create or replace function private.current_workspace_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select m.workspace_id from public.workspace_members m where m.user_id = (select auth.uid());
$$;

create or replace function private.is_member(ws uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.workspace_members m
                  where m.workspace_id = ws and m.user_id = (select auth.uid()));
$$;

revoke all on function private.current_workspace_id(), private.is_member(uuid) from public;
grant execute on function private.current_workspace_id(), private.is_member(uuid) to authenticated, service_role;

------------------------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;
alter table public.workspace_member_history enable row level security;

-- Profiles: yourself and your partner. Inserts happen only through the auth trigger.
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or exists (select 1 from public.workspace_members m
                where m.user_id = profiles.id
                  and m.workspace_id = (select private.current_workspace_id()))
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- Workspaces: members read and rename. Creation goes through create_workspace().
create policy workspaces_select on public.workspaces for select to authenticated
  using (id = (select private.current_workspace_id()));
create policy workspaces_update on public.workspaces for update to authenticated
  using (id = (select private.current_workspace_id()))
  with check (id = (select private.current_workspace_id()));

-- Membership: readable by members, never writable by clients (no insert/update/delete policies).
create policy members_select on public.workspace_members for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));

create policy invitations_select on public.workspace_invitations for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));

create policy member_history_select on public.workspace_member_history for select to authenticated
  using (workspace_id = (select private.current_workspace_id()));

-- Column privileges: clients may never read token hashes. A column-level REVOKE does not
-- override a table-level GRANT, so replace the table grant with an explicit column list.
revoke all on public.workspace_invitations from anon, authenticated;
grant select (id, workspace_id, created_by, created_at, expires_at, accepted_by, accepted_at, revoked_at)
  on public.workspace_invitations to authenticated;

-- Only `name` of a workspace is client-editable.
revoke update on public.workspaces from authenticated;
grant update (name) on public.workspaces to authenticated;

-- Profiles: id and timestamps are not client-editable.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_path, timezone, availability) on public.profiles to authenticated;

-- Nothing in these tables is writable anonymously.
revoke insert, update, delete on public.profiles, public.workspaces, public.workspace_members,
  public.workspace_member_history from anon;
