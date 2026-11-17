-- Migration 0001 — extensions and the private schema (Backend Schema §30, row 0001).
-- Migrations are append-only: never edit this file after it is merged; add a new migration instead.

-- Text search helpers (fuzzy titles for the command palette, accent-insensitive search).
create extension if not exists pg_trgm with schema extensions;
create extension if not exists unaccent with schema extensions;

-- gen_random_uuid() is built in; pgcrypto supplies digest() for SHA-256 token hashes.
create extension if not exists pgcrypto with schema extensions;

-- Scheduling (reminders, nightly maintenance) and outbound HTTP to Edge Functions.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

-- Unexposed schema for security-definer helpers used by RLS policies
-- (e.g. private.current_workspace_id() in Phase 1). PostgREST does not expose it.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;
