# ADR 0012 — Repeating events, hour grid, clash warnings

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** The owner asked for repeating events, an hour-by-hour week and day view,
  calendar sync, clash warnings and a "today" panel. Repeats and clash warnings (FR-CAL-06/07)
  were planned for R2; this brings them forward. Sync follows in a separate change.

## Decisions

1. **Repeat rules:**
   - A fixed-order RFC 5545 subset: `FREQ=DAILY|WEEKLY|MONTHLY`, optional `INTERVAL` (1–30),
     `BYDAY` (weekly) and `UNTIL` or `COUNT` (up to 366), plus `exdates` for skipped dates. A
     check constraint rejects anything else.
   - Monthly rules on the 29th–31st skip months without that day, as RFC 5545 does.
2. **Expanding repeats:**
   - The app expands a series on read (`expandRecurring`). Timed occurrences keep their
     wall-clock time in the event's own zone across daylight-saving changes.
   - The database has the same expansion (`private.occurrence_dates`), so reminders cover each
     occurrence in the next 60 days; a daily pg_cron job tops them up.
   - The same cases are tested on both sides.
3. **Editing:** opening an occurrence edits the whole series. "Skip this date" adds an exdate,
   and "Delete series" removes all of it. Editing a single occurrence on its own is out of scope.
4. **Hour grid:**
   - Week and day views show time slots (48 px per hour) with an all-day strip and a "now"
     line; overlapping items share the width.
   - Clicking an empty slot creates an event at that time.
   - Single events can be dragged in 15-minute steps and across days, keeping their duration.
     Repeating events and derived items aren't draggable; they open their dialog or their source.
   - Keyboard users edit times in the dialog.
5. **Clashes (FR-CAL-07):**
   - Detected in the app: timed events that overlap, deadlines within 24 hours of each other,
     and deadlines on the day of an exam.
   - Shown as a banner with the list, warning icons on items, a warning in the event dialog
     while choosing an overlapping time, and on the Home agenda.
6. **Home:** "Today and the next 7 days" replaces the deadline-only list. It's built from the
   same calendar feed, so events, repeats, deadlines and tasks appear together.

## Consequences

- The feed view gains `rrule` and `exdates` columns. Repeating events are always fetched,
  regardless of the date range, and expanded in the browser.
