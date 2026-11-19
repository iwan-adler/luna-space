import { useEffect } from 'react'

/**
 * The drifting aurora and starfield behind every page (ADR 0017), plus one pointer listener that
 * feeds the card spotlight (`--mx`, `--my` on the card under the pointer). Purely decorative.
 */
export function Ambient() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return
    let frame = 0
    const onMove = (e: PointerEvent) => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const el = (e.target as Element | null)?.closest?.('.panel, .spotlight')
        if (!(el instanceof HTMLElement)) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__blob ambient__blob--1" />
      <div className="ambient__blob ambient__blob--2" />
      <div className="ambient__blob ambient__blob--3" />
      <div className="ambient__stars" />
      <div className="ambient__grain" />
    </div>
  )
}
