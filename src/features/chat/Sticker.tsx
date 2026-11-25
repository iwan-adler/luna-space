import * as Menu from '@radix-ui/react-dropdown-menu'
import { Sticker as StickerIcon } from 'lucide-react'
import { STICKERS, stickerById } from './stickers'

/** One sticker: a big emoji on a glowing die-cut badge with its caption. */
export function Sticker({ id, size = 'lg' }: { id: string; size?: 'sm' | 'lg' }) {
  const s = stickerById(id)
  const big = size === 'lg'
  if (!s) {
    return (
      <span className="inline-grid size-24 place-items-center rounded-[26px] border border-dashed border-border text-caption text-muted">
        Sticker
      </span>
    )
  }
  return (
    <span
      role="img"
      aria-label={`Sticker: ${s.caption}`}
      className={`sticker group/sticker relative inline-flex flex-col items-center ${big ? 'w-32' : 'w-[4.5rem]'}`}
    >
      <span
        className={`relative grid place-items-center rounded-[28%] border-[3px] border-white/90 shadow-[0_8px_24px_-8px_rgb(0_0_0/0.55)] transition-transform duration-300 group-hover/sticker:-rotate-6 group-hover/sticker:scale-105 ${big ? 'size-24' : 'size-14'}`}
        style={{
          background: `radial-gradient(circle at 30% 25%, rgb(255 255 255 / 0.45), transparent 55%), linear-gradient(140deg, ${s.from}, ${s.to})`,
          boxShadow: `0 0 26px -6px ${s.to}`,
        }}
      >
        <span className={big ? 'text-[52px] leading-none' : 'text-[30px] leading-none'} aria-hidden>
          {s.emoji}
        </span>
      </span>
      <span
        className={`-mt-2.5 rounded-full border-2 border-white/90 px-2.5 py-0.5 font-semibold tracking-tight text-[#2a1630] shadow-[0_4px_10px_-4px_rgb(0_0_0/0.5)] ${big ? 'text-[13px]' : 'text-[9px]'}`}
        style={{ background: `linear-gradient(90deg, ${s.from}, ${s.to})` }}
        aria-hidden
      >
        {s.caption}
      </span>
    </span>
  )
}

/** The sticker drawer next to the composer; picking one sends it. */
export function StickerPicker({
  onPick,
  disabled,
}: {
  onPick: (id: string) => void
  disabled?: boolean
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="icon-btn size-10 shrink-0"
        aria-label="Stickers"
        disabled={disabled}
        data-testid="sticker-button"
      >
        <StickerIcon className="size-4" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          side="top"
          align="start"
          sideOffset={10}
          className="z-50 w-[min(92vw,22rem)] rounded-2xl border border-border bg-surface p-3 shadow-2xl backdrop-blur-none"
        >
          <Menu.Label className="mb-2 px-1 text-caption font-medium text-muted">
            Luna stickers
          </Menu.Label>
          <div className="grid max-h-72 grid-cols-4 gap-1 overflow-y-auto">
            {STICKERS.map((s) => (
              <Menu.Item
                key={s.id}
                onSelect={() => onPick(s.id)}
                className="grid cursor-pointer place-items-center rounded-xl py-1.5 outline-none transition-colors hover:bg-surface-raised data-[highlighted]:bg-surface-raised"
                aria-label={`Send sticker: ${s.caption}`}
              >
                <Sticker id={s.id} size="sm" />
              </Menu.Item>
            ))}
          </div>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
