import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  CircleUser,
  Database,
  LogOut,
  MoreHorizontal,
  Settings,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profile'
import { useChatRealtime, useChatUnread } from '@/features/chat'
import { NotificationBell } from '@/features/notifications'
import { CommandPalette } from '@/features/search'
import { MissionBar } from '@/features/mission'
import { WorkspaceSwitcher } from '@/features/workspace'
import { mobileNav, primaryNav } from './navigation'

const sideLink = ({ isActive }: { isActive: boolean }) =>
  `group relative flex items-center gap-3 rounded-[14px] px-3.5 py-2.5 text-body-sm transition-colors duration-[var(--motion-fast)] ${
    isActive ? 'nav-active font-medium' : 'text-muted hover:bg-hairline hover:text-text'
  }`

/**
 * Framed dashboard shell (ADR 0010): a dark sidebar card and the page inside one rounded frame on
 * large screens; a top bar and floating bottom bar on phones (UI spec §9–11).
 */
export function AppShell() {
  const location = useLocation()
  return (
    <div className="min-h-dvh lg:p-4">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface-raised focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div className="app-frame flex min-h-dvh lg:min-h-[calc(100dvh-2rem)] lg:gap-4 lg:p-3">
        <aside className="sidebar-card sticky top-7 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 flex-col p-4 lg:flex">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-2 pt-1 text-[17px] font-semibold tracking-[-0.02em]"
          >
            <MoonLogo className="logo-glow size-7" />
            Luna Space
          </Link>
          <div className="mt-6 mb-3">
            <WorkspaceSwitcher />
          </div>
          <nav aria-label="Main" className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} className={sideLink}>
                {({ isActive }) => (
                  <>
                    <item.icon
                      className={`size-[18px] ${isActive ? 'text-text' : ''}`}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {item.label}
                    {item.to === '/chat' ? <ChatBadge /> : null}
                    {item.phase ? (
                      <span className="ml-auto text-[11px] text-muted/60 opacity-0 transition-opacity group-hover:opacity-100">
                        soon
                      </span>
                    ) : null}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <nav aria-label="Account" className="mt-auto flex flex-col gap-1">
            <NavLink to="/settings/profile" className={sideLink}>
              <Settings className="size-[18px]" strokeWidth={1.75} aria-hidden />
              Settings
            </NavLink>
            <NavLink to="/settings/workspace" className={sideLink}>
              <Users className="size-[18px]" strokeWidth={1.75} aria-hidden />
              Workspace
            </NavLink>
            <NavLink to="/settings/data" className={sideLink}>
              <Database className="size-[18px]" strokeWidth={1.75} aria-hidden />
              Your data
            </NavLink>
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="glass sticky top-0 z-30 flex h-16 items-center gap-3 px-5 lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]"
            >
              <MoonLogo className="size-7" />
              Luna Space
            </Link>
            <div className="flex-1" />
            <CommandPalette />
            <NotificationBell />
            <AccountMenu />
          </header>
          <header className="hidden items-center justify-end gap-2.5 px-4 pt-3 lg:flex">
            <CommandPalette shortcut />
            <NotificationBell />
            <Link to="/settings/profile" aria-label="Settings" className="icon-btn">
              <Settings className="size-[18px]" strokeWidth={1.75} aria-hidden />
            </Link>
            <AccountMenu wide />
          </header>
          <main
            id="main"
            className="mx-auto w-full max-w-6xl flex-1 px-5 pt-6 pb-32 lg:px-6 lg:pt-4 lg:pb-8"
          >
            <MissionBar />
            <div key={location.pathname.split('/')[1] ?? ''} className="fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      <nav
        aria-label="Main"
        className="glass fixed inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 flex rounded-full border border-hairline p-1.5 shadow-2 lg:hidden"
      >
        {[
          ...primaryNav.filter((i) => mobileNav.includes(i.to)),
          { to: '/more', label: 'More', icon: MoreHorizontal },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-full py-1.5 text-[11px] transition-colors ${
                isActive ? 'nav-active' : 'text-muted'
              }`
            }
          >
            <item.icon className="size-5" strokeWidth={1.75} aria-hidden />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function AccountMenu({ wide = false }: { wide?: boolean }) {
  const { signOut, user } = useAuth()
  const profile = useMyProfile()
  const navigate = useNavigate()
  const name = profile.data?.display_name ?? user?.email ?? 'Account'
  const item =
    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-body-sm text-muted outline-none data-[highlighted]:bg-hairline data-[highlighted]:text-text'

  return (
    <Menu.Root>
      <Menu.Trigger
        className={`flex items-center gap-2.5 rounded-full text-body-sm transition-colors hover:bg-hairline ${
          wide ? 'py-1 pr-3 pl-1' : 'p-1'
        }`}
        aria-label={`Account menu for ${name}`}
      >
        <span
          aria-hidden
          className="btn-primary flex size-9 items-center justify-center rounded-full text-body-sm font-semibold"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        {wide ? (
          <span className="min-w-0 text-left leading-tight">
            <span className="block max-w-44 truncate font-medium text-text">{name}</span>
            <span className="block max-w-44 truncate text-caption text-muted">{user?.email}</span>
          </span>
        ) : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          side="bottom"
          sideOffset={8}
          className="z-50 min-w-56 rounded-2xl glass border border-hairline p-1.5 shadow-3"
        >
          <Menu.Item className={item} onSelect={() => navigate('/settings/profile')}>
            <CircleUser className="size-4" strokeWidth={1.75} aria-hidden /> Profile
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => navigate('/settings/workspace')}>
            <Users className="size-4" strokeWidth={1.75} aria-hidden /> Workspace
          </Menu.Item>
          <Menu.Separator className="my-1 h-px bg-hairline" />
          <Menu.Item
            className={item}
            onSelect={async () => {
              await signOut()
              navigate('/auth/sign-in', { replace: true })
            }}
          >
            <LogOut className="size-4" strokeWidth={1.75} aria-hidden /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

const moreRow =
  'flex items-center gap-3 px-4 py-3.5 text-body text-text transition-colors hover:bg-hairline'

/** Mobile "More" page listing the modules that are not in the bottom bar. */
export function MorePage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const extra = primaryNav.filter((i) => !mobileNav.includes(i.to))
  return (
    <section aria-labelledby="more-title" className="space-y-6">
      <h1 id="more-title" className="font-display text-h1">
        More
      </h1>
      <WorkspaceSwitcher />
      <nav aria-label="More" className="panel divide-y divide-hairline overflow-hidden p-0">
        {extra.map((item) => (
          <Link key={item.to} to={item.to} className={moreRow}>
            <item.icon className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="flex-1">{item.label}</span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        ))}
      </nav>
      <nav aria-label="Account" className="panel divide-y divide-hairline overflow-hidden p-0">
        <Link to="/settings/profile" className={moreRow}>
          <CircleUser className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="flex-1">Profile settings</span>
          <ChevronRight className="size-4 text-muted" aria-hidden />
        </Link>
        <Link to="/settings/workspace" className={moreRow}>
          <Users className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="flex-1">Workspace settings</span>
          <ChevronRight className="size-4 text-muted" aria-hidden />
        </Link>
        <Link to="/settings/data" className={moreRow}>
          <Database className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="flex-1">Your data and recycle bin</span>
          <ChevronRight className="size-4 text-muted" aria-hidden />
        </Link>
        <button
          type="button"
          className={`${moreRow} w-full text-left`}
          onClick={async () => {
            await signOut()
            navigate('/auth/sign-in', { replace: true })
          }}
        >
          <LogOut className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="flex-1">Sign out</span>
        </button>
      </nav>
    </section>
  )
}

/** Unread messages from others in the workspace, kept live on every page (FR-CHAT-06). */
function ChatBadge() {
  useChatRealtime()
  const unread = useChatUnread()
  const n = unread.data ?? 0
  if (!n) return null
  return (
    <span
      className="btn-primary ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold"
      aria-label={`${n} unread`}
      data-testid="chat-unread"
    >
      {n > 99 ? '99+' : n}
    </span>
  )
}
