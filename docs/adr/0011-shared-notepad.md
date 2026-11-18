# ADR 0011 — Shared notepad before the full Vault

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** The owner asked for a shared notepad now. In the plan, notes belong to the Vault
  (Phase 7), together with folders, bookmarks and the file library.

## Decision

- **Table:** ship the `notes` table from Schema §20 now (migration 0015), without the
  `vault_folders` foreign key. The Vault phase adds that, together with folders and bookmarks.
  Two columns are added beyond the spec: `pinned` (pinned notes stay on top) and `updated_by`
  (set by a trigger, to show who edited last).
- **Saving:** notes save through `save_note(id, title, body, version)`, which only writes when
  the note is still at the version the editor loaded. Otherwise it returns the current text, so
  the person chooses "Keep my version" or "Use their version" and nothing is silently
  overwritten. The editor autosaves about a second after typing stops.
- **Live updates:** notes are in the Realtime publication. An open note adopts a partner's newer
  version only while it has no unsaved local edits.
- **Rendering:** Markdown-lite (headings, emphasis, code, lists, quotes, links, task lists)
  rendered as React elements only, never raw HTML. Only http(s) and mailto links are clickable.
  Task boxes can be ticked in the preview.
- **Guests:** notes are not visible to project guests yet. `guest_visible` exists, default
  false, as in Schema §31.

## Consequences

- When the Vault phase lands, it adds folders and moves notes into them; the notepad page
  becomes the Vault's notes view.
