# ADR 0023 — Luna Iron redesign merged into the real app

- **Status:** Accepted
- **Date:** 2026-11-25

## Context

A collaborator built "Luna Iron", a redesign of Luna Space: a new look (Bricolage Grotesque and
Public Sans type, cloud shader covers, staggered menus, custom select, checkbox and switch
controls), Studio Meet (a Google Meet room for the workspace and each project), Hackathon Radar,
profile pictures with a crop tool, member presence and a notification settings page. It ran as a
browser-only demo: a fake signed-in user, a local data store instead of Supabase, meeting state in
`localStorage` and fonts from Google Fonts.

## Decisions

- **Keep the real backend.** The demo store (`src/lib/local-backend.ts`) and its hooks into auth,
  env, push, the Supabase client, calendar sync and the usage card were removed; those files are
  the ones from `main`. Sign-in, sign-up, password reset and the config-missing page are back.
- **Studio Meet is shared.** Migration 0026 adds `public.live_rooms`: one row for the workspace
  Studio (`project_id` null) and one per project, holding the Meet address and whether a meeting
  is live. A trigger stamps who started it and when; teammates see it live through Realtime. Only
  Google Meet addresses are accepted (no query strings). Members of the workspace (and, for a
  project room, people who can see that project) may read, start and end a room; nobody deletes
  rows.
- **Avatars are inline images.** The crop tool makes a 512 px WebP; it is stored in
  `profiles.avatar_path` as a data URL. A constraint allows only PNG, JPEG, WebP or GIF image data
  up to 300 000 characters; the page limits animated GIFs to 200 KB.
- **No third-party fonts.** Fonts are self-hosted (`public/fonts`, `@fontsource-variable`), as the
  CSP requires (`font-src 'self'`).
- **New libraries:** `motion` (menu and page animation) and
  `@fontsource-variable/bricolage-grotesque`. The initial download stays under the 300 kB budget.
- Notification settings are lazy-loaded from their own module, like other pages (ADR 0022).
- **Features the redesign had dropped are back:** the Ctrl K search palette, the workspace emoji
  (new workspace and settings), the chat sticker button, and the dashboard's deadlines, pipeline,
  weekly recap, notifications and shared activity widgets (FR-DASH-01–06).
- **Accessibility kept at the v1.0 bar (NFR-A11Y):**
  - The custom dropdown is a select-only combobox: arrow keys, Home/End, Enter, Escape; the
    closed list is `inert`. Menus (workspace switcher, staggered dropdown) use real buttons with
    `role="menuitem"`.
  - Checkboxes, switches and the review page's radios keep a real, focusable input on top of the
    drawn control, with a visible focus ring.
  - `--color-primary-ink` is the primary colour mixed toward white (dark) or black (light) and is
    used for all primary-coloured text, so it reaches 4.5:1 on tinted surfaces. Dark-mode muted
    text is `#9a9aa0`. Hard-coded dark backgrounds in chat and popovers became theme tokens, so
    light mode works there.
- **Chat stays honest about what is private:** there are no private direct messages yet, so
  choosing a person shows a notice that messages go to the whole team chat. Saved Messages and
  a renamed chat title are kept in this browser only, and say so.
- One presence channel per workspace is shared by every component that shows who is online
  (supabase-js returns one channel per topic, which can be subscribed only once).
- **Hackathon Radar shows the team's own hackathons** (amended 2026-11-27). It first shipped as
  a fixed list of mid-2026 events, which had all ended. It now lists the workspace's open
  hackathons, coding competitions and innovation challenges (not closed, not past their last
  deadline), soonest deadline first, up to four, with a link to add one and to Devpost.
