# Luna Space

A private, installable web workspace for two collaborators: hackathon and opportunity tracking
(with URL extraction), project rooms, shared calendar, chat, knowledge vault, productivity and
portfolio. Target running cost: ₹0 on free tiers.

**Status:** Phase 0 — walking skeleton (Implementation Plan §7.1). No product features yet.

## Specifications

| #   | Document                      | Source                                             |
| --- | ----------------------------- | -------------------------------------------------- |
| 01  | Product Requirements          | [docs/specs/01_prd.md](docs/specs/01_prd.md)       |
| 02  | Application Flow & Navigation | [docs/specs/02_flow.md](docs/specs/02_flow.md)     |
| 03  | Implementation Plan           | [docs/specs/03_impl.md](docs/specs/03_impl.md)     |
| 04  | Technical Requirements        | [docs/specs/04_trd.md](docs/specs/04_trd.md)       |
| 05  | UI/UX Specification           | [docs/specs/05_uiux.md](docs/specs/05_uiux.md)     |
| 06  | Backend Schema                | [docs/specs/06_schema.md](docs/specs/06_schema.md) |

PDF versions: `cd tools/docs-pdf && npm install && npm run build` (output in `planning/`).
Decisions that change the specs are recorded in [docs/adr](docs/adr).

## Getting started (Windows)

Prerequisites: Node.js ≥ 22, Git, Google Chrome. For the local database: Docker Desktop.

```bash
npm install
cp .env.example .env.local    # then fill in the Supabase URL and anon/publishable key
npm run dev                   # http://localhost:5173
```

Local Supabase (optional until Phase 1):

```bash
npm run db:start              # starts Postgres, Auth, Studio; prints the local URL and anon key
npm run db:test               # pgTAP tests
```

## Scripts

| Script                                      | What it does                                        |
| ------------------------------------------- | --------------------------------------------------- |
| `npm run dev`                               | Vite dev server                                     |
| `npm run build`                             | Type-check and production build to `dist/`          |
| `npm run lint` / `npm run format`           | ESLint / Prettier                                   |
| `npm run typecheck`                         | TypeScript project build (no emit)                  |
| `npm test`                                  | Vitest unit and component tests                     |
| `npm run e2e`                               | Playwright smoke tests (desktop + Android profiles) |
| `npm run check:bundle-secrets`              | Fails if `dist/` contains server secrets            |
| `npm run db:start` / `db:test` / `db:types` | Local Supabase, pgTAP tests, generated types        |

## Project structure

```text
src/app/            router, app shell
src/features/       one folder per module (auth, dashboard, opportunities, …)
src/components/     ui/ primitives and patterns/ shared across features
src/lib/            env, Supabase client, utilities
src/styles/         Tailwind entry and design tokens
supabase/           config, migrations, pgTAP tests, seed (local only)
tests/e2e/          Playwright specs
docs/specs/         the six specifications (Markdown)
tools/docs-pdf/     PDF builder for the specifications
```

## Contributing

One issue → one branch (`feat/<issue>-<slug>`) → one small pull request, squash-merged after CI
passes. See the PR checklist in `.github/pull_request_template.md` and `CLAUDE.md` for coding
rules.

## Phase 0 checklist

- [x] Vite + React + TypeScript (strict) scaffold, path alias `@/`
- [x] Tailwind CSS with Luna design tokens, self-hosted Inter / JetBrains Mono
- [x] ESLint, Prettier, Vitest, Testing Library, Playwright smoke tests
- [x] Supabase CLI config, migration 0001 (extensions, `private` schema), pgTAP tests incl. RLS guard
- [x] Supabase client with safe env handling
- [x] CI: lint, types, tests, build, bundle secret scan, e2e, database tests, gitleaks
- [x] CLAUDE.md, PR template, issue templates, Dependabot
- [ ] GitHub remote, branch protection, labels and milestones
- [ ] Supabase production project linked; migrations pushed
- [ ] Static host (Cloudflare Pages) connected with preview deployments
