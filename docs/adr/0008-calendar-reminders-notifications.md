# ADR 0008 — Calendar, reminders and notifications (Phase 5a)

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** Implementation Plan Phase 5 lists FullCalendar, a `dispatch-notifications` Edge
  Function on pg_cron, and Web Push. Phase 5 is delivered in two parts so the owner can use the
  calendar and in-app reminders now.

## Decisions

1. **Phase 5a (this change):** `calendar_events`, the `calendar_feed` view, `reminders`,
   `notifications`, `notification_preferences`, reminder generation and in-app delivery, a
   notification bell and centre, and reminder settings. **Phase 5b:** `push_subscriptions`, VAPID
   keys, the service worker and Web Push delivery (FR-PLAT-08), quiet hours.
2. **In-app delivery runs in SQL.** `private.dispatch_reminders()` claims due reminders with
   `for update skip locked`, inserts one notification per reminder (`on conflict … do nothing`)
   and marks them sent. pg_cron runs it every minute. An Edge Function is only needed for push,
   which arrives in 5b and will call the same claim logic.
3. **Own calendar views instead of FullCalendar.** Month, week and agenda views are about
   400 lines of code on top of the date-only helpers (ADR 0003), keep the bundle small, and
   follow the design tokens. The day view is covered by the agenda starting on that day.
   Recurrence (FR-CAL-06) stays R2.
4. **Feed columns.** `calendar_feed` adds `parent_id` (opportunity or project of a derived item)
   and `timezone` to Schema §19, so the client can link each item to its source without extra
   queries (FR-CAL-03).
5. **Reminder rules.**
   - Opportunity deadlines: registration and submission deadlines of opportunities that are
     interested or later and not closed, reminding the owner (private) or both members (shared).
     Date-only deadlines at 09:00 in each person's zone, N days before (default 7, 1, 0).
     Timed deadlines N minutes before (default 1 day and 1 hour).
   - Tasks: remind the assignee only, the day before and on the day (date-only) or by the timed
     offsets.
   - Events: remind at the offset chosen on the event.
   - Re-planning: plans are rebuilt when the source changes, a partner joins, or someone's time
     zone or reminder preferences change.
6. **Event notifications.** Assigning a task, commenting on a task, and changing or removing a
   guest notify the people concerned (never the person who acted). This covers FR-GUEST-12 for
   assignments and the guest events deferred in ADR 0006.

## Consequences

- AC-18 and AC-19 are covered by pgTAP (`0013_calendar_reminders.test.sql`) and by unit and
  end-to-end tests.
- Reminders arrive in-app within a minute. Phones and desktops get them as system
  notifications once Phase 5b ships.
