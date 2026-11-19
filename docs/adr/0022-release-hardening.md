# ADR 0022 — Release hardening (Phase 8b)

- **Status:** Accepted
- **Date:** 2026-11-19

## Decisions

- **Route splitting that works:**
  - Pages are lazy-loaded from their own modules (`src/app/App.tsx`), and feature `index.ts`
    files no longer re-export pages. Before this, every page was statically reachable through the
    indexes, so "lazy" routes still shipped in the first download.
  - The initial JavaScript fell from ~350 kB to 249 kB gzipped.
  - `npm run check:bundle-size` enforces NFR-PERF-05 and TR-FE-01 in CI: ≤ 300 kB initial and
    ≤ 150 kB per chunk.
- **Service worker:**
  - It caches the app shell and hashed assets. Pages are network-first with the cached shell or
    an offline page as fallback; assets are cache-first; Supabase API calls are never cached.
  - Each build stamps a new `BUILD_ID`. The new worker waits, and the app shows "A new version is
    ready → Reload" (no surprise reloads).
  - The manifest's `share_target` sends links shared from the phone to `/share`, which opens Add
    opportunity with the link filled in.
- **Accessibility:** `tests/e2e/a11y.spec.ts` runs axe (WCAG 2.1 A/AA) on 18 pages in the dark
  and light themes, plus sign-in. Serious or critical findings fail CI.
- **Private Realtime channels:** presence and typing join private channels; policies on
  `realtime.messages` admit only that workspace's members (migration 0025).
- **Usage panel:** `workspace_usage()` (members only, numbers only) shows counts, file storage and
  the whole database's size against the free plan's limits.
- **Backups:**
  - A nightly GitHub workflow dumps the database and encrypts it with AES-256 under a passphrase
    held in repository secrets. Copies are kept for 30 days.
  - `docs/runbooks/backup-and-restore.md` describes setup, the restore drill and a production
    restore.
- **Release record:** `docs/release/v1.0.0.md` holds the security review and the §15 checklist.
