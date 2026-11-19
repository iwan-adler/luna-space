/**
 * Profile links (ADR 0021): accept what people paste ("github.com/ana", "@ana", "ana.dev") and
 * turn it into the exact form the database accepts, or explain what is wrong.
 */
export type LinkResult = { ok: true; value: string | null } | { ok: false; error: string }

const GITHUB_RE = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/
const DEVPOST_RE = /^[A-Za-z0-9_-]{1,40}$/

const empty = (v: string) => !v.trim()
const stripAt = (v: string) => v.trim().replace(/^@/, '')

export function parseGithub(input: string): LinkResult {
  if (empty(input)) return { ok: true, value: null }
  const m = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([^/?#\s]+)/i)
  const name = m ? m[1]! : stripAt(input)
  return GITHUB_RE.test(name)
    ? { ok: true, value: name }
    : { ok: false, error: 'Enter your GitHub username, like ana-dev' }
}

export function parseLinkedin(input: string): LinkResult {
  if (empty(input)) return { ok: true, value: null }
  const m = input
    .trim()
    .match(/^(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/in\/([A-Za-z0-9_%.-]{2,100})\/?/i)
  if (m) return { ok: true, value: `https://www.linkedin.com/in/${m[1]}/` }
  const handle = stripAt(input)
  return /^[A-Za-z0-9_%.-]{2,100}$/.test(handle)
    ? { ok: true, value: `https://www.linkedin.com/in/${handle}/` }
    : { ok: false, error: 'Paste your LinkedIn profile link (linkedin.com/in/…)' }
}

export function parseWebsite(input: string): LinkResult {
  if (empty(input)) return { ok: true, value: null }
  let v = input.trim()
  if (/^http:\/\//i.test(v)) v = `https://${v.slice(7)}`
  else if (!/^https:\/\//i.test(v)) {
    if (/^[a-z]+:/i.test(v)) return { ok: false, error: 'Only web links (https://) are allowed' }
    v = `https://${v}`
  }
  try {
    const u = new URL(v)
    if (!u.hostname.includes('.') || /\s/.test(v) || v.length > 300)
      return { ok: false, error: 'Enter a web address, like ana.dev' }
    return { ok: true, value: v }
  } catch {
    return { ok: false, error: 'Enter a web address, like ana.dev' }
  }
}

export function parseDevpost(input: string): LinkResult {
  if (empty(input)) return { ok: true, value: null }
  const m = input.trim().match(/^(?:https?:\/\/)?(?:www\.)?devpost\.com\/([^/?#\s]+)/i)
  const name = m ? m[1]! : stripAt(input)
  return DEVPOST_RE.test(name)
    ? { ok: true, value: name }
    : { ok: false, error: 'Enter your Devpost username' }
}

export const githubUrl = (u: string) => `https://github.com/${u}`
export const devpostUrl = (u: string) => `https://devpost.com/${u}`
