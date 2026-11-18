# ADR 0004 — Edge Function logic is runtime-agnostic and tested with Vitest

- **Status:** Accepted
- **Date:** 2026-11-18
- **Context:** Implementation Plan §11 proposed Deno tests for Edge Functions. Deno is not part of
  the developer toolchain (Supabase runs it inside Docker), and CI would need a second test runner.

## Decision

- Everything with logic lives in `supabase/functions/_shared/` and uses only web-standard APIs
  (`fetch`, `URL`, `TextDecoder`, `crypto.subtle`) plus `node-html-parser`, which works in Node and,
  through the function's `deno.json` import map (`npm:node-html-parser@9.0.7`), in Deno.
- That code is type-checked by `tsconfig.functions.json` and unit-tested with **Vitest** on saved
  HTML fixtures and mocked `fetch`/DNS; CI never contacts live sites (TRD TR-EXT-04).
- The Deno entry point (`extract-opportunity/index.ts`) stays thin: HTTP, auth, DNS resolution,
  and database calls. It is exercised end to end by Playwright against the local Supabase stack
  (blocked-address fallback) and covered at the SQL level by pgTAP (`0007_extraction.test.sql`).

## Consequences

Shared modules must not use `Deno.*` or Node-only APIs. Relative imports keep explicit `.ts`
extensions (required by Deno, allowed by TypeScript's `allowImportingTsExtensions`).
