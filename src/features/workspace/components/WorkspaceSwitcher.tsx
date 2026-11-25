import { Check, ChevronsUpDown, Link2, Plus, Settings2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { wrapperVariants, itemVariants } from '@/components/ui/staggered-variants'
import { useCurrentWorkspace, useMyWorkspaces, useSwitchWorkspace } from '../hooks'
import type { Membership } from '../api'

/** A workspace's badge: its emoji, or its initial on a gradient. */
export function WorkspaceBadge({ ws, size = 'md' }: { ws: Membership; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-7 text-[13px]' : 'size-9 text-[15px]'
  return (
    <span
      aria-hidden
      className={`inline-flex items-center justify-center ${box} shrink-0 rounded-lg border border-border bg-surface-raised font-semibold text-text select-none text-center leading-none`}
    >
      <span className="flex items-center justify-center">
        {ws.emoji || ws.workspaceName.slice(0, 1).toUpperCase()}
      </span>
    </span>
  )
}

/** Lists every workspace I belong to with the staggered spring dropdown animation. */
export function WorkspaceSwitcher() {
  const current = useCurrentWorkspace()
  const list = useMyWorkspaces()
  const switchTo = useSwitchWorkspace()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={ref} className="relative w-full">
      <motion.div animate={open ? 'open' : 'closed'} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="lift flex w-full items-center gap-2.5 rounded-xl border border-border bg-surface p-2 text-left transition-colors hover:border-border-hover hover:bg-surface-raised"
          data-testid="workspace-switcher"
        >
          <span className="sr-only">Switch workspace, current: </span>
          <WorkspaceBadge ws={current} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-body-sm font-medium text-text">
              {current.workspaceName}
            </span>
            <span className="block text-caption text-muted">
              {current.memberCount} member{current.memberCount === 1 ? '' : 's'}
            </span>
          </span>
          <ChevronsUpDown className="size-4 text-muted" aria-hidden />
        </button>

        <motion.ul
          role="menu"
          aria-label="Workspaces"
          inert={!open}
          initial="closed"
          animate={open ? 'open' : 'closed'}
          variants={wrapperVariants}
          style={{ originY: 'top', pointerEvents: open ? 'auto' : 'none' }}
          className="absolute top-full left-0 z-50 mt-1.5 flex w-full min-w-72 flex-col gap-1 overflow-hidden rounded-xl border border-border bg-surface/98 p-1.5 shadow-2xl backdrop-blur-2xl"
        >
          <li
            role="presentation"
            className="px-2.5 pt-1.5 pb-1 text-caption font-semibold tracking-wider text-muted uppercase"
          >
            Your teams & workspaces
          </li>
          {(list.data ?? [current]).map((ws) => (
            <motion.li key={ws.workspaceId} variants={itemVariants} role="none">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  if (ws.workspaceId !== current.workspaceId) void switchTo(ws.workspaceId)
                  setOpen(false)
                }}
                className="flex w-full text-left cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-text transition-colors hover:bg-surface-raised hover:text-highlight"
              >
                <WorkspaceBadge ws={ws} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-text font-medium">{ws.workspaceName}</span>
                  <span className="block text-caption text-muted">
                    {ws.memberCount} member{ws.memberCount === 1 ? '' : 's'}
                    {ws.role === 'owner' ? ' · owner' : ''}
                  </span>
                </span>
                {ws.workspaceId === current.workspaceId ? (
                  <Check className="size-4 text-primary-ink" aria-label="Current" />
                ) : null}
              </button>
            </motion.li>
          ))}
          <li role="separator" className="my-1 h-px bg-border" />
          <motion.li variants={itemVariants} role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                void navigate('/workspaces/new')
              }}
              className="flex w-full text-left cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-muted transition-colors hover:bg-surface-raised hover:text-text"
            >
              <Plus className="size-4 text-muted" aria-hidden /> New team workspace
            </button>
          </motion.li>
          <motion.li variants={itemVariants} role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                void navigate('/workspaces/join')
              }}
              className="flex w-full text-left cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-muted transition-colors hover:bg-surface-raised hover:text-text"
            >
              <Link2 className="size-4 text-muted" aria-hidden /> Join with an invite link
            </button>
          </motion.li>
          <motion.li variants={itemVariants} role="none">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                void navigate('/settings/workspace')
              }}
              className="flex w-full text-left cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-body-sm text-muted transition-colors hover:bg-surface-raised hover:text-text"
            >
              <Settings2 className="size-4 text-muted" aria-hidden /> Team settings
            </button>
          </motion.li>
        </motion.ul>
      </motion.div>
    </div>
  )
}
