import * as Menu from '@radix-ui/react-dropdown-menu'
import { Check, ChevronsUpDown, Link2, Plus, Settings2 } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useCurrentWorkspace, useMyWorkspaces, useSwitchWorkspace } from '../hooks'
import type { Membership } from '../api'

/** A workspace's badge: its emoji, or its initial on a gradient. */
export function WorkspaceBadge({ ws, size = 'md' }: { ws: Membership; size?: 'sm' | 'md' }) {
  const box = size === 'sm' ? 'size-7 text-[14px]' : 'size-9 text-[17px]'
  return (
    <span
      aria-hidden
      className={`icon-bubble ${box} shrink-0 rounded-[10px] font-semibold`}
      style={{ background: ws.emoji ? 'var(--color-surface-raised)' : undefined }}
    >
      {ws.emoji || ws.workspaceName.slice(0, 1).toUpperCase()}
    </span>
  )
}

const item =
  'flex cursor-pointer items-center gap-2.5 rounded-xl px-2.5 py-2 text-body-sm text-muted outline-none data-[highlighted]:bg-hairline data-[highlighted]:text-text'

/** Lists every workspace I belong to; picking one opens it in this tab (ADR 0018). */
export function WorkspaceSwitcher() {
  const current = useCurrentWorkspace()
  const list = useMyWorkspaces()
  const switchTo = useSwitchWorkspace()
  const navigate = useNavigate()
  return (
    <Menu.Root>
      <Menu.Trigger
        className="lift flex w-full items-center gap-2.5 rounded-[14px] border border-hairline bg-[var(--control-fill)] p-2 text-left"
        aria-label={`Workspace: ${current.workspaceName}. Switch workspace`}
        data-testid="workspace-switcher"
      >
        <WorkspaceBadge ws={current} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-body-sm font-medium">{current.workspaceName}</span>
          <span className="block text-caption text-muted">
            {current.memberCount} member{current.memberCount === 1 ? '' : 's'}
          </span>
        </span>
        <ChevronsUpDown className="size-4 text-muted" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="start"
          sideOffset={8}
          className="glass z-50 w-64 rounded-2xl border border-hairline p-1.5 shadow-3"
        >
          <Menu.Label className="px-2.5 pt-1.5 pb-1 text-caption text-muted">
            Your workspaces
          </Menu.Label>
          {(list.data ?? [current]).map((ws) => (
            <Menu.Item
              key={ws.workspaceId}
              className={item}
              onSelect={() => {
                if (ws.workspaceId !== current.workspaceId) void switchTo(ws.workspaceId)
              }}
            >
              <WorkspaceBadge ws={ws} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-text">{ws.workspaceName}</span>
                <span className="block text-caption">
                  {ws.memberCount} member{ws.memberCount === 1 ? '' : 's'}
                  {ws.role === 'owner' ? ' · owner' : ''}
                </span>
              </span>
              {ws.workspaceId === current.workspaceId ? (
                <Check className="size-4 text-highlight" aria-label="Current" />
              ) : null}
            </Menu.Item>
          ))}
          <Menu.Separator className="my-1.5 h-px bg-hairline" />
          <Menu.Item className={item} onSelect={() => void navigate('/workspaces/new')}>
            <Plus className="size-4" aria-hidden /> New workspace
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => void navigate('/workspaces/join')}>
            <Link2 className="size-4" aria-hidden /> Join with an invite link
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => void navigate('/settings/workspace')}>
            <Settings2 className="size-4" aria-hidden /> Workspace settings
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
