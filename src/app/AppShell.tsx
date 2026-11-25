import { motion, useReducedMotion } from 'motion/react'
import { useState, useEffect, useRef } from 'react'
import {
  Bell,
  Check,
  ChevronsUpDown,
  ChevronRight,
  CircleUser,
  Database,
  FolderKanban,
  House,
  Link2,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  Trophy,
  Users,
} from 'lucide-react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AccountMenuDropdown } from '@/components/patterns/AccountMenuDropdown'
import { iconVariants, itemVariants, wrapperVariants } from '@/components/ui/staggered-variants'
import { ErrorBoundary } from '@/components/patterns/ErrorBoundary'
import { MoonDot } from '@/components/patterns/MoonDot'
import { MoonLogo } from '@/components/patterns/MoonLogo'
import { UpdatePrompt } from '@/components/patterns/UpdatePrompt'
import { AtmosphericCover } from '@/components/patterns/AtmosphericCover'
import { useAuth } from '@/features/auth'
import { useChatRealtime, useChatUnread } from '@/features/chat'
import { NotificationBell } from '@/features/notifications'
import { CommandPalette } from '@/features/search'
import { MissionBar } from '@/features/mission'
import { LiveMeetingBottomStrip, useActiveMeeting, useMyTasks } from '@/features/projects'
import { pushState } from '@/lib/push'

import {
  useCurrentWorkspace,
  useMyWorkspaces,
  useSwitchWorkspace,
  WorkspaceSwitcher,
} from '@/features/workspace'
import { mobileNav, primaryNav } from './navigation'

const sideLink = ({ isActive }: { isActive: boolean }) =>
  `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm transition-all duration-[var(--motion-fast)] ${
    isActive
      ? 'nav-active font-semibold shadow-sm'
      : 'text-muted hover:bg-surface-raised hover:text-text'
  }`

function MoreNavIcon({ className, filled }: { className?: string; filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <circle cx="6.5" cy="6.5" r={filled ? '2.5' : '2'} />
      <circle cx="17.5" cy="6.5" r={filled ? '2.5' : '2'} />
      <circle cx="6.5" cy="17.5" r={filled ? '2.5' : '2'} />
      <circle cx="17.5" cy="17.5" r={filled ? '2.5' : '2'} />
    </svg>
  )
}

/** 5-item mobile bottom navigation: Home, Explore, Projects (center hero), Chat, More */
const mobileNavItems = [
  { to: '/', label: 'Home', icon: House, isHero: false },
  { to: '/opportunities', label: 'Explore', icon: Trophy, isHero: false },
  { to: '/projects', label: 'Projects', icon: FolderKanban, isHero: true },
  { to: '/chat', label: 'Chat', icon: MessageCircle, isHero: false },
  { to: '/more', label: 'More', icon: MoreNavIcon, isHero: false },
]

/**
 * Shared Luna shell: steady navigation, clear surfaces, and a compact mobile bar.
 */
