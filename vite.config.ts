/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

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

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  preview: {
    headers: pagesRootHeaders(),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
