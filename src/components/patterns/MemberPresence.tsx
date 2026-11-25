import type { ReactNode } from 'react'
import { Avatar } from '@/components/ui/Avatar'

export interface MemberPresenceProps {
  displayName?: string | null
  avatarPath?: string | null
  isOnline?: boolean
  status?: 'online' | 'offline' | 'away' | 'busy'
  statusText?: string
  size?: 'sm' | 'md'
  nameHeadingLevel?: 'h1' | 'h2' | 'h3' | 'p' | 'span'
  nameId?: string
  className?: string
  nameClassName?: string
  statusClassName?: string
  badge?: ReactNode
  cutoutClass?: string
  onClick?: () => void
}

/**
 * Modern, iOS-inspired team member row & presence display.
 * Displays avatar with soft tinted monogram, cut-in status dot with pulse,
 * clear typography (15-16px name, 13px status line), and zero duplicate bullet dots.
 */
export function MemberPresence({
  displayName,
  avatarPath,
  isOnline = false,
  status: statusProp,
  statusText: statusTextProp,
  size = 'md',
  nameHeadingLevel: Heading = 'span',
  nameId,
  className = '',
  nameClassName = '',
  statusClassName = '',
  badge,
  cutoutClass = 'ring-2 ring-surface',
  onClick,
}: MemberPresenceProps) {
  const currentStatus = statusProp ?? (isOnline ? 'online' : 'offline')
  const defaultLabel =
    currentStatus === 'online'
      ? 'Online'
      : currentStatus === 'away'
        ? 'Away'
        : currentStatus === 'busy'
          ? 'Busy'
          : 'Offline'
  const displayStatus = statusTextProp ?? defaultLabel

  const isOffline = currentStatus === 'offline'
  const isAvailable = currentStatus === 'online'

  // Dot size: ~12-14px for md (size-3 to size-3.5), ~10-12px for sm
  const dotSizeClass = size === 'md' ? 'size-3 sm:size-3.5' : 'size-2.5 sm:size-3'

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 min-w-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Avatar Container with cut-in status dot and offline opacity */}
      <div className="relative shrink-0">
        <div
          className={`transition-opacity duration-200 ${isOffline ? 'opacity-75' : 'opacity-100'}`}
        >
          <Avatar
            src={avatarPath}
            name={displayName}
            size={size}
            variant="soft"
            className="shadow-sm"
          />
        </div>

        {/* Status Dot: Cut into the avatar with surface ring */}
        <span
          className={`absolute -bottom-0.5 -right-0.5 flex ${dotSizeClass} items-center justify-center`}
          title={displayStatus}
        >
          {isAvailable ? (
            <>
              {/* Soft slow pulse ring for active presence */}
              <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping motion-reduce:hidden" />
              <span
                className={`relative inline-flex size-full rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.35)] ${cutoutClass}`}
              />
            </>
          ) : currentStatus === 'away' ? (
            <span
              className={`relative inline-flex size-full rounded-full bg-amber-500 ${cutoutClass}`}
            />
          ) : currentStatus === 'busy' ? (
            <span
              className={`relative inline-flex size-full rounded-full bg-rose-500 ${cutoutClass}`}
            />
          ) : (
            <span
              className={`relative inline-flex size-full rounded-full bg-neutral-500/70 ${cutoutClass}`}
            />
          )}
        </span>
      </div>

      {/* Typography: Name and Status Line (no duplicate dot) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <Heading
            id={nameId}
            className={`block truncate text-[15px] sm:text-[16px] font-semibold text-text leading-tight ${nameClassName}`}
          >
            {displayName || 'Member'}
          </Heading>
          {badge}
        </div>
        <p
          className={`truncate text-[13px] font-normal text-muted leading-tight mt-[2px] ${statusClassName}`}
        >
          {displayStatus}
        </p>
      </div>
    </div>
  )
}