export function AppShell() {
  const location = useLocation()
  const isChat = location.pathname === '/chat' || location.pathname.startsWith('/chat/')
  const [navVisible, setNavVisible] = useState(true)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY
        const isModalOpen = Boolean(document.querySelector('[role="dialog"], [role="alertdialog"]'))
        const isInputFocused = ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          document.activeElement?.tagName || '',
        )

        if (isModalOpen || isInputFocused || currentY < 60) {
          setNavVisible(true)
        } else if (currentY > lastY + 10 && currentY > 100) {
          // User scrolling down
          setNavVisible(false)
        } else if (currentY < lastY - 8) {
          // User scrolling up
          setNavVisible(true)
        }
        lastY = currentY
        ticking = false
      })
      ticking = true
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={isChat ? 'h-dvh max-h-dvh overflow-hidden flex flex-col' : 'min-h-dvh'}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-surface-raised focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <div
        className={`app-frame flex ${isChat ? 'h-dvh max-h-dvh overflow-hidden flex-1 min-h-0' : 'min-h-dvh'}`}
      >
        <aside className="sidebar-card sticky top-0 hidden h-dvh w-64 shrink-0 flex-col p-4 lg:flex">
          <Link
            to="/"
            className="flex items-center gap-2.5 px-2 pt-1 text-[17px] font-semibold tracking-[-0.02em]"
          >
            <MoonLogo className="size-7" />
            Luna Space
          </Link>
          <div className="mt-5 mb-4">
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

        <div
          className={`flex min-w-0 flex-1 flex-col ${isChat ? 'h-full max-h-full min-h-0 overflow-hidden' : ''}`}
        >
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-[var(--navbar-bg)] px-4 backdrop-blur-[20px] backdrop-saturate-[180%] lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-2 text-[17px] font-semibold tracking-[-0.02em]"
            >
              <MoonLogo className="size-7" />
              Luna Space
            </Link>
            <div className="flex-1" />
            <HeaderWorkspaceBadge />
            <CommandPalette />
            <NotificationBell />
            <AccountMenu />
          </header>
          <header className="sticky top-0 z-30 hidden shrink-0 items-center justify-between gap-2.5 border-b border-border bg-[var(--navbar-bg)] px-6 py-3 backdrop-blur-[20px] backdrop-saturate-[180%] lg:flex">
            <CommandPalette shortcut />
            <div className="flex items-center gap-2.5">
              <HeaderWorkspaceBadge />
              <NotificationBell />
              <Link to="/settings/profile" aria-label="Settings" className="icon-btn">
                <Settings className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </Link>
              <AccountMenu wide />
            </div>
          </header>

          <main
            id="main"
            className={
              isChat
                ? 'flex flex-1 flex-col overflow-hidden min-h-0 h-full p-0 w-full'
                : 'mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-4 pt-5 pb-[calc(var(--nav-h)+2.5rem)] sm:px-6 lg:px-8 lg:pt-8 lg:pb-10'
            }
          >
            {isChat ? null : <MissionBar />}
            <div
              key={location.pathname.split('/')[1] ?? ''}
              className={`flex flex-1 flex-col min-h-0 w-full ${isChat ? 'h-full' : 'fade-in'}`}
            >
              <ErrorBoundary>
                <Outlet />
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>

      <UpdatePrompt />
      <LiveMeetingBottomStrip />

      {/* Fluid Glassmorphic Bottom Strip (5-Item Psychological Layout) */}
      <div className="fixed inset-x-0 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 pointer-events-none flex justify-center lg:hidden">
        <motion.div
          initial={false}
          animate={{
            y: reducedMotion ? 0 : navVisible ? 0 : 96,
            opacity: navVisible ? 1 : 0,
          }}
          transition={{
            type: 'spring',
            stiffness: 420,
            damping: 32,
            mass: 0.8,
          }}
          className="max-w-[calc(100vw-1.5rem)] flex justify-center pointer-events-none"
        >
          <nav aria-label="Bottom Navigation" className="fluid-nav-group pointer-events-auto">
            {mobileNavItems.map((item) => {
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : item.to === '/more'
                    ? location.pathname === '/more' ||
                      location.pathname.startsWith('/more/') ||
                      location.pathname.startsWith('/settings/')
                    : location.pathname === item.to || location.pathname.startsWith(`${item.to}/`)
              return (
                <motion.div
                  key={item.to}
                  whileTap={reducedMotion ? undefined : { scale: 0.92 }}
                  className="flex items-center justify-center"
                >
                  <NavLink
                    to={item.to}
                    end={item.to === '/'}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`nav-item group ${item.isHero ? 'center-hero' : ''} focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="fluid-nav-slider"
                        className="fluid-nav-slider"
                        transition={{
                          type: 'spring',
                          stiffness: 450,
                          damping: 32,
                          mass: 0.8,
                        }}
                      />
                    )}
                    <div className="relative z-10 flex flex-col items-center justify-center gap-1 w-full">
                      <div className="relative flex size-[22px] items-center justify-center">
                        {item.to === '/more' ? (
                          <MoreNavIcon
                            filled={isActive}
                            className={`size-[20px] transition-colors ${
                              isActive ? 'text-primary-ink' : 'text-muted group-hover:text-text'
                            }`}
                          />
                        ) : (
                          <item.icon
                            className={`size-[22px] transition-all duration-150 ${
                              isActive
                                ? 'text-primary-ink'
                                : item.isHero
                                  ? 'text-muted/90 group-hover:text-primary-ink'
                                  : 'text-muted group-hover:text-text'
                            }`}
                            strokeWidth={isActive ? 2.2 : 1.75}
                            fill={isActive ? 'currentColor' : 'none'}
                            fillOpacity={isActive ? 0.2 : 0}
                            aria-hidden
                          />
                        )}
                        {item.to === '/chat' && (
                          <>
                            <MobileChatBadge />
                            <LiveMeetIndicatorDot />
                          </>
                        )}
                        {item.to === '/projects' && <MobileProjectsBadge />}
                      </div>
                      <span
                        className={`text-[10.5px] leading-tight tracking-tight text-center truncate max-w-[66px] transition-all duration-150 ${
                          isActive
                            ? 'font-semibold text-primary-ink'
                            : item.isHero
                              ? 'font-medium text-muted/90'
                              : 'font-normal text-muted group-hover:text-text'
                        }`}
                      >
                        {item.label}
                      </span>
                    </div>
                  </NavLink>
                </motion.div>
              )
            })}
          </nav>
        </motion.div>
      </div>
    </div>
  )
}

function LiveMeetIndicatorDot() {
  const active = useActiveMeeting()
  if (!active) return null
  return (
    <span className="absolute -top-1 -right-1 flex size-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-primary" />
    </span>
  )
}

function HeaderWorkspaceBadge() {
  const ws = useCurrentWorkspace()
  return (
    <Link
      to="/more"
      className="group flex h-9 shrink-0 items-center gap-2 rounded-full border border-border bg-surface-raised pl-1.5 pr-3.5 text-text transition-all duration-150 hover:border-border-hover hover:bg-surface-hover active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      title={`Current team: ${ws.workspaceName}. Switch team`}
    >
      <span
        aria-hidden="true"
        className="flex size-[22px] shrink-0 select-none items-center justify-center rounded-[6px] border border-border/80 bg-surface font-sans text-[11px] font-bold leading-none text-text shadow-xs"
      >
        {ws.emoji || ws.workspaceName.slice(0, 1).toUpperCase()}
      </span>
      <span className="sr-only">Switch team, current: </span>
      <span className="max-w-[90px] min-[400px]:max-w-[120px] sm:max-w-[160px] truncate text-[14px] font-semibold leading-tight text-text">
        {ws.workspaceName}
      </span>
    </Link>
  )
}

function AccountMenu({ wide = false }: { wide?: boolean }) {
  return <AccountMenuDropdown wide={wide} />
}

function HeroTeamSelect() {
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
    <div ref={ref} className="relative inline-block text-left">
      <motion.div animate={open ? 'open' : 'closed'} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Switch active team"
          className="group flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1 text-caption font-medium text-text transition-all hover:bg-surface-hover hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]"
        >
          <motion.span variants={iconVariants} className="inline-flex shrink-0">
            <ChevronsUpDown
              className="size-3.5 text-muted transition-colors group-hover:text-primary-ink"
              aria-hidden
            />
          </motion.span>
          <span>Switch team</span>
        </button>

        <motion.div
          initial="closed"
          animate={open ? 'open' : 'closed'}
          variants={wrapperVariants}
          style={{
            originY: 0,
            pointerEvents: open ? 'auto' : 'none',
          }}
          className="absolute left-0 top-full mt-2 z-50 w-72 overflow-hidden rounded-[20px] border border-border bg-surface/98 p-1.5 shadow-2xl backdrop-blur-2xl"
        >
          <motion.div
            variants={itemVariants}
            className="px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase"
          >
            Your teams & workspaces
          </motion.div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {(list.data ?? [current]).map((ws) => {
              const isCurrent = ws.workspaceId === current.workspaceId
              return (
                <motion.button
                  key={ws.workspaceId}
                  variants={itemVariants}
                  type="button"
                  onClick={() => {
                    if (!isCurrent) void switchTo(ws.workspaceId)
                    setOpen(false)
                  }}
                  className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-left text-body-sm transition-colors ${
                    isCurrent
                      ? 'bg-primary/10 text-primary-ink font-semibold border border-primary/20'
                      : 'text-text hover:bg-surface-raised'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised border border-border text-[13px] font-bold text-text">
                      {ws.emoji || ws.workspaceName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <span className="truncate block font-medium leading-tight">
                        {ws.workspaceName}
                      </span>
                      <span className="text-[11px] text-muted block leading-tight">
                        {ws.memberCount} member{ws.memberCount === 1 ? '' : 's'}
                        {ws.role === 'owner' ? ' · owner' : ''}
                      </span>
                    </div>
                  </div>
                  {isCurrent ? <Check className="size-4 text-primary-ink shrink-0" /> : null}
                </motion.button>
              )
            })}
          </div>
          <motion.div variants={itemVariants} className="my-1 border-t border-border" />
          <motion.button
            variants={itemVariants}
            type="button"
            onClick={() => {
              setOpen(false)
              void navigate('/workspaces/new')
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-body-sm text-muted hover:bg-surface-raised hover:text-text transition-colors"
          >
            <Plus className="size-4 text-muted" /> New team workspace
          </motion.button>
          <motion.button
            variants={itemVariants}
            type="button"
            onClick={() => {
              setOpen(false)
              void navigate('/workspaces/join')
            }}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-body-sm text-muted hover:bg-surface-raised hover:text-text transition-colors"
          >
            <Link2 className="size-4 text-muted" /> Join with an invite link
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}

const moreRow =
  'flex items-center gap-3.5 px-4 py-3.5 min-h-[48px] text-[15px] font-medium text-text transition-all duration-150 hover:bg-surface-raised active:bg-surface-raised active:scale-[0.99]'

/** Mobile "More" page listing modules ordered by human psychology priority. */
export function MorePage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const ws = useCurrentWorkspace()
  const extra = primaryNav.filter((i) => !mobileNav.includes(i.to))
  const [pushStatus, setPushStatus] = useState<string | null>(null)

  useEffect(() => {
    void pushState().then((s) => setPushStatus(s === 'on' ? 'On' : 'Off'))
  }, [])

  return (
    <section aria-labelledby="more-title" className="space-y-5 pb-32">
      <h1 id="more-title" className="font-sans text-h1">
        More
      </h1>

      {/* Hero Workspace Card (styled after Opportunity / Project gallery card with cloud cover & moon phases) */}
      <article className="panel block p-0 rounded-2xl border border-border bg-surface shadow-card">
        {/* Atmospheric Cloud Cover */}
        <div className="relative overflow-hidden rounded-t-2xl">
          <AtmosphericCover className="h-28 sm:h-32 w-full" />

          {/* Moon Phase Sprint Track */}
          <div
            className="absolute bottom-4 right-5 sm:right-6 z-10 flex items-center gap-1 sm:gap-1.5 rounded-full border border-black/10 dark:border-white/10 bg-black/40 px-3 py-1.5 backdrop-blur-md max-[480px]:scale-90 max-[480px]:origin-right"
            aria-label="Workspace Sprint Cycle"
          >
            {[0, 0.1, 0.25, 0.38, 0.45, 0.5].map((phase, i) => {
              const isActive = i === 3
              const isPassed = i < 3
              return (
                <div key={i} className="flex items-center gap-1 sm:gap-1.5">
                  <span className={isPassed || isActive ? '' : 'opacity-40'}>
                    <MoonDot phase={phase} active={isActive} size={18} />
                  </span>
                  {i < 5 && (
                    <span
                      aria-hidden
                      className={`h-0.5 w-2 sm:w-2.5 rounded-full max-[480px]:hidden ${
                        isPassed
                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 shadow-[0_0_6px_rgba(240,168,52,0.6)]'
                          : 'bg-white/15'
                      }`}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Card Body */}
        <div className="relative px-5 sm:px-6 pb-6">
          {/* Floating Avatar Row */}
          <div className="-mt-9 mb-3">
            <div className="relative z-10 flex size-14 sm:size-16 items-center justify-center rounded-full border border-border bg-surface-raised font-sans text-2xl font-bold text-text shadow-xl">
              {ws.workspaceName.slice(0, 1).toUpperCase()}
            </div>
          </div>

          {/* Title & Info */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl sm:text-2xl font-bold tracking-tight text-text leading-tight">
                {ws.workspaceName}
              </h2>
            </div>
          </div>

          {/* Bottom Status & Quick Action Bar */}
          <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-caption text-muted">
            <HeroTeamSelect />
            <Link
              to="/settings/workspace"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-muted hover:text-text transition-colors"
            >
              Manage <ChevronRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </article>

      {/* 2. Top Priority: Identity & Workspace Settings */}
      <div className="space-y-2">
        <p className="px-1 text-caption font-semibold tracking-wider text-muted uppercase">
          Settings & Identity
        </p>
        <nav
          aria-label="Account Settings"
          className="panel divide-y divide-border overflow-hidden p-0 rounded-[20px]"
        >
          <Link to="/settings/profile" className={moreRow}>
            <CircleUser className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-medium">Edit Profile</span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
          <Link to="/more/notifications" className={moreRow}>
            <Bell className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-medium">Notifications</span>
            {pushStatus ? <span className="text-caption text-muted mr-1">{pushStatus}</span> : null}
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
          <Link to="/settings/workspace" className={moreRow}>
            <Users className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
            <span className="flex-1 font-medium">Workspace settings</span>
            <ChevronRight className="size-4 text-muted" aria-hidden />
          </Link>
        </nav>
      </div>

      {/* 3. Personal & Hackathon Workspace Modules */}
      <div className="space-y-2">
        <p className="px-1 text-caption font-semibold tracking-wider text-muted uppercase">
          Workspace & Tools
        </p>
        <nav
          aria-label="More"
          className="panel divide-y divide-border overflow-hidden p-0 rounded-[20px]"
        >
          {extra.map((item) => (
            <Link key={item.to} to={item.to} className={moreRow}>
              <item.icon className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
              <span className="flex-1">{item.label}</span>
              <ChevronRight className="size-4 text-muted" aria-hidden />
            </Link>
          ))}
        </nav>
      </div>

      {/* 4. Data & Recycle Bin + Logout */}
      <nav
        aria-label="Account"
        className="panel divide-y divide-border overflow-hidden p-0 rounded-[20px]"
      >
        <Link to="/settings/data" className={moreRow}>
          <Database className="size-5 text-muted" strokeWidth={1.75} aria-hidden />
          <span className="flex-1 text-muted hover:text-text">Your data and recycle bin</span>
          <ChevronRight className="size-4 text-muted" aria-hidden />
        </Link>
        <button
          type="button"
          onClick={async () => {
            await signOut()
            void navigate('/auth/sign-in')
          }}
          className={`${moreRow} w-full text-left text-danger transition-colors hover:bg-danger-subtle`}
        >
          <LogOut className="size-5 text-danger" strokeWidth={1.75} aria-hidden />
          <span className="flex-1 text-[15px] font-medium">Log out</span>
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

/** Unread badge counter for mobile bottom navigation. */
function MobileChatBadge() {
  useChatRealtime()
  const unread = useChatUnread()
  const n = unread.data ?? 0
  if (!n) return null
  return (
    <span
      className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-bg leading-none shadow-sm"
      aria-label={`${n} unread`}
    >
      {n > 9 ? '9+' : n}
    </span>
  )
}

/** Actionable badge counter for mobile Projects tab (never shows empty badge). */
function MobileProjectsBadge() {
  const myTasks = useMyTasks()
  const pending = myTasks.data?.filter((t) => t.status !== 'done' && !t.deleted_at).length ?? 0
  if (!pending) return null
  return (
    <span
      className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-surface-raised border border-border px-1 text-[9px] font-bold text-text leading-none shadow-sm"
      aria-label={`${pending} actionable tasks`}
    >
      {pending > 9 ? '9+' : pending}
    </span>
  )
}
