# ADR 0018 — Several workspaces per person, more people per workspace

- **Status:** Accepted
- **Date:** 2026-11-19
- **Supersedes:** the two-seat model (PRD "exactly two members", NFR-SEC-02 as written; Schema
  §14–15 `unique (user_id)` and `seat in (1, 2)`).

## Context

Luna Space started as a space for two. The owner now wants to work with other groups of friends
too: one person should be able to belong to several workspaces, and a workspace should hold more
than two people.

## Decision

- **Membership:** `workspace_members` drops `unique (user_id)` and the two-seat check, and adds
  `role` (`owner` or `member`). `workspaces` gets `max_members` (default 12, 2–50) and an
  optional `emoji`. A person can be in at most 20 workspaces.
- **The current workspace:** every browser tab sends `x-workspace-id` on database API calls.
  `private.current_workspace_id()` uses it when the caller is a member of that workspace,
  otherwise `profiles.active_workspace_id` (the workspace last opened), otherwise the oldest
  membership.
  - Every existing RLS policy keeps working unchanged.
  - A header naming someone else's workspace is ignored, so it grants nothing.
  - Realtime and background jobs carry no header and follow the last opened workspace. Each tab
    remembers its own choice in `sessionStorage`.
- **Switching** (`my_workspaces()`, `set_active_workspace()`): the app keeps the current workspace
  while the new one loads, then drops every cached query of the old one.
- **Invites:** one link per workspace, usable by several people until it expires (7 days) or the
  workspace is full. Joins lock the workspace row, so the cap holds under concurrency.
- **Roles:**
  - Any member can invite, rename the workspace and set its emoji.
  - The owner can change the member limit and remove members.
  - Anyone can leave (`leave_workspace`). Leaving clears that person's open task assignments.
  - An owner who leaves hands ownership to the longest-standing member.
  - The last member out deletes the workspace (soft delete).
- **Storage:** object access is checked by membership of the file's workspace
  (`private.can_read_object`), because Storage requests do not carry the workspace header.
- **Notifications:**
  - Chat notifies every other member.
  - The notification centre lists all workspaces. Opening an item from another workspace switches
    to it first.
  - Push links carry `?ws=` so a tapped notification opens the right workspace.
- **Calendar subscription link:** covers every workspace the person belongs to.
- **Interface:** a workspace switcher in the sidebar (and on the phone's More page), "New
  workspace" and "Join with an invite link" pages, a team card on Home, and settings with roles,
  limit, removal and leaving. In a group, chat shows the workspace name, avatars, sender names
  and "Seen by …". Wording no longer says "partner".

## Consequences

- Two tabs on different workspaces each read and write correctly. Live updates follow the
  workspace opened last, so the other tab refreshes when it is used.
- Guest access to project rooms is unchanged; a person can be a member of one workspace and a
  guest in another's room.
