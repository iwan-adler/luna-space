import { Check, ChevronDown, Gift, Monitor, Moon, Settings, Sun } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '@/components/ui/Avatar'
import { iconVariants, itemVariants, wrapperVariants } from '@/components/ui/staggered-variants'
import { useAuth } from '@/features/auth'
import { useMyProfile } from '@/features/profile'
import { useCurrentWorkspace, useMyWorkspaces, useSwitchWorkspace } from '@/features/workspace'
import { readThemePreference, saveThemePreference, type ThemePreference } from '@/lib/theme'

export function AccountMenuDropdown({
  wide = false,
  placement = 'auto',
}: {
  wide?: boolean
  placement?: 'top' | 'bottom' | 'auto'
}) {
  const { user, signOut } = useAuth()
  const profile = useMyProfile()
  const currentWs = useCurrentWorkspace()
  const myWorkspaces = useMyWorkspaces()
  const switchTo = useSwitchWorkspace()
  const navigate = useNavigate()

  const [open, setOpen] = useState(false)
  const [theme, setTheme] = useState<ThemePreference>(readThemePreference)
  const containerRef = useRef<HTMLDivElement>(null)

  const name = profile.data?.display_name || user?.email?.split('@')[0] || 'Account'
  const email = user?.email || ''

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
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

  const handleThemeChange = (newTheme: ThemePreference) => {
    setTheme(newTheme)
    saveThemePreference(newTheme)
  }

  // Header triggers pop downward, aligned to the right
  const isUpward = placement === 'top'
  const dropdownPositionClass = isUpward
    ? 'bottom-full mb-2 origin-bottom-right right-0'
    : 'top-full mt-2 origin-top-right right-0'

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <motion.div animate={open ? 'open' : 'closed'} className="relative">
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-label={wide ? undefined : `${name}, account menu`}
          className={`group flex items-center gap-2 text-body-sm transition-all focus:outline-none ${
            wide
              ? 'w-full rounded-xl p-2 hover:bg-surface-raised border border-transparent hover:border-border'
              : 'rounded-full p-1 hover:bg-surface-raised'
          }`}
        >
          <Avatar src={profile.data?.avatar_path} name={name} size="sm" className="shadow-sm" />
          {wide ? (
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="sr-only">Account menu: </span>
              <span className="block truncate font-semibold text-text">{name}</span>
              <span className="block truncate text-caption text-muted">{email}</span>
            </span>
          ) : null}
          <motion.span variants={iconVariants} className="inline-flex shrink-0">
            <ChevronDown className="size-3.5 text-muted transition-colors group-hover:text-primary-ink" />
          </motion.span>
        </button>

        {/* Dropdown Menu Card with Signature Staggered Animation */}
        <motion.div
          initial="closed"
          animate={open ? 'open' : 'closed'}
          variants={wrapperVariants}
          style={{
            originY: isUpward ? 1 : 0,
            pointerEvents: open ? 'auto' : 'none',
          }}
          className={`absolute z-50 w-[290px] overflow-hidden rounded-[24px] border border-border bg-surface/98 p-[10px] text-text shadow-2xl backdrop-blur-2xl ${dropdownPositionClass}`}
        >
          {/* 1. Profile Identity Header */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between gap-3 px-3 py-2"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Avatar
                src={profile.data?.avatar_path}
                name={name}
                size="md"
                className="shadow-sm border border-border"
              />
              <div className="min-w-0">
                <div className="truncate text-[15px] font-bold text-text leading-tight">{name}</div>
                <div className="truncate text-[12px] text-muted leading-tight mt-0.5">{email}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                navigate('/settings/profile')
              }}
              className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-raised hover:text-text"
              title="Edit profile"
              aria-label="Edit profile"
            >
              <Settings className="size-4" />
            </button>
          </motion.div>

          <motion.div variants={itemVariants} className="my-2 border-t border-border" />

          {/* 2. Workspaces Section */}
          <motion.div variants={itemVariants} className="px-1">
            <div className="px-2 pt-0.5 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
              Workspaces
            </div>
            <div className="space-y-1">
              {myWorkspaces.data?.map((w) => {
                const isCurrent = w.workspaceId === currentWs.workspaceId
                return (
                  <button
                    key={w.workspaceId}
                    type="button"
                    onClick={() => {
                      if (!isCurrent) {
                        void switchTo(w.workspaceId)
                      }
                      setOpen(false)
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-3 py-2 text-left text-body-sm font-medium transition-colors ${
                      isCurrent
                        ? 'bg-primary-subtle text-primary-ink font-semibold'
                        : 'text-text hover:bg-surface-raised'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-surface-raised text-[11px] font-bold text-text">
                        {w.emoji || w.workspaceName.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate text-[14px]">{w.workspaceName}</span>
                    </div>
                    {isCurrent ? <Check className="size-4 text-primary-ink shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={itemVariants} className="my-2 border-t border-border" />

          {/* 3. Action Links */}
          <div className="space-y-0.5 px-1">
            <motion.div variants={itemVariants}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/settings/workspace')
                }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[14px] font-medium text-text transition-colors hover:bg-surface-raised"
              >
                <Gift className="size-4 text-muted" />
                <span>Referral</span>
              </button>
            </motion.div>
          </div>

          <motion.div variants={itemVariants} className="my-2 border-t border-border" />

          {/* 4. Bottom Row: Theme Control on Left, Log out on Right */}
          <motion.div
            variants={itemVariants}
            className="flex items-center justify-between px-2 py-1"
          >
            <div className="flex items-center rounded-xl border border-border bg-surface-raised p-1">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`rounded-lg p-1.5 transition-colors ${
                  theme === 'light'
                    ? 'bg-surface text-primary-ink shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
                title="Light mode"
                aria-label="Light mode"
              >
                <Sun className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`rounded-lg p-1.5 transition-colors ${
                  theme === 'dark'
                    ? 'bg-surface text-primary-ink shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
                title="Dark mode"
                aria-label="Dark mode"
              >
                <Moon className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`rounded-lg p-1.5 transition-colors ${
                  theme === 'system'
                    ? 'bg-surface text-primary-ink shadow-sm'
                    : 'text-muted hover:text-text'
                }`}
                title="Match system"
                aria-label="Match system"
              >
                <Monitor className="size-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={async () => {
                setOpen(false)
                await signOut()
                void navigate('/auth/sign-in')
              }}
              className="px-2 py-1.5 text-[14px] font-medium text-muted transition-colors hover:text-text"
            >
              Log out
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  )
}
