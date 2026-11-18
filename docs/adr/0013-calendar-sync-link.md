# ADR 0013 — Calendar sync through a private subscription link

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** The owner wants Luna Space dates in Google Calendar and on their phone. Two-way
  Google sync (Schema §32, R3) needs OAuth, Google app verification and token storage. A
  read-only iCalendar subscription works with Google Calendar, Apple Calendar and Android today,
  with no Google setup at all.

## Decision

- **The link:** each member can create one private link,
  `/functions/v1/calendar-ics?token=…`. Only its SHA-256 hash is stored
  (`calendar_feed_tokens`), and the link is shown once. "Create a new link" replaces it, and
  "Turn off sync" deletes it; either way the old link stops working at once. Creating a link is
  rate limited (10 an hour).
- **Contents:** `calendar_feed_for_token` (security definer, service role only) mirrors the
  table policies for the link's owner: the owner's workspace; shared items plus the owner's own
  private ones; events, opportunity deadlines, open tasks and project ends; from 60 days ago to
  two years ahead. An unknown link raises `P0002`, which the function answers with an empty 404.
- **Format:** `_shared/ics.ts` writes RFC 5545:
  - date-only items as `VALUE=DATE`;
  - one-off timed items in UTC;
  - repeating timed events with `TZID` and local time (so they survive daylight-saving
    changes), `UNTIL` in UTC, and skipped dates as `EXDATE`.
  - Every item links back to Luna Space.
- **Function:** `calendar-ics` is deployed without JWT verification; the token is the credential.
  Responses are `private, max-age=900` and `noindex`.

## Consequences

- One-way and read-only: edits are made in Luna Space. Calendar apps poll on their own schedule
  (Google can take up to a day).
- Two-way Google Calendar sync stays an R3 option (Schema §32).
