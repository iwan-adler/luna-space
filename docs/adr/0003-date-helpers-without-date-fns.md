# ADR 0003 — Small in-house date helpers instead of date-fns / date-fns-tz

- **Status:** Accepted
- **Date:** 2026-11-17
- **Context:** TRD §3 lists date-fns + date-fns-tz for dates. Phase 2 needs only: formatting
  date-only values, "today" in a zone, whole-day differences, and wall-clock ↔ instant conversion
  for a chosen IANA zone.

## Decision

Use `src/lib/dates.ts`, built on the platform `Intl` API (about 150 lines, fully unit-tested),
instead of adding date-fns and date-fns-tz.

- Date-only values stay `YYYY-MM-DD` strings and are formatted with `timeZone: 'UTC'` from
  `Date.UTC(...)`, so they cannot shift a day in any viewer zone.
- Wall-clock → instant conversion computes the zone offset with `Intl.DateTimeFormat` and
  re-checks it at the candidate instant, which handles daylight-saving transitions.
- CI runs the unit tests under `TZ=Pacific/Kiritimati` and `TZ=America/Los_Angeles` to catch
  any accidental dependence on the runner's zone.

Browsers report some legacy zone names (Chrome returns `Asia/Calcutta`); `src/lib/timezones.ts`
normalises them so selects always contain the stored value.

## Consequences

If later phases need recurrence or calendar arithmetic (Phase 5 FullCalendar, R2 recurrence),
revisit this decision; adding date-fns then is cheap.
