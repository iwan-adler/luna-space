/**
 * Remembers where a signed-out visitor was going (e.g. /invite/:token) so sign-in, sign-up
 * and email confirmation can resume there (Flow §5).
 */
const KEY = 'luna.pendingRoute'

export function savePendingRoute(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return
  try {
    sessionStorage.setItem(KEY, path)
  } catch {
    // ignore
  }
}

export function takePendingRoute(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null
  } catch {
    return null
  }
}

export function clearPendingRoute() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

export function peekPendingRoute(): string | null {
  try {
    const value = sessionStorage.getItem(KEY)
    return value && value.startsWith('/') && !value.startsWith('//') ? value : null
  } catch {
    return null
  }
}
