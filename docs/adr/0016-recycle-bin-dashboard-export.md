# ADR 0016 — Recycle bin, purge, dashboard and export (Phase 8a)

- **Status:** Accepted
- **Date:** 2026-11-19

## Decisions

- **Recycle bin (FR-PLAT-10, AC-07):** `recycle_bin()` lists deleted opportunities, projects,
  tasks, notes, links, folders, files and events from the last 30 days, and
  `restore_item(kind, id)` brings one back. Both are `security invoker`: each table's own select and update policies
  decide who sees and restores what. So either member can restore shared items, only the owner
  can restore private ones, and guests see nothing. A task comes back with its comments and
  attachments, which were never deleted with it.
  - A folder comes back together with the sub-folders that were deleted with it. A sub-folder
    can't be restored while its parent is still deleted.
  - A note, file or link whose folder is gone comes back at the top of the Vault.
  - Chat messages and their attachments are not restorable.
- **Purge:** a nightly pg_cron job calls the `maintenance` Edge Function (bearer token in Vault
  secrets, like push dispatch), and only when something has expired.
  - The function asks `purge_prepare` for expired files. Files of expired tasks and projects
    expire with them.
  - It removes those objects through the Storage API, then calls `purge_finish` to delete the
    rows of the removed files and of every other expired item.
  - A task or project that still has files waits for the next run, so a failed removal never
    leaves an object nobody can find. Both functions are `service_role` only.
- **Export (FR-PLAT-13): in the browser, not an `export-data` Edge Function** (this differs
  from TRD §7). The app reads every table with the member's own session and builds one JSON
  file. Row Level Security already gives exactly "everything I own plus everything shared", so
  a server function with the service role would add risk for no gain. The file lists uploads
  (name, type, size) but not their contents; a ZIP with file contents remains R3 (FR-PLAT-17).
- **Dashboard (FR-DASH-01–06):**
  - A **Shared / Me** switch, remembered per device in `localStorage`.
  - Quick actions: add opportunity, new task, new event (`/calendar?new=event`), new note,
    open chat.
  - Widgets: upcoming deadlines for the next 14 days with days remaining, active projects
    with stage, open tasks and end date, the last 20 activity entries, and notifications
    (unread count and the latest three).
  - **Me** keeps only items the viewer owns, and only the viewer's own activity.
- **Not in this change (Phase 8b):** PWA update prompt and share target, the accessibility audit,
  the performance budget, the security review, backups, the usage panel and the `v1.0.0` tag.
