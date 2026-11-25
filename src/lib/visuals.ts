/** Small, deterministic visual helpers. */

/** A stable 32-bit hash of a string. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

const avatarSurfaces = ['#4c504a', '#54554e', '#545d58', '#4d5358', '#54525b', '#63574a'] as const

/** A restrained solid neutral fill for monogram surfaces. */
export function gradientFor(seed: string): string {
  return avatarSurfaces[hashString(seed) % avatarSurfaces.length]!
}

/** Up to two initials for a monogram. */
export function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (!words.length) return '?'
  const first = words[0]!
  const second = words[1]
  return (first[0]! + (second ? second[0]! : (first[1] ?? ''))).toUpperCase()
}

/** No-op by design: state changes provide feedback without particle effects. */
export function celebrate(
  _at?: { x: number; y: number } | Element | null,
  _options?: { big?: boolean },
) {}
