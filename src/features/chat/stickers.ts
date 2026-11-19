/**
 * Luna's built-in sticker pack (ADR 0021). Original designs drawn by the app: a big emoji on a
 * glowing die-cut badge with a caption. Messages store only the id; unknown ids show a fallback.
 */
export interface StickerDef {
  id: string
  emoji: string
  caption: string
  /** Two gradient stops for the badge. */
  from: string
  to: string
}

export const STICKERS: StickerDef[] = [
  { id: 'ship-it', emoji: '🚀', caption: 'Ship it!', from: '#c9a7ff', to: '#ebb6d8' },
  { id: 'lgtm', emoji: '👍', caption: 'LGTM', from: '#7fd8c6', to: '#9cc3f5' },
  { id: 'on-fire', emoji: '🔥', caption: 'On fire', from: '#ffb27a', to: '#ff7a9a' },
  { id: 'we-won', emoji: '🏆', caption: 'We won!', from: '#ffe7a8', to: '#e0a440' },
  { id: 'lets-go', emoji: '🎉', caption: "Let's go!", from: '#f0a6c8', to: '#c9a7ff' },
  { id: 'big-brain', emoji: '🧠', caption: 'Big brain', from: '#f5b8d6', to: '#b78ca8' },
  { id: 'deadline', emoji: '⏰', caption: 'Deadline!', from: '#ff9fb2', to: '#f39a6b' },
  { id: 'its-a-bug', emoji: '🐛', caption: "It's a bug", from: '#b8e986', to: '#7fd8c6' },
  { id: 'merged', emoji: '✅', caption: 'Merged', from: '#6fdc9a', to: '#3fae7c' },
  { id: 'coffee', emoji: '☕', caption: 'Coffee break', from: '#d8b48a', to: '#9a6a44' },
  { id: 'night-shift', emoji: '🌙', caption: 'Night shift', from: '#8a7cf0', to: '#3d3170' },
  { id: 'need-sleep', emoji: '😴', caption: 'Need sleep', from: '#9cc3f5', to: '#7a6ad8' },
  { id: 'hmm', emoji: '🤔', caption: 'Hmm…', from: '#ffd98a', to: '#f0a6c8' },
  { id: 'lol', emoji: '😂', caption: 'LOL', from: '#ffe08a', to: '#ffb27a' },
  { id: 'love-it', emoji: '💜', caption: 'Love it', from: '#ebb6d8', to: '#9b6bd6' },
  { id: 'star', emoji: '⭐', caption: "You're a star", from: '#ffe7a8', to: '#f0a6c8' },
  { id: 'pizza', emoji: '🍕', caption: 'Pizza time', from: '#ffc7a1', to: '#ff8a6b' },
  { id: 'hug', emoji: '🤗', caption: 'Hug', from: '#f7c8a8', to: '#ebb6d8' },
]

const byId = new Map(STICKERS.map((s) => [s.id, s]))

export function stickerById(id: string | null | undefined): StickerDef | null {
  return id ? (byId.get(id) ?? null) : null
}

/** The sticker id stored in a message's metadata, if any. */
export function stickerOf(metadata: unknown): string | null {
  const v = (metadata as { sticker?: unknown } | null)?.sticker
  return typeof v === 'string' && /^[a-z0-9-]{1,40}$/.test(v) ? v : null
}
