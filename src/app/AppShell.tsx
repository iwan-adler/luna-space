import * as Menu from '@radix-ui/react-dropdown-menu'
import { ChevronRight, CircleUser, LogOut, MoreHorizontal, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profile'
import { NotificationBell } from '@/features/notifications'
import { useCurrentWorkspace } from '@/features/workspace'
import { mobileNav, primaryNav } from './navigation'

const sideLink = ({ isActive }: { isActive: boolean }) =>
  `group relative flex items-center gap-3 rounded-full px-3.5 py-2 text-body-sm transition-colors duration-[var(--motion-fast)] ${
    isActive ? 'bg-primary-subtle font-medium text-text' : 'text-muted hover:text-text'
  }`

/** Soft-night shell: quiet sidebar and floating bottom bar (UI spec §9–11, ADR 0005). */
export function AppShell() {
  const ws = useCurrentWorkspace()
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface-raised focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col px-4 py-6 lg:flex">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-2 text-[17px] font-semibold tracking-[-0.02em]"
        >
          <MoonLogo className="size-7" />
          Luna Space
        </Link>
        <div className="absolute top-6 right-4">
          <NotificationBell />
        </div>
        <p className="eyebrow mt-8 mb-3 truncate px-3.5" title={ws.workspaceName}>
          {ws.workspaceName}
        </p>
        <nav aria-label="Main" className="flex flex-col gap-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={sideLink}>
              {({ isActive }) => (
                <>
                  <item.icon
                    className={`size-[18px] ${isActive ? 'text-primary' : ''}`}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                  {item.label}
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
        <div className="mt-auto px-1">
          <AccountMenu wide />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 glass px-5 lg:hidden">
          <Link
            to="/"
            className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]"
          >
            <MoonLogo className="size-7" />
            Luna Space
          </Link>
          <div className="flex-1" />
          <NotificationBell />
          <AccountMenu />
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-5xl flex-1 px-5 pt-6 pb-32 lg:px-10 lg:pt-12 lg:pb-16"
        >
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-4 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 flex rounded-full glass border border-hairline p-1.5 shadow-2 lg:hidden"
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
                isActive ? 'bg-primary-subtle text-primary' : 'text-muted'
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
          wide ? 'w-full px-2 py-2' : 'p-1'
        }`}
        aria-label={`Account menu for ${name}`}
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-body-sm font-semibold text-primary"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        {wide ? <span className="min-w-0 flex-1 truncate text-left text-muted">{name}</span> : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align={wide ? 'start' : 'end'}
          side={wide ? 'top' : 'bottom'}
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
