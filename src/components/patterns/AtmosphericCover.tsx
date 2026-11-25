import { useEffect, useId, useRef, useState } from 'react'

export interface AtmosphericCoverProps {
  className?: string
  name?: string
  urgent?: boolean
}

/**
 * Atmospheric Sky Cover (Daytime Blue Sky in Light mode, Night Sky in Dark mode).
 * Driven 100% by CSS theme tokens (--banner-sky, --banner-celestial-glow, --banner-cloud-*).
 * Hardware accelerated horizontal SVG cloud drift with off-screen pause and reduced motion support.
 */
export function AtmosphericCover({ className = '', urgent = false }: AtmosphericCoverProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(true)
  const id = useId().replace(/:/g, '')

  // Pause cloud animation when card is scrolled off-screen
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry?.isIntersecting ?? true)
      },
      { rootMargin: '100px' },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const animState = inView ? 'running' : 'paused'

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={`relative select-none overflow-hidden ${className}`}
      style={{
        background: urgent ? 'var(--banner-sky-urgent, var(--banner-sky))' : 'var(--banner-sky)',
        borderBottom: 'var(--banner-border-bottom)',
        transition: 'background 260ms ease, border-color 260ms ease',
      }}
    >
      {/* 1. Celestial Glow (Sun in light mode, Moon in dark mode at top right) */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'var(--banner-celestial-glow)',
          transition: 'background 260ms ease',
        }}
      />

      {/* 2. Top-corner subtle depth vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'var(--banner-vignette)',
          transition: 'background 260ms ease',
        }}
      />

      {/* 3. Inline SVG Cloud Layers (Parallax motion, linear 60-85s GPU loop) */}
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-hidden"
        preserveAspectRatio="none"
        viewBox="0 0 1000 100"
      >
        <defs>
          <linearGradient id={`cloud-g1-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--banner-cloud-fill-1)" />
            <stop offset="82%" stopColor="var(--banner-cloud-fill-1)" />
            <stop offset="100%" stopColor="var(--banner-cloud-underside)" />
          </linearGradient>

          <linearGradient id={`cloud-g2-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--banner-cloud-fill-2)" />
            <stop offset="80%" stopColor="var(--banner-cloud-fill-2)" />
            <stop offset="100%" stopColor="var(--banner-cloud-underside)" />
          </linearGradient>

          <linearGradient id={`cloud-g3-${id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--banner-cloud-fill-3)" />
            <stop offset="78%" stopColor="var(--banner-cloud-fill-3)" />
            <stop offset="100%" stopColor="var(--banner-cloud-underside)" />
          </linearGradient>
        </defs>
      </svg>

      {/* Layer 1: Far Clouds (Smaller, softer, 85s loop) */}
      <div
        className="banner-cloud-layer"
        style={{
          animationDuration: '85s',
          animationPlayState: animState,
          filter: 'blur(var(--banner-cloud-blur, 1.5px))',
        }}
      >
        <svg viewBox="0 0 1600 100" className="size-full" preserveAspectRatio="none">
          {/* First loop half (0 - 800) */}
          <path
            fill={`url(#cloud-g1-${id})`}
            d="M 60 48 Q 78 30 105 28 Q 124 12 158 14 Q 186 6 214 20 Q 236 14 256 30 Q 274 36 268 48 C 220 53 140 52 60 48 Z"
          />
          <path
            fill={`url(#cloud-g1-${id})`}
            d="M 440 42 Q 456 24 482 26 Q 502 12 532 14 Q 556 16 574 28 Q 598 24 616 34 C 580 40 500 40 440 42 Z"
          />
          {/* Second duplicate half for seamless wrap (800 - 1600) */}
          <path
            fill={`url(#cloud-g1-${id})`}
            d="M 860 48 Q 878 30 905 28 Q 924 12 958 14 Q 986 6 1014 20 Q 1036 14 1056 30 Q 1074 36 1068 48 C 1020 53 940 52 860 48 Z"
          />
          <path
            fill={`url(#cloud-g1-${id})`}
            d="M 1240 42 Q 1256 24 1282 26 Q 1302 12 1332 14 Q 1356 16 1374 28 Q 1398 24 1416 34 C 1380 40 1300 40 1240 42 Z"
          />
        </svg>
      </div>

      {/* Layer 2: Mid Clouds (Medium, 72s loop) */}
      <div
        className="banner-cloud-layer"
        style={{
          animationDuration: '72s',
          animationPlayState: animState,
          filter: 'blur(var(--banner-cloud-blur, 1.5px))',
        }}
      >
        <svg viewBox="0 0 1600 100" className="size-full" preserveAspectRatio="none">
          {/* First loop half (0 - 800) */}
          <path
            fill={`url(#cloud-g2-${id})`}
            d="M 220 56 Q 242 34 274 36 Q 300 18 338 22 Q 370 16 392 32 Q 414 38 408 54 C 360 60 280 59 220 56 Z"
          />
          <path
            fill={`url(#cloud-g2-${id})`}
            d="M 620 52 Q 638 32 668 34 Q 692 18 726 22 Q 752 18 772 32 Q 794 38 786 52 C 740 56 670 56 620 52 Z"
          />
          {/* Second duplicate half for seamless wrap (800 - 1600) */}
          <path
            fill={`url(#cloud-g2-${id})`}
            d="M 1020 56 Q 1042 34 1074 36 Q 1100 18 1138 22 Q 1170 16 1192 32 Q 1214 38 1208 54 C 1160 60 1080 59 1020 56 Z"
          />
          <path
            fill={`url(#cloud-g2-${id})`}
            d="M 1420 52 Q 1438 32 1468 34 Q 1492 18 1526 22 Q 1552 18 1572 32 Q 1594 38 1586 52 C 1540 56 1470 56 1420 52 Z"
          />
        </svg>
      </div>

      {/* Layer 3: Near Clouds (Largest, crispest, 58s loop) */}
      <div
        className="banner-cloud-layer"
        style={{
          animationDuration: '58s',
          animationPlayState: animState,
          filter: 'blur(calc(var(--banner-cloud-blur, 1.5px) * 0.75))',
        }}
      >
        <svg viewBox="0 0 1600 100" className="size-full" preserveAspectRatio="none">
          {/* First loop half (0 - 800) */}
          <path
            fill={`url(#cloud-g3-${id})`}
            d="M 20 64 Q 48 40 85 42 Q 116 20 160 24 Q 198 18 228 38 Q 256 46 248 62 C 190 68 85 68 20 64 Z"
          />
          <path
            fill={`url(#cloud-g3-${id})`}
            d="M 480 62 Q 504 38 540 40 Q 570 22 612 26 Q 644 20 670 38 Q 696 46 688 62 C 635 68 545 67 480 62 Z"
          />
          {/* Second duplicate half for seamless wrap (800 - 1600) */}
          <path
            fill={`url(#cloud-g3-${id})`}
            d="M 820 64 Q 848 40 885 42 Q 916 20 960 24 Q 998 18 1028 38 Q 1056 46 1048 62 C 990 68 885 68 820 64 Z"
          />
          <path
            fill={`url(#cloud-g3-${id})`}
            d="M 1280 62 Q 1304 38 1340 40 Q 1370 22 1412 26 Q 1444 20 1470 38 Q 1496 46 1488 62 C 1435 68 1345 67 1280 62 Z"
          />
        </svg>
      </div>

      {/* 4. Bottom Horizon Haze (Soft 24px blend into card body) */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-6"
        style={{
          background: 'var(--banner-horizon-haze)',
          transition: 'background 260ms ease',
        }}
      />
    </div>
  )
}
