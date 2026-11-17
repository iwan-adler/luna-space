// Fails if the built frontend (dist/) contains anything that looks like a server secret.
// Enforces PRD NFR-SEC-04 / TRD TR-SEC-04: only the publishable/anon key may reach the browser.
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const DIST = 'dist'
const literalPatterns = [
  /sb_secret_[A-Za-z0-9_-]{8,}/, // Supabase secret API keys
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /SUPABASE_SERVICE_ROLE_KEY/,
  /VAPID_PRIVATE_KEY/,
  /GITHUB_CLIENT_SECRET/,
]
const jwtPattern = /eyJ[A-Za-z0-9_-]+\.(eyJ[A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(js|mjs|css|html|json|map|webmanifest|txt)$/.test(name)) yield path
  }
}

let problems = 0
try {
  statSync(DIST)
} catch {
  console.error('dist/ not found — run `npm run build` first.')
  process.exit(1)
}

for (const file of walk(DIST)) {
  const text = readFileSync(file, 'utf8')
  for (const pattern of literalPatterns) {
    if (pattern.test(text)) {
      console.error(`✗ ${file}: matches ${pattern}`)
      problems++
    }
  }
  for (const match of text.matchAll(jwtPattern)) {
    try {
      const payload = JSON.parse(Buffer.from(match[1], 'base64url').toString('utf8'))
      if (payload.role === 'service_role') {
        console.error(`✗ ${file}: contains a service_role JWT`)
        problems++
      }
    } catch {
      // not a JWT payload — ignore
    }
  }
}

if (problems) {
  console.error(`\n${problems} secret-like value(s) found in the bundle.`)
  process.exit(1)
}
console.log('✓ No server secrets found in dist/')
