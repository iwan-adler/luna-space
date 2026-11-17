-- Migration 0003 — shared trigger functions (Backend Schema §30, row 0003).

-- Keeps updated_at current on every UPDATE.
create or replace function private.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Rejects changes to ownership and workspace columns after insert (Schema §28.2).
-- Works for any table that has workspace_id and/or owner_id columns.
create or replace function private.protect_owner()
returns trigger language plpgsql set search_path = '' as $$
declare
  old_j jsonb := to_jsonb(old);
  new_j jsonb := to_jsonb(new);
begin
  if old_j ? 'workspace_id' and old_j -> 'workspace_id' is distinct from new_j -> 'workspace_id' then
    raise exception 'workspace_id cannot be changed' using errcode = 'P0001';
  end if;
  if old_j ? 'owner_id' and old_j -> 'owner_id' is distinct from new_j -> 'owner_id'
     and current_user in ('authenticated', 'anon') then
    raise exception 'owner_id cannot be changed' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

-- Validates an IANA time-zone name in a column called "timezone".
create or replace function private.validate_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.timezone is not null
     and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown time zone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;
