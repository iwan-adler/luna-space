# ADR 0009 — Web Push delivery (Phase 5b)

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** FR-PLAT-08 asks for notifications on Windows and Android after a per-device opt-in.
  Phase 5a (ADR 0008) already turns reminders and events into rows in `notifications`.

## Decisions

1. **Pipeline:** pg_cron runs `private.trigger_push_dispatch()` every minute. If anything is
   waiting, it calls the `dispatch-push` Edge Function over HTTP (pg_net). The function claims a
   batch with `public.claim_push_batch()`, sends each notification to every device of its
   recipient with the `web-push` library, and cleans up devices the push service reports gone
   (404/410), or that fail 50 times in a row.
2. **Exactly once:** claiming marks `pushed_at` in the same statement that selects the rows
   (`for update skip locked`), so overlapping runs never send twice.
3. **Quiet hours** are evaluated in SQL, in the person's own time zone, including windows that
   wrap past midnight. Notifications created during quiet hours wait, and are sent when the
   window ends if they're less than 12 hours old.
4. **Privacy:** with "Show details on the lock screen" off, devices get only "Luna Space: You
   have a new notification." Payloads only carry in-app paths; the service worker refuses any
   other link.
5. **Secrets:**
   - The VAPID public key is in the client code; it's public by design.
   - The VAPID private key, the subject and the dispatch token are Edge Function secrets.
   - The function URL and the same token are stored in Supabase Vault (`push_dispatch_url`,
     `push_dispatch_token`), per environment. Without them the cron job does nothing, so CI and
     fresh local stacks are unaffected.
   - The function is deployed with JWT verification off and checks the token itself, in
     constant time.
6. **Devices:** `save_push_subscription` registers a browser for the signed-in person and turns
   push on. An endpoint belongs to one browser profile, so if a device signs in with another
   account the subscription moves to that account. Users can only read or delete their own
   devices.
7. **Installable app:** a web manifest with aurora icons lets Luna Space be added to the home
   screen. That is required for push on iPhone, and nicer on Android.

## Consequences

- Production needs a one-time setup: Edge Function secrets, two Vault secrets, and deploying
  `dispatch-push` with `--no-verify-jwt`.
- Delivery depends on browser push services (FCM for Chrome and Edge); the database never talks
  to them directly.
