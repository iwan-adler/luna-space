# ADR 0021 — Profiles, stickers, team finder and polls

- **Status:** Accepted
- **Date:** 2026-11-19
- **Migrations:** `20261119000022_profiles_stickers.sql`, `20261119000023_team_finder_polls.sql`

## Decisions

- **Profiles:**
  - `profiles` gains `bio` (≤ 280 characters), `skills` (≤ 12), `github_username`,
    `linkedin_url`, `website_url` and `devpost_username`.
  - The database is the final check. GitHub and Devpost usernames follow their sites' rules, a
    LinkedIn link must be `https://…linkedin.com/in/…`, and a website must be `https://`, so
    profiles can never carry `javascript:` or plain-http links.
  - The app accepts what people paste ("github.com/ana", "@ana", "ana.dev") and normalises it
    first.
  - The existing policies apply: people who share a workspace can read a profile, and only its
    owner can change it.
  - A profile card (bio, skills, links) opens from names in the team card, workspace settings,
    chat and the team finder.
- **Stickers:**
  - An original built-in pack of 18: a big emoji on a glowing die-cut badge with a caption,
    drawn by the app.
  - A message of kind `sticker` stores only `metadata.sticker` (a plain id, checked in SQL).
    Unknown ids show a placeholder, and no images are uploaded or fetched.
- **Polls:**
  - A message of kind `poll` carries `{question, options (2–8), multi}`, validated by
    `private.valid_poll`.
  - Votes live in `poll_votes`. A trigger checks the option exists and, for single-choice polls,
    moves your vote.
  - You vote only as yourself; votes are visible to anyone who can see the message.
  - Votes update live.
- **Team finder:**
  - `team_posts` holds per-opportunity "I need a team" (free agent) or "we need N people"
    (recruiting) posts, with skills and a short note.
  - Members see posts for opportunities they can see. You post only as yourself, and only the
    author can edit or close a post. Closing is soft: there are no deletes.
  - Other members are notified of a new post.
  - It is shown on `/teams` and on hackathon-style opportunity pages.
- **Notifications** describe stickers ("sent a sticker") and polls ("started a poll: …").
