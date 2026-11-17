# ADR 0002 — Workspace invitations as database RPCs, not Edge Functions

- **Status:** Accepted
- **Date:** 2026-11-17
- **Context:** TRD §7.1 and Implementation Plan Phase 1 proposed the Edge Functions
  `invite-create` and `invite-accept` for partner invitations.

## Decision

Partner invitations are implemented as `security definer` SQL functions called through PostgREST:

| Function                                      | Replaces        | Notes                                                                                                                                             |
| --------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public.create_workspace_invitation()`        | `invite-create` | 32 random bytes from `extensions.gen_random_bytes`, SHA-256 stored, previous open link revoked, 5/h rate limit, refuses when both seats are taken |
| `public.revoke_workspace_invitation()`        | —               | Revokes the open link                                                                                                                             |
| `public.accept_workspace_invitation(p_token)` | `invite-accept` | Locks the invitation row, takes the free seat, 10/h rate limit, one-workspace-per-user and two-seat constraints as the final guard                |

Expected failures return `{ ok: false, code }` instead of raising, so the rate-limit record written
at the start of the call is committed (a raised exception would roll it back and make
brute-forcing free).

## Reasons

- The whole operation runs in **one transaction** with row locks; an Edge Function would need
  several PostgREST calls or its own database connection to get the same guarantee.
- No service-role key is involved, and there is nothing to deploy besides migrations.
- The logic is covered directly by pgTAP (`supabase/tests/database/0004_identity.test.sql`).
- Token randomness comes from pgcrypto's cryptographically secure generator.

## Consequences

- TRD §7.1 lists these RPCs instead of the two Edge Functions.
- Column privileges on `workspace_invitations` are granted per column (a column-level `REVOKE`
  cannot override a table-level `GRANT` in PostgreSQL); Backend Schema §14 is updated accordingly.
- Room guest invitations (Phase 4b) may follow the same pattern; that is decided in that phase.
