import { AlertTriangle, Lock, Repeat } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { DateOnly } from '@/lib/dates'
import {
  isoWeekday,
  itemDates,
  itemKey,
  layerOf,
  minutesInDay,
  type FeedItem,
  type Layer,
} from './model'

const PX = 0.8 // pixels per minute: 48 px per hour
const SNAP = 15
const HOURS = Array.from({ length: 24 }, (_, h) => h)

const tone: Record<Layer, string> = {
  shared: 'bg-primary/22 border-primary/50',
  personal: 'bg-rose/18 border-rose/45',
  deadlines: 'bg-highlight/16 border-highlight/50',
  tasks: 'bg-info/16 border-info/45',
  projects: 'bg-accent/16 border-accent/45',
}

interface Placed {
  item: FeedItem
  top: number
  height: number
  col: number
  cols: number
}

/** Lays out one day's timed items; overlapping items share the width (FR-CAL-01). */
function place(items: FeedItem[], day: DateOnly, tz: string): Placed[] {
  const spans = items
    .map((item) => {
      const start = minutesInDay(item.startsAt!, day, tz)
      const end = item.endsAt
        ? minutesInDay(item.endsAt, day, tz)
        : start + (item.sourceType === 'event' ? 60 : 30)
      return { item, start, end: Math.max(end, start + 15) }
    })
    .filter((s) => s.start < 1440 && s.end > 0)
    .sort((a, b) => a.start - b.start || b.end - a.end)
  const out: Placed[] = []
  let group: (Placed & { end: number })[] = []
  let groupEnd = -1
  const flush = () => {
    const cols = Math.max(1, ...group.map((g) => g.col + 1))
    for (const g of group) out.push({ ...g, cols })
    group = []
  }
  for (const s of spans) {
    if (s.start >= groupEnd) {
      flush()
      groupEnd = -1
    }
    const used = new Set(group.filter((g) => g.end > s.start).map((g) => g.col))
    let col = 0
    while (used.has(col)) col++
    const top = Math.max(0, s.start) * PX
    const height = Math.max(18, (Math.min(1440, s.end) - Math.max(0, s.start)) * PX - 2)
    group.push({ item: s.item, top, height, col, cols: 1, end: s.end })
    groupEnd = Math.max(groupEnd, s.end)
  }
  flush()
  return out
}

const timeLabel = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

