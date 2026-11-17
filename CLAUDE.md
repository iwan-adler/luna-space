# Luna Space — instructions for Claude

Luna Space is a private workspace for exactly two collaborators (hackathons, opportunities,
projects, calendar, chat, knowledge). The specifications are the source of truth:

| Spec                      | Use it for                                                          |
| ------------------------- | ------------------------------------------------------------------- |
| `docs/specs/01_prd.md`    | Scope, requirement IDs (FR-…, NFR-…, AC-…), release of each feature |
| `docs/specs/02_flow.md`   | Routes, journeys, cross-module data flow                            |
| `docs/specs/03_impl.md`   | Phase order, backlog (§18), PR checklist (§3.2), testing (§11–12)   |
| `docs/specs/04_trd.md`    | Architecture, Edge Functions, security controls (TR-…)              |
| `docs/specs/05_uiux.md`   | Tokens, components, wireframes, states, accessibility               |
| `docs/specs/06_schema.md` | Tables, constraints, RLS patterns, migration order (§30)            |

Read the relevant sections before coding and cite requirement IDs in commits/PRs. If the
implementation must differ from a spec, update the spec in the same PR (or record an ADR in
`docs/adr/`).

## Stack (versions as installed)

React 19 · TypeScript 6 (strict, `noUncheckedIndexedAccess`) · Vite 8 · Tailwind CSS 4 (tokens in
`src/styles/tokens.css`, exposed via `@theme inline` in `src/styles/index.css`) · React Router 8 ·
supabase-js 2 · Vitest 5 + Testing Library · Playwright · Supabase CLI 3 (Postgres 17, pgTAP).
Add a library only in the phase that first needs it (ADR 0001).

## Rules

- Order of work: migration → RLS → pgTAP tests → `npm run db:types` → hooks → UI → e2e.
- Migrations live in `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`, follow the order in
  Schema §30, and are **never edited after merge** — add a new migration instead.
- Every new `public` table: `workspace_id`, RLS enabled, policies using
  `workspace_id = (select private.current_workspace_id())`; add owner/partner/outsider/anon tests.
  `supabase/tests/database/0000_rls_coverage.test.sql` fails CI if any table lacks RLS.
- No DELETE policies on content tables: soft delete via `deleted_at`.
- Never put the service-role key or any secret in frontend code. Only `VITE_*` variables reach the
  browser; `npm run check:bundle-secrets` enforces this on `dist/`.
- Dates: date-only values are SQL `date` and ISO `YYYY-MM-DD` strings in TS; never pass them
  through `new Date()`. Instants are `timestamptz` + IANA zone name.
- Validate on the client (Zod, once added) and in SQL constraints — SQL is the final authority.
- Feature code lives in `src/features/<feature>/`; import another feature only through its
  `index.ts` (ESLint enforces this). Shared UI goes in `src/components/{ui,patterns}`.
- Use design tokens (`bg-surface`, `text-muted`, `border-border`, `text-primary`…), not raw colours.
- Every data view needs loading, empty, error and offline states.
- Do not paste real secrets, tokens or personal data into prompts, code, tests or fixtures.

## Commands

```bash
npm run dev            # http://localhost:5173
npm run lint && npm run typecheck && npm test
npm run build && npm run check:bundle-secrets
npm run e2e            # Playwright: builds, serves on :4173, desktop + Android profiles
npm run db:start       # local Supabase (needs Docker Desktop running)
npm run db:test        # pgTAP tests in supabase/tests
npm run db:types       # regenerate src/types/database.ts from the local database
```

Run lint, typecheck, unit tests and (when SQL changed) `npm run db:test` before proposing a PR.

## Working style

One GitHub issue per session; propose a plan (files, migration name, tests) before coding;
keep PRs small (≈ < 400 changed lines excluding generated files); explain every RLS policy in
plain language in the PR description.
