import * as Menu from '@radix-ui/react-dropdown-menu'
import { CircleUser, LogOut, MoreHorizontal, Settings, Users } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profile'
import { useCurrentWorkspace } from '@/features/workspace'
import { mobileNav, primaryNav } from './navigation'

const navLink = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-sm px-3 py-2 text-body-sm font-medium ${
    isActive
      ? 'bg-primary-subtle text-primary'
      : 'text-muted hover:bg-primary-subtle hover:text-text'
  }`

/** Desktop sidebar + top bar; mobile top bar + bottom bar (UI spec §9–11). */
export function AppShell() {
  const ws = useCurrentWorkspace()
  return (
    <div className="flex min-h-dvh">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-sm focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <Link to="/" className="flex h-14 items-center gap-2 px-4 text-h3 font-bold">
          <MoonLogo className="size-6" />
          Luna Space
        </Link>
        <p className="truncate px-4 pb-2 text-caption text-muted" title={ws.workspaceName}>
          {ws.workspaceName}
        </p>
        <nav aria-label="Main" className="flex flex-col gap-1 px-2">
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={navLink}>
              <item.icon className="size-4" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
          <Link to="/" className="flex items-center gap-2 text-h3 font-bold lg:hidden">
            <MoonLogo className="size-6" />
            <span className="sr-only sm:not-sr-only">Luna Space</span>
          </Link>
          <div className="flex-1" />
          <AccountMenu />
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 lg:pb-10">
          <Outlet />
        </main>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {primaryNav
          .filter((i) => mobileNav.includes(i.to))
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2 text-caption ${isActive ? 'text-primary' : 'text-muted'}`
              }
            >
              <item.icon className="size-5" aria-hidden />
              {item.label}
            </NavLink>
          ))}
        <NavLink
          to="/more"
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-0.5 py-2 text-caption ${isActive ? 'text-primary' : 'text-muted'}`
          }
        >
          <MoreHorizontal className="size-5" aria-hidden />
          More
        </NavLink>
      </nav>
    </div>
  )
}

function AccountMenu() {
  const { signOut, user } = useAuth()
  const profile = useMyProfile()
  const navigate = useNavigate()
  const name = profile.data?.display_name ?? user?.email ?? 'Account'
  const item =
    'flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 text-body-sm outline-none data-[highlighted]:bg-primary-subtle'

  return (
    <Menu.Root>
      <Menu.Trigger
        className="flex items-center gap-2 rounded-full border border-border px-2 py-1 text-body-sm hover:bg-primary-subtle"
        aria-label={`Account menu for ${name}`}
      >
        <span
          aria-hidden
          className="flex size-7 items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary"
        >
          {name.slice(0, 1).toUpperCase()}
        </span>
        <span className="hidden max-w-32 truncate sm:inline">{name}</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-52 rounded-md border border-border bg-surface-raised p-1 shadow-2"
        >
          <Menu.Item className={item} onSelect={() => navigate('/settings/profile')}>
            <CircleUser className="size-4" aria-hidden /> Profile
          </Menu.Item>
          <Menu.Item className={item} onSelect={() => navigate('/settings/workspace')}>
            <Users className="size-4" aria-hidden /> Workspace
          </Menu.Item>
          <Menu.Separator className="my-1 h-px bg-border" />
          <Menu.Item
            className={item}
            onSelect={async () => {
              await signOut()
              navigate('/auth/sign-in', { replace: true })
            }}
          >
            <LogOut className="size-4" aria-hidden /> Sign out
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}

/** Mobile "More" page listing the modules that are not in the bottom bar. */
export function MorePage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const extra = primaryNav.filter((i) => !mobileNav.includes(i.to))
  return (
    <section aria-labelledby="more-title" className="space-y-4">
      <h1 id="more-title" className="text-h1 font-bold">
        More
      </h1>
      <nav aria-label="More" className="flex flex-col gap-1">
        {extra.map((item) => (
          <NavLink key={item.to} to={item.to} className={navLink}>
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </NavLink>
        ))}
        <NavLink to="/settings/profile" className={navLink}>
          <Settings className="size-4" aria-hidden /> Profile settings
        </NavLink>
        <NavLink to="/settings/workspace" className={navLink}>
          <Users className="size-4" aria-hidden /> Workspace settings
        </NavLink>
        <button
          type="button"
          className={navLink({ isActive: false })}
          onClick={async () => {
            await signOut()
            navigate('/auth/sign-in', { replace: true })
          }}
        >
          <LogOut className="size-4" aria-hidden /> Sign out
        </button>
      </nav>
    </section>
  )
}
