/** Small, deterministic visual helpers (ADR 0019). Decoration only. */

/** A stable 32-bit hash of a string. */
export function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * A two-colour gradient that always looks the same for the same name, kept within the app's
 * mauve-violet-rose family so covers sit well together.
 */
export function gradientFor(seed: string): string {
  const h = hashString(seed)
  const hue1 = 280 + (h % 70) // 280–349: violet → rose
  const hue2 = (hue1 + 25 + ((h >>> 8) % 50)) % 360
  const angle = 110 + ((h >>> 16) % 70)
  return `linear-gradient(${angle}deg, hsl(${hue1} 55% 42%), hsl(${hue2} 60% 62%))`
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

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * A burst of stardust from a point on screen (task done, submission sent). `big` is the trophy
 * version. Does nothing for people who prefer reduced motion.
 */
export function celebrate(
  at?: { x: number; y: number } | Element | null,
  options: { big?: boolean } = {},
) {
  if (typeof document === 'undefined' || prefersReducedMotion()) return
  let x = window.innerWidth / 2
  let y = window.innerHeight / 2
  if (at instanceof Element) {
    const r = at.getBoundingClientRect()
    x = r.left + r.width / 2
    y = r.top + r.height / 2
  } else if (at) {
    ;({ x, y } = at)
  }
  const count = options.big ? 60 : 22
  const colours = ['#ebb6d8', '#c9a7ff', '#fff6fb', '#f0a6c8', '#ffd98a']
  const layer = document.createElement('div')
  layer.className = 'stardust-layer'
  layer.setAttribute('aria-hidden', 'true')
  for (let i = 0; i < count; i++) {
    const p = document.createElement('span')
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6
    const dist = (options.big ? 140 : 70) + Math.random() * (options.big ? 160 : 60)
    p.className = i % 4 === 0 ? 'stardust stardust--star' : 'stardust'
    p.style.left = `${x}px`
    p.style.top = `${y}px`
    p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`)
    p.style.setProperty('--dy', `${Math.sin(angle) * dist - (options.big ? 60 : 20)}px`)
    p.style.setProperty('--c', colours[i % colours.length]!)
    p.style.animationDelay = `${Math.random() * 80}ms`
    layer.appendChild(p)
  }
  document.body.appendChild(layer)
  window.setTimeout(() => layer.remove(), options.big ? 1800 : 1200)
}
