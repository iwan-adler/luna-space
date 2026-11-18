/** Pure helpers for Web Push dispatch (tested with Vitest, ADR 0004). */

export interface ClaimedRow {
  notification_id: string
  recipient_id: string
  title: string
  body: string | null
  link_path: string | null
  show_details: boolean
  subscriptions: { id: string; endpoint: string; p256dh: string; auth: string }[]
}

export interface PushPayload {
  title: string
  body: string
  url: string
  tag: string
}

/** What the device shows. Without lock-screen details, only a neutral message is sent. */
export function buildPayload(row: ClaimedRow): PushPayload {
  const url = row.link_path && row.link_path.startsWith('/') ? row.link_path : '/notifications'
  if (!row.show_details) {
    return {
      title: 'Luna Space',
      body: 'You have a new notification.',
      url,
      tag: row.notification_id,
    }
  }
  return {
    title: row.title.slice(0, 120),
    body: (row.body ?? '').slice(0, 240),
    url,
    tag: row.notification_id,
  }
}

/** The push service says this subscription no longer exists: delete it. */
export function isGone(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410
}

/** Constant-time comparison for the dispatch token. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
