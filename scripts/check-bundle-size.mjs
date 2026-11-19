// Performance budget (NFR-PERF-05, TR-FE-01, ADR 0022): the JavaScript a phone downloads before
// the first page can show — the entry script plus everything index.html preloads — must stay
// under 300 kB gzipped, and no single chunk may exceed 150 kB gzipped. Run after `npm run build`.
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gzipSync } from 'node:zlib'

const BUDGET_KB = 300
const CHUNK_KB = 150
const dist = 'dist'
const html = readFileSync(join(dist, 'index.html'), 'utf8')
const files = [
  ...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g),
  ...html.matchAll(/<link rel="modulepreload"[^>]+href="\/([^"]+\.js)"/g),
].map((m) => m[1])

let total = 0
const rows = []
for (const f of new Set(files)) {
  const kb = gzipSync(readFileSync(join(dist, f))).length / 1024
  total += kb
  rows.push([kb, f])
}
rows.sort((a, b) => b[0] - a[0])
for (const [kb, f] of rows.slice(0, 6)) console.log(`${kb.toFixed(1).padStart(7)} kB  ${f}`)
console.log(`Initial JavaScript: ${total.toFixed(1)} kB gzipped (budget ${BUDGET_KB} kB)`)
if (total > BUDGET_KB) {
  console.error('✗ Over the performance budget. Lazy-load the new code or trim it.')
  process.exit(1)
}
const big = readdirSync(join(dist, 'assets'))
  .filter((f) => f.endsWith('.js'))
  .map((f) => [gzipSync(readFileSync(join(dist, 'assets', f))).length / 1024, f])
  .filter(([kb]) => kb > CHUNK_KB)
if (big.length) {
  for (const [kb, f] of big)
    console.error(`✗ ${f} is ${kb.toFixed(1)} kB gzipped (limit ${CHUNK_KB} kB)`)
  process.exit(1)
}
console.log('✓ Within budget')