export function TimeGrid({
  days,
  items,
  tz,
  today,
  nowMinutes,
  clashKeys,
  onOpen,
  onCreateAt,
  onMove,
}: {
  days: DateOnly[]
  items: FeedItem[]
  tz: string
  today: DateOnly
  nowMinutes: number
  clashKeys: Set<string>
  onOpen: (item: FeedItem) => void
  onCreateAt: (day: DateOnly, minutes: number) => void
  onMove: (item: FeedItem, deltaMinutes: number) => void
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const columns = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{
    key: string
    x: number
    y: number
    dx: number
    dy: number
  } | null>(null)

  const [width, setWidth] = useState(1)
  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = 7 * 60 * PX
    const el = columns.current
    if (!el) return
    const measure = () => setWidth(el.clientWidth / days.length || 1)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [days.length])

  const allDay = useMemo(() => items.filter((i) => i.allDay), [items])
  const timed = useMemo(() => items.filter((i) => !i.allDay && i.startsAt), [items])
  const placed = useMemo(() => days.map((d) => place(timed, d, tz)), [days, timed, tz])
  const snapMinutes = (dy: number) => Math.round(dy / PX / SNAP) * SNAP
  const snapDays = (dx: number) => Math.round(dx / width)

  const gridStyle = { gridTemplateColumns: `3.25rem repeat(${days.length}, minmax(0, 1fr))` }

  return (
    <div className="panel overflow-hidden p-0" data-testid="calendar-timegrid">
      <div className="grid border-b border-hairline" style={gridStyle}>
        <div />
        {days.map((d) => (
          <div key={d} className="px-2 py-2 text-center">
            <p className="text-caption text-muted">
              {new Intl.DateTimeFormat('en-IN', { weekday: 'short', timeZone: 'UTC' }).format(
                Date.parse(`${d}T00:00:00Z`),
              )}
            </p>
            <p
              className={`mx-auto mt-0.5 grid size-8 place-items-center rounded-full text-body-sm font-semibold ${d === today ? 'btn-primary shadow-[0_0_14px_-2px_var(--color-highlight)]' : ''}`}
            >
              {Number(d.slice(8))}
            </p>
          </div>
        ))}
      </div>
      <div className="grid border-b border-hairline" style={gridStyle}>
        <div className="py-1.5 pr-1 text-right text-[10px] text-muted">all day</div>
        {days.map((d) => (
          <div key={d} className="min-h-8 space-y-1 border-l border-hairline p-1">
            {allDay
              .filter((i) => itemDates(i, tz).includes(d))
              .map((i) => (
                <button
                  key={itemKey(i)}
                  type="button"
                  onClick={() => onOpen(i)}
                  data-testid="calendar-item"
                  title={i.title}
                  className={`flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-left text-[11px] ${tone[layerOf(i)]}`}
                >
                  {clashKeys.has(itemKey(i)) ? (
                    <AlertTriangle className="size-3 shrink-0 text-warning" aria-label="Clash" />
                  ) : null}
                  <span className="truncate">{i.title}</span>
                </button>
              ))}
          </div>
        ))}
      </div>
      <div
        ref={scroller}
        className="relative h-[62dvh] overflow-y-auto focus-visible:outline-2"
        tabIndex={0}
        role="region"
        aria-label="Hours of the day (scroll with the arrow keys)"
      >
        <div className="grid" style={{ ...gridStyle, height: 1440 * PX }}>
          <div className="relative">
            {HOURS.map((h) => (
              <span
                key={h}
                className="absolute right-1.5 -translate-y-1/2 text-[10px] text-muted"
                style={{ top: h * 60 * PX }}
              >
                {h ? `${String(h).padStart(2, '0')}:00` : ''}
              </span>
            ))}
          </div>
          <div
            ref={columns}
            className="relative grid"
            style={{
              gridColumn: '2 / -1',
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((d, di) => (
              <div
                key={d}
                data-day={d}
                className={`relative border-l border-hairline ${d === today ? 'bg-primary/[0.05]' : isoWeekday(d) >= 6 ? 'bg-hairline/30' : ''}`}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return
                  const y = e.nativeEvent.offsetY
                  onCreateAt(d, Math.min(1410, Math.floor(y / PX / 30) * 30))
                }}
              >
                {HOURS.map((h) => (
                  <div
                    key={h}
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 border-t border-hairline"
                    style={{ top: h * 60 * PX }}
                  />
                ))}
                {d === today ? (
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-gradient-to-r from-highlight via-highlight to-transparent shadow-[0_0_10px_1px_var(--color-highlight)]"
                    style={{ top: nowMinutes * PX }}
                  >
                    <span className="absolute -top-[5px] -left-[5px] size-3 rounded-full bg-highlight shadow-[0_0_12px_3px_var(--color-highlight)]" />
                  </div>
                ) : null}
                {placed[di]!.map(({ item, top, height, col, cols: n }) => {
                  const key = itemKey(item)
                  const draggable = item.sourceType === 'event' && !item.rrule
                  const dragging = drag?.key === key ? drag : null
                  const start = minutesInDay(item.startsAt!, d, tz)
                  return (
                    <button
                      key={key}
                      type="button"
                      data-testid="calendar-item"
                      title={item.title}
                      aria-label={`${item.title}, ${timeLabel(Math.max(0, start))}${draggable ? ', drag to move' : ''}`}
                      className={`absolute z-20 overflow-hidden rounded-[10px] border px-1.5 py-1 text-left text-[11px] leading-tight shadow-1 ${tone[layerOf(item)]} ${draggable ? 'cursor-grab touch-none active:cursor-grabbing' : ''} ${dragging ? 'opacity-85 ring-2 ring-primary' : ''}`}
                      style={{
                        top,
                        height,
                        left: `calc(${(col / n) * 100}% + 2px)`,
                        width: `calc(${100 / n}% - 4px)`,
                        transform: dragging
                          ? `translate(${snapDays(dragging.dx) * width}px, ${snapMinutes(dragging.dy) * PX}px)`
                          : undefined,
                      }}
                      onPointerDown={(e) => {
                        if (!draggable || e.button !== 0) return
                        e.currentTarget.setPointerCapture(e.pointerId)
                        setDrag({ key, x: e.clientX, y: e.clientY, dx: 0, dy: 0 })
                      }}
                      onPointerMove={(e) => {
                        if (drag?.key !== key) return
                        setDrag({ ...drag, dx: e.clientX - drag.x, dy: e.clientY - drag.y })
                      }}
                      onPointerUp={() => {
                        if (drag?.key !== key) return
                        const delta = snapDays(drag.dx) * 1440 + snapMinutes(drag.dy)
                        const moved = Math.abs(drag.dx) > 4 || Math.abs(drag.dy) > 4
                        setDrag(null)
                        if (moved && delta !== 0) onMove(item, delta)
                        else if (!moved) onOpen(item)
                      }}
                      onPointerCancel={() => setDrag(null)}
                      onClick={(e) => {
                        // Draggable items open on pointer-up (unless dragged); everything else, and
                        // keyboard activation (detail 0), opens here.
                        if (!draggable || e.detail === 0) onOpen(item)
                      }}
                    >
                      <span className="flex items-center gap-1 font-medium">
                        {clashKeys.has(key) ? (
                          <AlertTriangle
                            className="size-3 shrink-0 text-warning"
                            aria-label="Clash"
                          />
                        ) : null}
                        {item.rrule ? (
                          <Repeat className="size-3 shrink-0" aria-label="Repeats" />
                        ) : null}
                        {item.visibility === 'private' ? (
                          <Lock className="size-2.5 shrink-0" aria-label="Private" />
                        ) : null}
                        <span className="truncate">{item.title}</span>
                      </span>
                      {height > 30 ? (
                        <span className="block text-muted">
                          {timeLabel(Math.max(0, start))}
                          {dragging
                            ? ` → ${timeLabel(Math.max(0, start + snapMinutes(dragging.dy)))}`
                            : ''}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
