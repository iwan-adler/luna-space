## What and why

Closes #

Requirements: <!-- e.g. FR-OPP-07, AC-10 (docs/specs/01_prd.md) -->

## Checklist (Implementation Plan §3.2)

- [ ] Linked issue and PRD requirement IDs
- [ ] Migration added (never edited after merge) and types regenerated (`npm run db:types`)
- [ ] RLS enabled and policies tested for owner, partner, outsider, anonymous
- [ ] Inputs validated on the client and by constraints on the server
- [ ] Loading, empty, error and offline states (UI spec §24)
- [ ] Unit/component tests; E2E updated if a journey changed
- [ ] No secrets; no service-role key in frontend; `.env.example` updated if a variable was added
- [ ] Accessibility: keyboard reachable, labelled, contrast OK
- [ ] Docs in `docs/specs` updated if behaviour differs from the specification

## How I tested it

<!-- Commands run, devices checked, screenshots for UI changes -->
