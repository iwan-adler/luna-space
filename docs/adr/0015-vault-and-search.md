# ADR 0015 — Vault and global search (Phase 7)

- **Status:** Accepted
- **Date:** 2026-11-19

## Decisions

- **Folders:** `vault_folders` as in Schema §20, nested up to 4 levels. A trigger sets the
  depth from the parent, checks that the creator can see the parent, and makes a folder inside
  a private folder private too. (A policy that read the same table would recurse.) Folders can
  be renamed or deleted but not moved; the column grants allow only `name` and `deleted_at`.
  Sibling names are unique among live folders only (a partial unique index instead of the
  spec's table constraint), so a deleted folder frees its name.
- **Deleting a folder** deletes its sub-folders and moves every note, file and link inside up
  to its parent, so nothing is lost with it.
- **Filing items:** notes, files and bookmarks have a `folder_id`. One trigger checks that the
  folder is live, in the same workspace and visible to the person filing (guests never are).
- **Bookmarks:** `bookmarks` as in Schema §20 without `subject_id` (R2). Only `http(s)` links
  are accepted. The title fetch through the safe fetcher is not part of this change: the title
  defaults to the site name.
- **Tags:** `tags text[]` on notes, files and bookmarks (GIN indexed), lower case, at most 20.
  Picking a tag shows everything with that tag across all folders.
- **File library:** files at the Vault's top level are those uploaded in the Vault; project
  and chat attachments stay in their rooms and are found through search. Images and PDFs
  preview inline through a 60-second signed link.
- **Search:** `search_workspace(q, kinds, limit)` is `security invoker`, so RLS decides what each
  person can find. Every typed word becomes a prefix match (`hack` finds "hackathon"). It
  covers notes, bookmarks, file names, messages, opportunities, tasks and projects. Matches
  come back marked with `⟦ ⟧`; the app turns them into `<mark>` elements and never renders
  HTML from the database.
- **Command palette (FR-PLAT-12):** Ctrl K / ⌘ K opens navigation, quick creation (note,
  opportunity) and the top search results; `/search?q=` shows all results with kind filters.
