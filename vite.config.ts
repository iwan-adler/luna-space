/// <reference types="vitest/config" />
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

/**
 * Reads the `/*` block of public/_headers (Cloudflare Pages format) so `vite preview`
 * — and therefore the Playwright tests — run under the same CSP as production.
 */
function pagesRootHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}
  let inRoot = false
  for (const line of readFileSync('public/_headers', 'utf8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (!/^\s/.test(line)) {
      inRoot = line.trim() === '/*'
      continue
    }
    const colon = line.indexOf(':')
    if (inRoot && colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim()
  }
  return headers
}

/**
 * Production CSP only allows the production Supabase project. When the build points at the local stack
 * (development, CI end-to-end tests), the preview server additionally allows that loopback origin.
 */
function previewHeaders(mode: string): Record<string, string> {
  const headers = pagesRootHeaders()
  const apiUrl = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL ?? ''
  const csp = headers['Content-Security-Policy']
  if (csp && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(apiUrl)) {
    const ws = apiUrl.replace(/^http/, 'ws')
    headers['Content-Security-Policy'] = csp
      .replace("connect-src 'self'", `connect-src 'self' ${apiUrl} ${ws}`)
      .replace("img-src 'self'", `img-src 'self' ${apiUrl}`)
      .replace("frame-src 'self'", `frame-src 'self' ${apiUrl}`)
  }
  return headers
}

/**
 * Stamps dist/sw.js with a build id, so every deployment ships a changed service worker and the
 * app can offer "Update available" (ADR 0022).
 */
function stampServiceWorker() {
  return {
    name: 'luna-stamp-sw',
    apply: 'build' as const,
    closeBundle() {
      const file = 'dist/sw.js'
      const id = `${Date.now().toString(36)}`
      writeFileSync(file, readFileSync(file, 'utf8').replace('__BUILD_ID__', id))
    },
  }
}

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss(), stampServiceWorker()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  preview: {
    headers: previewHeaders(mode),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts'],
    css: false,
  },
}))
