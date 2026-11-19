/**
 * Web Push on this device (FR-PLAT-08). The VAPID public key is public by design; the private key
 * lives only in the dispatch-push function's secrets (ADR 0009).
 */
export const VAPID_PUBLIC_KEY =
  'BLSje6PyP0chAJdJ7KR3aWZsQQDmrl6F39VbBRiFkMWcyCNkwNA3HPTgG1R7M4pbrouPRlbTF-f2l-w2sgvc4lY'

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export const UPDATE_EVENT = 'luna:update-available'
let updating = false

/**
 * Registers the service worker once, early, so push works even when no tab is open and the app
 * shell is cached. When a newer version has installed, fires UPDATE_EVENT with the waiting worker
 * (ADR 0022); applyUpdate() then switches to it and reloads.
 */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  const local = ['localhost', '127.0.0.1'].includes(location.hostname)
  if (location.protocol !== 'https:' && !local) return
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (updating) location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        const announce = (w: ServiceWorker) =>
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: w }))
        if (reg.waiting && navigator.serviceWorker.controller) announce(reg.waiting)
        reg.addEventListener('updatefound', () => {
          const w = reg.installing
          w?.addEventListener('statechange', () => {
            if (w.state === 'installed' && navigator.serviceWorker.controller) announce(w)
          })
        })
        // Look for a new version when the app comes back to the foreground, and hourly.
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') void reg.update().catch(() => undefined)
        })
        window.setInterval(() => void reg.update().catch(() => undefined), 3_600_000)
      })
      .catch(() => undefined)
  })
}

/** Lets the waiting version take over; the page reloads once it has. */
export function applyUpdate(worker: ServiceWorker) {
  updating = true
  worker.postMessage('SKIP_WAITING')
}

function keyToBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4)
  const raw = atob((base64url + padding).replace(/-/g, '+').replace(/_/g, '/'))
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.getRegistration('/')
  return (await reg?.pushManager.getSubscription()) ?? null
}

export async function pushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return (await currentSubscription()) ? 'on' : 'off'
}

/** Asks for permission and subscribes this browser; returns the keys to store. */
export async function subscribeThisDevice(): Promise<{
  endpoint: string
  p256dh: string
  auth: string
}> {
  if (!pushSupported()) throw new Error('This browser does not support notifications.')
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') throw new Error('Notifications were not allowed in the browser.')
  const reg =
    (await navigator.serviceWorker.getRegistration('/')) ??
    (await navigator.serviceWorker.register('/sw.js', { scope: '/' }))
  await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyToBytes(VAPID_PUBLIC_KEY),
    }))
  const json = sub.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error('The browser returned an incomplete subscription.')
  return { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }
}
