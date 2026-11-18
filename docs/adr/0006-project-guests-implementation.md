# ADR 0006 — Project guests: RPCs, shareable rooms only, notifications later

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** Schema §31, Flow §21–22 and TRD describe room guests with the Edge Functions
  `project-invite-create` and `project-invite-accept`, notifications for guest events, and
  `guest_visible` flags on tasks, checklists, notes, bookmarks, files and meetings. Phase 4b
  (migration `20261118000011_project_guests`) implements guest access.

## Decisions

1. **Invitations and guest management are `security definer` RPCs**, as for workspace invitations
   (ADR 0002): `create_project_invitation`, `revoke_project_invitation`,
   `accept_project_invitation`, `set_guest_role`, `remove_project_guest`, `leave_project`. Each
   runs in one transaction with row locks. Token handling is unchanged: 32 random bytes, only the
   SHA-256 hash stored, link shown once. Rate limits are 20 links an hour per project and 10
   acceptance attempts an hour per person. Expected failures return `{ ok: false, code }` so the
   rate-limit record survives.
2. **Only shared, non-archived projects can have guests.** A private project belongs to one member
   and is hidden from the partner; letting outsiders in would contradict that. Creating an
   invitation for a private or archived room returns `ROOM_NOT_SHAREABLE`, and acceptance treats
   such rooms as invalid.
3. **`guest_visible` exists on tasks, checklists and files** in this phase. Notes, bookmarks and
   meetings get it in the migrations that create those tables (Phases 7 and R2), as Schema §31.2
   already allows.
4. **Phase 4 policies were tightened.** `project_members`, `checklists` and `checklist_items` had
   policies that only required "the caller can see the project". Guests can now see rooms, so those
   member policies use `private.is_room_member()`, and guests get separate, narrower policies.
   The task comment insert policy now checks the guest role and the `viewers_can_comment` setting.
5. **Notifications for guest events are deferred to Phase 5**, when the notifications table and
   delivery arrive. Until then, the events are recorded in room activity: joined, role changed,
   removed, left, and invitation created or revoked.
6. **Guests use their own routes:** `/join#<token>`, `/guest` and `/guest/rooms/:id/:tab`, inside a
   minimal guest shell. Accounts with no workspace but with guest rooms are routed to `/guest`
   instead of onboarding. The room page is shared with members through a small room context:
   workspace, access level and base path.

## Consequences

- No Edge Function deployment is needed for guests. pgTAP covers the rules
  (`supabase/tests/database/0011_guests.test.sql`, 50 assertions: invitations, acceptance, the
  viewer/collaborator/admin matrix, AC-29 isolation, files, activity, removal, cap, revocation).
- When notifications land, the RPCs above gain `insert into notifications` calls. No client
  changes are required.
