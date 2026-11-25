import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronRight,
  CornerUpLeft,
  FileText,
  Globe,
  Hash,
  Lock,
  MessageSquare,
  Paperclip,
  Pencil,
  Pin,
  SmilePlus,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { Avatar } from '@/components/ui/Avatar'
import { MemberPresence } from '@/components/patterns/MemberPresence'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { Markdown } from '@/features/notes'
import { useActiveMeeting } from '@/features/projects'
import { ChatMeetSegmentedToggle } from './ChatMeetSegmentedToggle'
import { StudioMeetView } from './StudioMeetView'
import { LinkCard } from './LinkCard'
import { Sticker, StickerPicker } from './Sticker'
import { PollCard, PollDialog } from './Poll'

import { pollOf } from './polls'
import { stickerById, stickerOf } from './stickers'
import { firstLink } from './links'
import { useViewerTimeZone } from '@/features/profile'
import { formatBytes, signedFileUrl } from '@/lib/files'
import { useCurrentWorkspace, useMembers, type Member } from '@/features/workspace'
import { formatDateOnly, format12HourTime, utcIsoToZonedLocal } from '@/lib/dates'
import { messageForCode, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import {
  markChatRead,
  useChatRealtime,
  useEditMessage,
  useChatUnreadDetail,
  useMessages,
  type MessageTarget,
  usePresence,
  useTyping,
  useReadStates,
  useSendMessage,
  useToggleReaction,
  type Attachment,
  type Message,
  useSendSticker,
} from './hooks'

/** Plain text for quotes and previews (no formatting marks). */
const plain = (s: string) =>
  s
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const QUICK = ['👍', '❤️', '😂', '🎉', '😮', '🙏']
const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/zip,.docx,.xlsx,.pptx,.odt'

interface SavedNote {
  id: string
  body: string
  created_at: string
}

function useSavedMessages(userId?: string) {
  const key = `luna.saved_chat.${userId ?? 'me'}`
  const [notes, setNotes] = useState<SavedNote[]>(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored) {
        const parsed: SavedNote[] = JSON.parse(stored)
        const cleaned = parsed.filter(
          (n) => n.id !== 'saved-init' && !n.body.includes('Welcome to your Saved Messages'),
        )
        if (cleaned.length !== parsed.length) {
          localStorage.setItem(key, JSON.stringify(cleaned))
        }
        return cleaned
      }
    } catch {
      // fallback
    }
    return []
  })

  const save = (body: string) => {
    const next = [
      ...notes,
      {
        id: `saved-${Date.now()}`,
        body,
        created_at: new Date().toISOString(),
      },
    ]
    setNotes(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {
      // ignore
    }
  }

  return { notes, save }
}

/** Unread private messages from one person. */
function UnreadDot({ count }: { count: number }) {
  if (!count) return null
  return (
    <span
      data-testid="dm-unread"
      className="ml-1 grid min-w-5 shrink-0 place-items-center rounded-full bg-btn-primary px-1.5 text-[11px] font-semibold text-on-btn-primary"
    >
      {count}
      <span className="sr-only"> unread</span>
    </span>
  )
}

/** Telegram-style Saved Messages bookmark avatar. */
export function SavedMessagesIcon({ className = 'size-8' }: { className?: string }) {
  return (
    <div
      className={`relative inline-flex shrink-0 items-center justify-center rounded-full bg-[#2AABEE] text-white shadow-sm select-none ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="size-[54%] text-white"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        <line x1="5.5" y1="12" x2="18.5" y2="12" strokeWidth="1.2" strokeOpacity="0.45" />
      </svg>
    </div>
  )
}

interface OnlineMembersBadgeProps {
  onlineIds: Set<string>
  members: Member[]
  currentUserId?: string
  onSelectMember?: (userId: string) => void
}

/** Professional online members counter pill with soft pulse and member list popover. */
function OnlineMembersBadge({
  onlineIds,
  members,
  currentUserId,
  onSelectMember,
}: OnlineMembersBadgeProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const count = onlineIds.size

  const onlineMembersList = useMemo(() => {
    const list = members.filter((m) => onlineIds.has(m.userId))
    if (list.length === 0 && currentUserId && onlineIds.has(currentUserId)) {
      return [
        {
          userId: currentUserId,
          displayName: 'You',
          avatarPath: null,
          role: 'member' as const,
          seat: 0,
          joinedAt: new Date().toISOString(),
        },
      ]
    }
    return list.sort((a, b) => {
      if (a.userId === currentUserId) return -1
      if (b.userId === currentUserId) return 1
      return a.displayName.localeCompare(b.displayName)
    })
  }, [members, onlineIds, currentUserId])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        buttonRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const fullLabel =
    count === 0 ? 'No one online' : `${count} ${count === 1 ? 'member' : 'members'} online`

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title={fullLabel}
        className="group flex min-h-[36px] sm:min-h-0 items-center gap-1.5 sm:gap-2 rounded-full border border-border bg-surface-raised px-2.5 sm:px-3 py-1 text-caption font-medium text-text shadow-sm transition-all duration-150 hover:bg-surface-hover hover:border-border-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98] select-none cursor-pointer"
      >
        {/* Status Dot */}
        {count >= 1 ? (
          <span
            className="relative flex size-2 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-success shadow-[0_0_6px_var(--color-success)]" />
          </span>
        ) : (
          <span
            className="relative flex size-2 shrink-0 items-center justify-center"
            aria-hidden="true"
          >
            <span className="inline-flex size-2 rounded-full bg-muted/40" />
          </span>
        )}

        {/* Count & Label */}
        {count >= 1 ? (
          <span className="flex items-center gap-1">
            <motion.span
              key={count}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className="tabular-nums font-semibold"
            >
              {count}
            </motion.span>
            <span className="sr-only min-[380px]:not-sr-only">online</span>
          </span>
        ) : (
          <span className="text-muted font-normal">Offline</span>
        )}
      </button>

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -6 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            role="dialog"
            aria-label="Online team members"
            className="absolute right-0 top-full mt-2 z-50 w-64 overflow-hidden rounded-[20px] border border-border bg-surface/98 p-1.5 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between px-2.5 pt-1.5 pb-1 text-[11px] font-semibold tracking-wider text-muted uppercase">
              <span>Online Members</span>
              <span className="tabular-nums font-medium text-text">{count}</span>
            </div>

            <div className="my-1 border-t border-border/50" />

            <div className="space-y-0.5 max-h-56 overflow-y-auto">
              {onlineMembersList.map((m) => {
                const isMe = m.userId === currentUserId
                return (
                  <button
                    key={m.userId}
                    type="button"
                    disabled={isMe}
                    onClick={() => {
                      if (!isMe) {
                        onSelectMember?.(m.userId)
                        setIsOpen(false)
                      }
                    }}
                    className={`flex w-full items-center justify-between gap-2.5 rounded-xl px-2.5 py-1.5 text-left transition-colors ${
                      isMe
                        ? 'cursor-default'
                        : 'hover:bg-surface-raised cursor-pointer active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Avatar
                        src={m.avatarPath}
                        name={m.displayName}
                        size="sm"
                        className="shrink-0"
                      />
                      <div className="min-w-0 flex items-center gap-1.5 truncate">
                        <span className="truncate text-body-sm font-medium text-text">
                          {m.displayName}
                        </span>
                        {isMe && (
                          <span className="rounded-full bg-surface px-1.5 py-0.2 text-[10px] font-medium text-muted border border-border shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className="size-2 rounded-full bg-success shadow-[0_0_6px_var(--color-success)] shrink-0"
                      aria-hidden="true"
                    />
                  </button>
                )
              })}

              {onlineMembersList.length === 0 && (
                <div className="px-2.5 py-2 text-[12px] text-muted text-center italic">
                  No one online
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** /chat — Telegram-style workspace conversation with pinned team channel, saved messages, and edge-to-edge layout. */
export function ChatPage() {
  const { user } = useAuth()
  const { workspaceId, workspaceName } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const others = members.data?.filter((m) => m.userId !== user?.id) ?? []
  const [selectedChat, setSelectedChat] = useState<'all' | 'saved' | string>('all')
  const [mobileThreadOpen, setMobileThreadOpen] = useState(false)
  const [searchFilter, setSearchFilter] = useState('')
  const [showMembersDialog, setShowMembersDialog] = useState(false)

  const saved = useSavedMessages(user?.id)
  const selectedMember = others.find((o) => o.userId === selectedChat)
  const isGeneral = selectedChat === 'all'
  const isSaved = selectedChat === 'saved'

  // Editable Channel / Group Name (WhatsApp style)
  const channelTitleKey = `luna_channel_title_${workspaceId ?? 'default'}`
  const [channelTitle, setChannelTitle] = useState(() => {
    try {
      const stored = localStorage.getItem(`luna_channel_title_${workspaceId ?? 'default'}`)
      return stored ? stored.replace(/^#+\s*/, '') : 'General'
    } catch {
      return 'General'
    }
  })
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editingTitleValue, setEditingTitleValue] = useState(channelTitle)
  const [channelRenameLogs, setChannelRenameLogs] = useState<
    Array<{ id: string; oldName: string; newName: string; timestamp: string }>
  >(() => {
    try {
      const raw = localStorage.getItem(`luna_channel_renames_${workspaceId ?? 'default'}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const [prevWorkspaceId, setPrevWorkspaceId] = useState(workspaceId)
  if (workspaceId !== prevWorkspaceId) {
    setPrevWorkspaceId(workspaceId)
    try {
      const saved =
        localStorage.getItem(`luna_channel_title_${workspaceId ?? 'default'}`) || 'General'
      setChannelTitle(saved)
      setEditingTitleValue(saved)
      const raw = localStorage.getItem(`luna_channel_renames_${workspaceId ?? 'default'}`)
      setChannelRenameLogs(raw ? JSON.parse(raw) : [])
    } catch {
      setChannelTitle('General')
      setEditingTitleValue('General')
      setChannelRenameLogs([])
    }
  }

  const handleSaveTitle = () => {
    const trimmed = editingTitleValue.trim().replace(/^#\s*/, '')
    if (trimmed && trimmed !== channelTitle) {
      const old = channelTitle
      setChannelTitle(trimmed)
      try {
        localStorage.setItem(channelTitleKey, trimmed)
        const newLog = {
          id: `rename-${Date.now()}`,
          oldName: old,
          newName: trimmed,
          timestamp: new Date().toISOString(),
        }
        const nextLogs = [...channelRenameLogs, newLog]
        setChannelRenameLogs(nextLogs)
        localStorage.setItem(
          `luna_channel_renames_${workspaceId ?? 'default'}`,
          JSON.stringify(nextLogs),
        )
      } catch {
        // ignore
      }
    }
    setIsEditingTitle(false)
  }

  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const isSearchActive = isSearchFocused || searchFilter.trim().length > 0

  const searchLower = searchFilter.trim().toLowerCase()
  const matchingFrequent = searchLower
    ? others.filter((m) => m.displayName.toLowerCase().includes(searchLower))
    : others
  const showSavedInFrequent = !searchLower || 'saved messages'.includes(searchLower)

  // The conversation: the team chat (null) or your direct messages with one person (ADR 0024).
  const peer = selectedMember?.userId ?? null
  const messages = useMessages(peer)
  const reads = useReadStates()
  const unread = useChatUnreadDetail()
  // Private or public for the next DM; back to private when you switch conversations.
  const [dmPublic, setDmPublic] = useState(false)
  const [dmPeerShown, setDmPeerShown] = useState(peer)
  if (peer !== dmPeerShown) {
    setDmPeerShown(peer)
    setDmPublic(false)
  }
  const target: MessageTarget = peer ? { recipient: peer, isPrivate: !dmPublic } : null
  const rawPresence = usePresence()
  const online = useMemo(() => {
    const s = new Set(rawPresence)
    if (user?.id) s.add(user.id)
    return s
  }, [rawPresence, user])
  const typing = useTyping(peer)
  const tz = useViewerTimeZone()
  useChatRealtime()

  const list = useMemo(
    () =>
      [...(messages.data?.pages.flat() ?? [])]
        .filter((m) => !m.body?.includes('Mobile layout test message'))
        .reverse(),
    [messages.data],
  )
  const byId = useMemo(() => new Map(list.map((m) => [m.id, m])), [list])
  // The General row previews the team chat, whichever conversation is open.
  const teamMessages = useMessages(null)
  const latestMessage = teamMessages.data?.pages[0]?.[0]

  const rows = useMemo(
    () =>
      list.map((m, i) => {
        const day = utcIsoToZonedLocal(m.created_at, tz).slice(0, 10)
        const prev = list[i - 1]
        const next = list[i + 1]
        const showDay = !prev || utcIsoToZonedLocal(prev.created_at, tz).slice(0, 10) !== day

        const diffPrevMs = prev
          ? new Date(m.created_at).getTime() - new Date(prev.created_at).getTime()
          : Infinity
        const isConsecutive = Boolean(
          prev && prev.sender_id === m.sender_id && !showDay && diffPrevMs <= 2 * 60 * 1000,
        )
        const showSender = !isConsecutive

        const nextDay = next ? utcIsoToZonedLocal(next.created_at, tz).slice(0, 10) : null
        const diffNextMs = next
          ? new Date(next.created_at).getTime() - new Date(m.created_at).getTime()
          : Infinity
        const isLastOfGroup = Boolean(
          !next || next.sender_id !== m.sender_id || nextDay !== day || diffNextMs > 2 * 60 * 1000,
        )

        return { m, day, showDay, showSender, isConsecutive, isLastOfGroup }
      }),
    [list, tz],
  )

  // Read positions: in the team chat, each person's team position; in a DM, the other person's
  // position in your conversation.
  const readAt = (uid: string) =>
    reads.data?.find(
      (r) => r.user_id === uid && (peer ? r.peer_id === user?.id : r.peer_id === null),
    )?.last_read_at ?? null
  const readers = peer ? others.filter((o) => o.userId === peer) : others
  const lastMineSeen = [...list].reverse().find(
    (m) =>
      m.sender_id === user?.id &&
      readers.some((o) => {
        const at = readAt(o.userId)
        return at !== null && m.created_at <= at
      }),
  )
  const seenLabel = (() => {
    if (!lastMineSeen) return null
    if (!isGeneral) return 'Seen'
    const by = others.filter((o) => {
      const at = readAt(o.userId)
      return at !== null && lastMineSeen.created_at <= at
    })
    return by.length === others.length
      ? 'Seen by everyone'
      : `Seen by ${by.map((o) => o.displayName).join(', ')}`
  })()

  // Mark read when new messages arrive while the page is visible.
  const newest = list[list.length - 1]
  useEffect(() => {
    if (!newest || document.visibilityState !== 'visible') return
    void markChatRead(newest.id, peer)
  }, [newest, peer])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && newest) void markChatRead(newest.id, peer)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [newest, peer])

  // Stay at the bottom as messages arrive, unless the person scrolled up to read.
  const scroller = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)

  const scrollToBottom = () => {
    if (scroller.current) {
      scroller.current.scrollTop = scroller.current.scrollHeight
    }
  }

  useEffect(() => {
    const el = scroller.current
    if (el && atBottom.current) {
      el.scrollTop = el.scrollHeight
      const timer = setTimeout(() => {
        if (atBottom.current && scroller.current) {
          scroller.current.scrollTop = scroller.current.scrollHeight
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [list.length, saved.notes.length, selectedChat])

  // Initial load auto-scroll
  useEffect(() => {
    atBottom.current = true
    scrollToBottom()
    const timer = setTimeout(scrollToBottom, 100)
    return () => clearTimeout(timer)
  }, [selectedChat])

  // Routing view state: URL query param (?view=meet vs chat)
  const [searchParams, setSearchParams] = useSearchParams()
  const view: 'chat' | 'meet' = searchParams.get('view') === 'meet' ? 'meet' : 'chat'
  const withParam = searchParams.get('with')
  const [withHandled, setWithHandled] = useState<string | null>(null)
  if (withParam && withParam !== withHandled && others.some((o) => o.userId === withParam)) {
    setWithHandled(withParam)
    setSelectedChat(withParam)
  }

  const setView = useCallback(
    (nextView: 'chat' | 'meet') => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (nextView === 'meet') {
            next.set('view', 'meet')
          } else {
            next.delete('view')
          }
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const isMeetingActive = useActiveMeeting()

  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const nameOf = (id: string | null) =>
    id === user?.id
      ? 'You'
      : (members.data?.find((m) => m.userId === id)?.displayName ?? 'Former member')

  const filteredMembers = others.filter((m) =>
    m.displayName.toLowerCase().includes(searchFilter.toLowerCase()),
  )

  // Pinned Direct Messages / Chats
  const [pinnedChatIds, setPinnedChatIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(`luna_pinned_chats_${workspaceId ?? 'default'}`)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  const togglePinChat = (chatId: string) => {
    setPinnedChatIds((prev) => {
      const next = prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
      try {
        localStorage.setItem(`luna_pinned_chats_${workspaceId ?? 'default'}`, JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const pinnedSet = new Set(pinnedChatIds)
  const pinnedMembers = filteredMembers.filter((m) => pinnedSet.has(m.userId))
  const unpinnedMembers = filteredMembers.filter((m) => !pinnedSet.has(m.userId))

  return (
    <div className="flex h-full min-h-0 flex-1 w-full overflow-hidden bg-bg">
      {/* Telegram-style Left Sidebar: Chat list with Pinned All Members */}
      <aside
        className={`flex w-full flex-col border-r border-border bg-surface p-3 pb-[calc(var(--nav-h)+0.75rem)] lg:pb-3 sm:w-68 sm:flex lg:w-72 shrink-0 h-full min-h-0 ${
          mobileThreadOpen ? 'hidden' : 'flex'
        }`}
      >
        <div className="mb-2.5 flex items-center justify-between px-1">
          <div
            role="tablist"
            aria-label="Chats and Meeting Room mode"
            className="relative inline-flex items-center p-0.5 rounded-full bg-surface-raised border border-border shadow-inner"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view === 'chat'}
              onClick={() => setView('chat')}
              className={`relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                view === 'chat' ? 'text-primary-ink' : 'text-muted hover:text-text'
              }`}
            >
              {view === 'chat' && (
                <motion.div
                  layoutId="chatsMeetSidebarGlider"
                  className="absolute inset-0 rounded-full bg-surface shadow-sm border border-primary/25 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
                />
              )}
              <MessageSquare className="size-3" aria-hidden />
              <span>Chats</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === 'meet'}
              onClick={() => {
                setView('meet')
                setMobileThreadOpen(true)
              }}
              className={`relative z-10 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer ${
                view === 'meet' ? 'text-primary-ink' : 'text-muted hover:text-text'
              }`}
            >
              {view === 'meet' && (
                <motion.div
                  layoutId="chatsMeetSidebarGlider"
                  className="absolute inset-0 rounded-full bg-surface shadow-sm border border-primary/25 -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 32, mass: 0.8 }}
                />
              )}
              <Video className="size-3" aria-hidden />
              <span>Meet</span>
              {isMeetingActive && (
                <span className="relative flex size-1.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400 shadow-[0_0_4px_#34d399]" />
                </span>
              )}
            </button>
          </div>

          <OnlineMembersBadge
            onlineIds={online}
            members={members.data ?? []}
            currentUserId={user?.id}
            onSelectMember={(userId) => {
              setSelectedChat(userId)
              setMobileThreadOpen(true)
            }}
          />
        </div>

        {/* Search Input with Cut / Clear Button & Cancel Action */}
        <div className="mb-3 flex items-center gap-1.5">
          <div className="uiverse-search-group relative flex-1">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="uiverse-search-icon">
              <g>
                <path d="M21.53 20.47l-3.66-3.66C19.195 15.24 20 13.214 20 11c0-4.97-4.03-9-9-9s-9 4.03-9 9 4.03 9 9 9c2.215 0 4.24-.804 5.808-2.13l3.66 3.66c.147.146.34.22.53.22s.385-.073.53-.22c.295-.293.295-.767.002-1.06zM3.5 11c0-4.135 3.365-7.5 7.5-7.5s7.5 3.365 7.5 7.5-3.365 7.5-7.5 7.5-7.5-3.365-7.5-7.5z" />
              </g>
            </svg>
            <input
              type="text"
              role="searchbox"
              placeholder="Search chats, builders..."
              value={searchFilter}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => {
                setTimeout(() => {
                  if (!searchFilter.trim()) setIsSearchFocused(false)
                }, 180)
              }}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="uiverse-search-input !h-9 !text-xs !pl-8 !pr-8"
            />
            {searchFilter ? (
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setSearchFilter('')}
                className="absolute top-1/2 right-2 z-10 flex size-5 -translate-y-1/2 items-center justify-center rounded-full p-0.5 text-muted hover:bg-surface-raised hover:text-text"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
          {isSearchActive ? (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setIsSearchFocused(false)
                setSearchFilter('')
              }}
              className="text-xs font-semibold text-primary-ink hover:text-primary-hover px-1 transition-colors select-none"
            >
              Cancel
            </button>
          ) : null}
        </div>

        {/* Frequent Contacts Horizontal Carousel (shown immediately on focus / search) */}
        {isSearchActive && (showSavedInFrequent || matchingFrequent.length > 0) ? (
          <div className="mb-2 border-b border-border/50 pb-2">
            <div className="mb-1 flex items-center justify-between px-1 text-[10px] font-semibold text-muted">
              <span>Frequent contacts</span>
              {searchLower ? (
                <span className="text-[9px] text-primary-ink">
                  {matchingFrequent.length + (showSavedInFrequent ? 1 : 0)} found
                </span>
              ) : null}
            </div>
            <div className="-mx-1 flex items-center gap-2.5 overflow-x-auto px-2 py-1 [scrollbar-width:none]">
              {/* Circle 1: Saved Messages */}
              {showSavedInFrequent ? (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelectedChat('saved')
                    setMobileThreadOpen(true)
                    setIsSearchFocused(false)
                    setSearchFilter('')
                  }}
                  className="group flex shrink-0 flex-col items-center gap-1 text-center select-none focus:outline-none"
                >
                  <SavedMessagesIcon className="size-9 ring-1 ring-white/10 transition-all group-hover:scale-105" />
                  <span className="w-12 truncate text-[9px] font-medium text-text">Saved</span>
                </button>
              ) : null}

              {/* Circles 2..N: Matching Teammate Avatars */}
              {matchingFrequent.map((m) => {
                const isOnline = online.has(m.userId)
                return (
                  <button
                    key={m.userId}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setSelectedChat(m.userId)
                      setMobileThreadOpen(true)
                      setIsSearchFocused(false)
                      setSearchFilter('')
                    }}
                    className="group flex shrink-0 flex-col items-center gap-1 text-center select-none focus:outline-none"
                  >
                    <div className="relative flex size-9 items-center justify-center rounded-full bg-surface-raised font-semibold text-text shadow-sm ring-1 ring-border transition-all group-hover:scale-105">
                      <span className="text-xs">{m.displayName.slice(0, 1).toUpperCase()}</span>
                      <span
                        className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-surface ${
                          isOnline ? 'bg-success' : 'bg-neutral'
                        }`}
                      />
                    </div>
                    <span className="w-12 truncate text-[9px] font-medium text-text">
                      {m.displayName}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {/* Dynamic Sidebar View: Search Mode (Suggested Profiles) vs Normal Chat View */}
        {isSearchActive ? (
          <div className="flex-1 space-y-2 overflow-y-auto pr-0.5 pb-20 lg:pb-2 [scrollbar-width:thin]">
            <div>
              <div className="mb-1.5 flex items-center justify-between px-1.5 text-[9px] font-bold tracking-wider text-muted uppercase">
                <span>{searchLower ? 'Suggested Profiles' : 'Teammates'}</span>
                <span className="text-[10px] text-primary-ink">{filteredMembers.length} found</span>
              </div>
              {filteredMembers.length > 0 ? (
                <div className="space-y-1">
                  {filteredMembers.map((m) => {
                    const isOnline = online.has(m.userId)
                    const isSelected = selectedChat === m.userId
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setSelectedChat(m.userId)
                          setMobileThreadOpen(true)
                          setIsSearchFocused(false)
                          setSearchFilter('')
                        }}
                        className={`flex w-full items-center rounded-xl border p-2 text-left transition-colors ${
                          isSelected
                            ? 'border-primary/50 bg-surface-raised text-text shadow-sm'
                            : 'border-border/40 bg-surface-raised/40 hover:border-primary/40 hover:bg-surface-raised'
                        }`}
                      >
                        <MemberPresence
                          displayName={m.displayName}
                          avatarPath={m.avatarPath}
                          isOnline={isOnline}
                          size="sm"
                          nameClassName="text-xs font-semibold"
                          statusClassName="text-[10px]"
                          cutoutClass="ring-2 ring-surface"
                          className="w-full gap-2.5"
                        />
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="py-6 text-center text-caption text-muted">
                  No builders found matching &ldquo;{searchFilter}&rdquo;
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 space-y-0.5 overflow-y-auto pr-0.5 pb-20 lg:pb-3 [scrollbar-width:thin]">
            {/* Pinned Group Chats: Studio Meeting Room, General, Saved Messages & Any Pinned Chats */}
            <div className="mb-1.5">
              <div className="mb-0.5 flex items-center justify-between px-1.5 text-[9px] font-bold tracking-wider text-muted uppercase">
                <span>Pinned</span>
                <Pin className="size-2.5 text-primary-ink" />
              </div>

              {/* Pinned 1: Studio Meeting Room (Top) */}
              <button
                type="button"
                onClick={() => {
                  setView('meet')
                  setMobileThreadOpen(true)
                }}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors cursor-pointer ${
                  view === 'meet'
                    ? 'border border-primary/40 bg-surface-raised text-text shadow-sm'
                    : 'text-muted hover:bg-surface-raised hover:text-text'
                }`}
              >
                <div className="relative flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                  <Video className="size-4" />
                  {isMeetingActive && (
                    <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-text">
                      Studio Meeting Room
                    </span>
                    {isMeetingActive && (
                      <span className="text-[9px] font-bold text-emerald-400 shrink-0 uppercase tracking-wider">
                        Live
                      </span>
                    )}
                  </div>
                  <p className="truncate text-[10px] text-muted">
                    {isMeetingActive
                      ? 'Call in progress · Click to join'
                      : 'Start or join video room'}
                  </p>
                </div>
              </button>

              {/* Pinned 2: General */}
              <button
                type="button"
                onClick={() => {
                  setSelectedChat('all')
                  setMobileThreadOpen(true)
                  setView('chat')
                }}
                className={`mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  isGeneral && view === 'chat'
                    ? 'border border-primary/40 bg-surface-raised text-text shadow-sm'
                    : 'text-muted hover:bg-surface-raised hover:text-text'
                }`}
              >
                <div className="flex size-7.5 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary-ink">
                  <Hash className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-text">
                      {channelTitle.replace(/^#+\s*/, '') || 'General'}
                    </span>
                    {latestMessage ? (
                      <span className="text-[9px] text-muted shrink-0">
                        {format12HourTime(
                          utcIsoToZonedLocal(latestMessage.created_at, tz).slice(11),
                        )}
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-[10px] text-muted">
                    {latestMessage
                      ? plain(latestMessage.body ?? 'Shared attachment')
                      : `${others.length + 1} members`}
                  </p>
                </div>
              </button>

              {/* Pinned 3: Saved Messages */}
              <button
                type="button"
                onClick={() => {
                  setSelectedChat('saved')
                  setMobileThreadOpen(true)
                  setView('chat')
                }}
                className={`mt-0.5 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                  isSaved && view === 'chat'
                    ? 'border border-primary/40 bg-surface-raised text-text shadow-sm'
                    : 'text-muted hover:bg-surface-raised hover:text-text'
                }`}
              >
                <SavedMessagesIcon className="size-7.5 shadow-sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-text">Saved Messages</span>
                  </div>
                  <p className="truncate text-[10px] text-muted">
                    {saved.notes[saved.notes.length - 1]?.body ?? 'Private notes & drafts'}
                  </p>
                </div>
              </button>

              {/* Pinned 4+: Any additional pinned chats */}
              {pinnedMembers.map((m) => {
                const isSelected = selectedChat === m.userId
                const isOnline = online.has(m.userId)
                return (
                  <div key={m.userId} className="group/item relative mt-0.5 flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChat(m.userId)
                        setMobileThreadOpen(true)
                        setView('chat')
                      }}
                      className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left transition-colors pr-7 ${
                        isSelected && view === 'chat'
                          ? 'border border-primary/40 bg-surface-raised text-text shadow-sm'
                          : 'text-muted hover:bg-surface-raised hover:text-text'
                      }`}
                    >
                      <MemberPresence
                        displayName={m.displayName}
                        avatarPath={m.avatarPath}
                        isOnline={isOnline}
                        statusText={isOnline ? 'Online now' : 'Offline'}
                        size="sm"
                        nameClassName="text-xs font-medium"
                        statusClassName="text-[10px]"
                        cutoutClass="ring-2 ring-surface"
                        className="w-full gap-2.5"
                      />
                      <UnreadDot count={unread.data?.byPeer[m.userId] ?? 0} />
                    </button>
                    <button
                      type="button"
                      title="Unpin chat"
                      aria-label={`Unpin ${m.displayName}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePinChat(m.userId)
                      }}
                      className="absolute right-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 text-primary-ink hover:text-primary-hover rounded cursor-pointer"
                    >
                      <Pin className="size-3 fill-primary" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Direct Messages with Teammates */}
            <div className="pt-1">
              <div className="mb-0.5 px-1.5 text-[9px] font-bold tracking-wider text-muted uppercase">
                Direct Messages
              </div>
              {unpinnedMembers.map((m) => {
                const isSelected = selectedChat === m.userId
                const isOnline = online.has(m.userId)
                return (
                  <div key={m.userId} className="group/item relative flex items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedChat(m.userId)
                        setMobileThreadOpen(true)
                        setView('chat')
                      }}
                      className={`flex w-full items-center rounded-lg px-2 py-1.5 text-left transition-colors pr-7 ${
                        isSelected && view === 'chat'
                          ? 'border border-primary/40 bg-surface-raised text-text shadow-sm'
                          : 'text-muted hover:bg-surface-raised hover:text-text'
                      }`}
                    >
                      <MemberPresence
                        displayName={m.displayName}
                        avatarPath={m.avatarPath}
                        isOnline={isOnline}
                        statusText={isOnline ? 'Online now' : 'Offline'}
                        size="sm"
                        nameClassName="text-xs font-medium"
                        statusClassName="text-[10px]"
                        cutoutClass="ring-2 ring-surface"
                        className="w-full gap-2.5"
                      />
                      <UnreadDot count={unread.data?.byPeer[m.userId] ?? 0} />
                    </button>
                    <button
                      type="button"
                      title="Pin chat"
                      aria-label={`Pin ${m.displayName}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        togglePinChat(m.userId)
                      }}
                      className="absolute right-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity p-1 text-muted hover:text-primary-ink rounded cursor-pointer"
                    >
                      <Pin className="size-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </aside>

      {/* Main Chat Thread Area: Full spacious canvas */}
      <section
        aria-labelledby="chat-title"
        className={`flex min-w-0 flex-1 flex-col bg-bg h-full min-h-0 ${
          mobileThreadOpen ? 'flex' : 'hidden sm:flex'
        }`}
      >
        {/* Header: Chat info + Direct Google Meet Action */}
        <header className="border-b border-border bg-surface px-4 sm:px-6 sm:pr-[calc(1.5rem+10.4px)] py-3 shrink-0">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileThreadOpen(false)}
                className="sm:hidden -ml-1 mr-1 p-1 text-muted hover:text-text"
                aria-label="Back to conversations"
              >
                <ArrowLeft className="size-5" />
              </button>

              {isGeneral ? (
                <>
                  <button
                    type="button"
                    onClick={() => setShowMembersDialog(true)}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary-ink transition-all hover:bg-primary/30 active:scale-95 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary"
                    title="View team members"
                    aria-label="View team members"
                  >
                    <Hash className="size-5" />
                  </button>

                  <div className="min-w-0">
                    {isEditingTitle ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          handleSaveTitle()
                        }}
                        className="flex items-center gap-1.5 flex-wrap"
                      >
                        <input
                          type="text"
                          value={editingTitleValue}
                          onChange={(e) => setEditingTitleValue(e.target.value)}
                          autoFocus
                          aria-label="Chat name (only you see it)"
                          className="rounded-md border border-primary/50 bg-surface px-2 py-0.5 text-body font-semibold text-text outline-none focus:ring-1 focus:ring-primary max-w-44 sm:max-w-xs"
                          placeholder="Chat name (only you see it)"
                        />
                        <button
                          type="submit"
                          className="rounded p-1 text-success hover:bg-surface-raised"
                          title="Save chat name"
                        >
                          <Check className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTitleValue(channelTitle)
                            setIsEditingTitle(false)
                          }}
                          className="rounded p-1 text-muted hover:bg-surface-raised hover:text-text"
                          title="Cancel"
                        >
                          <X className="size-4" />
                        </button>
                        <span className="text-muted/60 select-none">·</span>
                        <span className="truncate text-body font-medium text-muted select-none">
                          {workspaceName}
                        </span>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowMembersDialog(true)}
                        className="text-left group/header hover:opacity-90 transition-opacity focus-visible:outline-none cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h1
                            id="chat-title"
                            className="truncate text-body font-semibold text-text group-hover/header:text-primary-ink transition-colors"
                          >
                            {channelTitle}
                          </h1>
                          <span className="text-muted/60 select-none">·</span>
                          <span
                            className="truncate text-body font-medium text-muted select-none"
                            title={workspaceName}
                          >
                            {workspaceName}
                          </span>
                        </div>
                        <p
                          data-testid="partner-status"
                          className="truncate text-caption text-muted transition-colors group-hover/header:text-text"
                        >
                          {others.length + 1} members · {online.size} online
                        </p>
                      </button>
                    )}
                  </div>
                </>
              ) : isSaved ? (
                <>
                  <SavedMessagesIcon className="size-9 shadow-sm" />
                  <div className="min-w-0">
                    <h1 id="chat-title" className="truncate text-body font-semibold text-text">
                      Saved Messages
                    </h1>
                  </div>
                </>
              ) : (
                <MemberPresence
                  displayName={selectedMember?.displayName ?? 'Chat'}
                  avatarPath={selectedMember?.avatarPath}
                  isOnline={Boolean(selectedMember && online.has(selectedMember.userId))}
                  size="md"
                  nameHeadingLevel="h1"
                  nameId="chat-title"
                />
              )}
            </div>

            {/* Header Action: Segmented [ Chat | Meet ] toggle on sm+ screens */}
            <div className="hidden sm:flex items-center shrink-0">
              <ChatMeetSegmentedToggle
                view={view}
                onViewChange={setView}
                isMeetingActive={isMeetingActive}
              />
            </div>
          </div>
        </header>

        {/* Mobile Segmented [ Chat | Meet ] toggle directly under header */}
        <div className="sm:hidden px-3 py-2 border-b border-border bg-surface shrink-0">
          <ChatMeetSegmentedToggle
            view={view}
            onViewChange={setView}
            isMeetingActive={isMeetingActive}
            fullWidth
          />
        </div>

        {/* Slim Banner: Meeting in progress - Join (only shown in Chat view when meeting is live) */}
        {isMeetingActive && view === 'chat' && (
          <div
            role="alert"
            onClick={() => setView('meet')}
            className="flex items-center justify-between gap-2 px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20 text-caption font-medium text-emerald-300 cursor-pointer hover:bg-emerald-500/15 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex size-2 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
              </span>
              <span className="truncate">Meeting in progress</span>
            </div>
            <span className="flex items-center gap-1 font-semibold text-emerald-400 hover:underline shrink-0 text-xs">
              Join <ChevronRight className="size-3.5" />
            </span>
          </div>
        )}

        {/* Content Panes: BOTH MOUNTED to keep calls/state alive */}
        <div className="relative flex-1 min-h-0 w-full overflow-hidden">
          {/* 1. Chat Pane */}
          <div
            id="panel-chat"
            role="tabpanel"
            aria-labelledby="tab-chat"
            inert={view !== 'chat'}
            className={`absolute inset-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              view === 'chat'
                ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
                : 'opacity-0 -translate-x-8 pointer-events-none z-0'
            }`}
          >
            {/* Message Stream */}
            <div
              ref={scroller}
              onScroll={(e) => {
                const el = e.currentTarget
                atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
              }}
              className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-6 sm:pb-8 [scrollbar-width:thin]"
              data-testid="chat-messages"
            >
              {isSaved ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-info/30 bg-info-subtle p-3 text-caption text-text">
                    <strong>Saved Messages</strong> are kept in this browser on this device only.
                    Use a note for anything you want on your other devices or to share.
                  </div>
                  {saved.notes.map((n) => (
                    <div key={n.id} className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl rounded-br-sm border border-border bg-surface-raised p-3 text-body-sm text-text shadow-sm">
                        <p className="whitespace-pre-wrap">{n.body}</p>
                        <p className="mt-1 text-right text-[10px] text-muted">
                          {format12HourTime(utcIsoToZonedLocal(n.created_at, tz).slice(11))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : messages.isPending ? (
                <PageSpinner label="Loading messages" />
              ) : messages.error ? (
                <Alert tone="danger">Couldn&apos;t load messages.</Alert>
              ) : (
                <>
                  {messages.hasNextPage ? (
                    <div className="flex justify-center pb-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={messages.isFetchingNextPage}
                        onClick={() => {
                          atBottom.current = false
                          void messages.fetchNextPage()
                        }}
                      >
                        Load earlier messages
                      </Button>
                    </div>
                  ) : null}
                  {list.length === 0 ? (
                    <p className="py-10 text-center text-body-sm text-muted">
                      No messages yet. Say hello 👋
                    </p>
                  ) : null}
                  {selectedMember ? (
                    <p className="mb-3 flex items-center justify-center gap-1.5 text-center text-caption text-muted">
                      <Lock className="size-3.5" aria-hidden />
                      Private messages here are seen only by you and {selectedMember.displayName}.
                    </p>
                  ) : null}
                  {rows.map(({ m, day, showDay, showSender, isConsecutive, isLastOfGroup }) => {
                    return (
                      <Fragment key={m.id}>
                        {showDay ? (
                          <div className="flex justify-center my-4">
                            <span className="inline-flex items-center rounded-full border border-border/50 bg-surface-raised/80 px-3 py-1 text-[12px] font-medium text-muted shadow-sm select-none">
                              {formatDateOnly(day, { weekday: true })}
                            </span>
                          </div>
                        ) : null}
                        <Bubble
                          message={m}
                          mine={m.sender_id === user?.id}
                          isConsecutive={isConsecutive}
                          isLastOfGroup={isLastOfGroup}
                          reply={m.reply_to_id ? (byId.get(m.reply_to_id) ?? null) : null}
                          replyName={(id) => nameOf(id)}
                          time={format12HourTime(utcIsoToZonedLocal(m.created_at, tz).slice(11))}
                          seen={m.id === lastMineSeen?.id ? seenLabel : null}
                          audience={
                            m.recipient_id
                              ? peer
                                ? m.is_private
                                  ? 'Private'
                                  : 'Public, also in team chat'
                                : `To ${nameOf(m.recipient_id)}`
                              : null
                          }
                          sender={
                            showSender && m.sender_id !== user?.id ? nameOf(m.sender_id) : null
                          }
                          myId={user?.id ?? ''}
                          onReply={() => {
                            setEditing(null)
                            setReplyTo(m)
                          }}
                          onEdit={() => {
                            setReplyTo(null)
                            setEditing(m)
                          }}
                        />
                      </Fragment>
                    )
                  })}
                </>
              )}
            </div>

            {/* Input Composer: aligned flush to bottom with clearance for bottom nav on mobile */}
            <div className="border-t border-border bg-surface p-3 sm:px-5 pb-[calc(var(--nav-h)+0.75rem)] lg:pb-3.5 shrink-0">
              <Composer
                replyTo={replyTo}
                editing={editing}
                replyName={nameOf}
                placeholder={isSaved ? 'Save a message, link or note...' : 'Write a message...'}
                onCustomSubmit={isSaved ? (b) => saved.save(b) : undefined}
                target={isSaved ? null : target}
                peerName={selectedMember?.displayName ?? null}
                onTogglePublic={setDmPublic}
                onTyping={typing.notify}
                typingLabel={
                  typing.typing.length === 0 || isSaved
                    ? null
                    : typing.typing.length === 1
                      ? `${nameOf(typing.typing[0]!)} is typing`
                      : `${typing.typing.length} people are typing`
                }
                onDone={() => {
                  setReplyTo(null)
                  setEditing(null)
                  atBottom.current = true
                  scrollToBottom()
                  setTimeout(scrollToBottom, 50)
                }}
              />
            </div>
          </div>

          {/* 2. Meet Pane: Stays continuously mounted so active calls/iframe never drop */}
          <div
            id="panel-meet"
            role="tabpanel"
            aria-labelledby="tab-meet"
            inert={view !== 'meet'}
            className={`absolute inset-0 flex flex-col transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
              view === 'meet'
                ? 'opacity-100 translate-x-0 pointer-events-auto z-10'
                : 'opacity-0 translate-x-8 pointer-events-none z-0'
            }`}
          >
            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 pb-[calc(var(--nav-h)+2.5rem)] lg:pb-10 [scrollbar-width:thin]">
              <StudioMeetView onlineIds={online} />
            </div>
          </div>
        </div>
      </section>

      {/* Team Members iOS Modal / Sheet */}
      <Dialog
        open={showMembersDialog}
        onOpenChange={setShowMembersDialog}
        title={`${channelTitle} · Members`}
        description={`${members.data?.length ?? 1} members in this workspace`}
        footer={
          <div className="flex items-center justify-between w-full pt-1">
            <Link
              to="/settings/workspace"
              onClick={() => setShowMembersDialog(false)}
              className="text-caption font-semibold text-primary-ink hover:underline inline-flex items-center gap-1"
            >
              Workspace Settings <ChevronRight className="size-3.5" />
            </Link>
            <button
              type="button"
              onClick={() => setShowMembersDialog(false)}
              className="btn-secondary rounded-full px-4 py-1.5 text-body-sm font-medium"
            >
              Done
            </button>
          </div>
        }
      >
        <div className="space-y-2 max-h-[55vh] overflow-y-auto py-1 pr-1">
          {(members.data ?? []).map((m) => {
            const isOnline = online.has(m.userId)
            const isMe = m.userId === user?.id
            return (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-3 p-3 rounded-2xl border border-border/80 bg-surface-raised/60 hover:bg-surface-raised transition-all"
              >
                <MemberPresence
                  displayName={m.displayName}
                  avatarPath={m.avatarPath}
                  isOnline={isOnline}
                  statusText={isOnline ? 'Active now' : 'Offline'}
                  size="md"
                  nameClassName="text-body-sm font-semibold"
                  statusClassName="text-[11px]"
                  badge={
                    <>
                      {isMe && (
                        <span className="rounded-full bg-surface px-1.5 py-0.2 text-[10px] font-medium text-muted border border-border">
                          You
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          m.role === 'owner'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-surface text-muted border border-border'
                        }`}
                      >
                        {m.role}
                      </span>
                    </>
                  }
                  className="flex-1"
                />
                {!isMe && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChat(m.userId)
                      setShowMembersDialog(false)
                      setMobileThreadOpen(true)
                    }}
                    className="btn-secondary rounded-full px-3 py-1.5 text-caption font-semibold transition-all active:scale-95 shrink-0"
                  >
                    Message
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </Dialog>
    </div>
  )
}

function Bubble({
  message: m,
  mine,
  isConsecutive = false,
  isLastOfGroup = true,
  reply,
  replyName,
  time,
  seen,
  audience = null,
  sender,
  myId,
  onReply,
  onEdit,
}: {
  message: Message
  mine: boolean
  isConsecutive?: boolean
  isLastOfGroup?: boolean
  reply: Message | null
  replyName: (id: string | null) => string
  time: string
  seen: string | null
  /** Who a direct message is for, or whether it is private (ADR 0024). */
  audience?: string | null
  sender: string | null
  myId: string
  onReply: () => void
  onEdit: () => void
}) {
  const react = useToggleReaction()
  const edit = useEditMessage()
  const [picking, setPicking] = useState(false)
  const deleted = Boolean(m.deleted_at)
  const counts = new Map<string, { n: number; mine: boolean }>()
  const reactionList = Array.isArray(m.reactions)
    ? m.reactions
    : m.reactions && typeof m.reactions === 'object'
      ? [m.reactions as { emoji: string; user_id: string }]
      : []
  for (const r of reactionList) {
    if (!r || typeof r !== 'object' || !('emoji' in r)) continue
    const c = counts.get(r.emoji) ?? { n: 0, mine: false }
    c.n++
    if (r.user_id === myId) c.mine = true
    counts.set(r.emoji, c)
  }
  const toggle = (emoji: string) =>
    react.mutate({ messageId: m.id, emoji, on: !counts.get(emoji)?.mine })

  const hasReactions = counts.size > 0

  return (
    <div
      className={`group flex ${mine ? 'justify-end' : 'justify-start'} ${
        isConsecutive ? 'mt-0.5' : 'mt-3'
      }`}
      data-testid="chat-message"
    >
      <div
        className={`flex max-w-[85%] sm:max-w-[75%] flex-col ${mine ? 'items-end' : 'items-start'}`}
      >
        {sender ? (
          <span className="px-2 pb-1 text-caption font-semibold text-primary/90 select-none">
            {sender}
          </span>
        ) : null}

        <div className={`relative ${hasReactions ? 'mb-3.5' : ''}`}>
          <div
            className={
              m.kind === 'poll' && !deleted
                ? 'rounded-[20px] border border-border/80 bg-surface-raised p-3.5 text-body-sm shadow-sm'
                : m.kind === 'sticker' && !deleted
                  ? `pop ${reply ? 'rounded-[20px] border border-border/80 bg-surface-raised p-3 shadow-sm' : 'p-1'}`
                  : `relative px-3.5 py-2.5 text-[14px] sm:text-[15px] leading-relaxed break-words [overflow-wrap:anywhere] shadow-sm transition-all ${
                      mine
                        ? 'bg-primary text-[var(--color-on-primary)] [color:var(--color-on-primary)] [&_p]:text-[var(--color-on-primary)] [&_a]:underline selection:bg-black/20'
                        : 'border border-border/70 bg-surface-raised text-text [&_p]:text-text selection:bg-primary/20'
                    } ${
                      isLastOfGroup
                        ? mine
                          ? 'rounded-[20px] rounded-br-[6px]'
                          : 'rounded-[20px] rounded-bl-[6px]'
                        : 'rounded-[20px]'
                    } ${deleted ? 'opacity-60 italic' : ''}`
            }
          >
            {/* Step 2: Nested Reply Quote Block Inside the Bubble */}
            {reply ? (
              <div
                className={`mb-2 rounded-[9px] border-l-[3px] px-2.5 py-1.5 text-[12.5px] leading-snug select-none ${
                  mine
                    ? 'border-white/90 bg-black/15 text-[var(--color-on-primary)]/90'
                    : 'border-primary bg-black/10 dark:bg-black/30 text-muted'
                }`}
              >
                <span
                  className={`block font-semibold truncate ${
                    mine ? 'text-[var(--color-on-primary)]' : 'text-primary-ink'
                  }`}
                >
                  {replyName(reply.sender_id)}
                </span>
                <span className="line-clamp-2 overflow-hidden text-ellipsis opacity-90 block">
                  {reply.deleted_at
                    ? 'Message deleted'
                    : reply.kind === 'poll'
                      ? `Poll: ${pollOf(reply.metadata)?.question ?? ''}`
                      : reply.kind === 'sticker'
                        ? `Sticker: ${stickerById(stickerOf(reply.metadata))?.caption ?? 'sticker'}`
                        : plain(reply.body ?? 'File')}
                </span>
              </div>
            ) : null}

            {deleted ? (
              <p className="italic">Message deleted</p>
            ) : (
              <>
                {m.kind === 'sticker' ? <Sticker id={stickerOf(m.metadata) ?? ''} /> : null}
                {m.kind === 'poll' ? <PollCard message={m} myId={myId} nameOf={replyName} /> : null}
                {m.body ? <Markdown body={m.body} /> : null}
                {m.body && firstLink(m.body) ? (
                  <LinkCard url={firstLink(m.body)!} mine={mine} />
                ) : null}
                {(Array.isArray(m.files) ? m.files : m.files ? [m.files] : [])
                  .filter((f) => f && !f.deleted_at && f.upload_state === 'stored')
                  .map((f) => (
                    <FileChip key={f.id} file={f} />
                  ))}
              </>
            )}
          </div>

          {/* Floating Hover Actions */}
          {!deleted ? (
            <div
              className={`absolute -top-9 z-20 hidden gap-0.5 rounded-full border border-border/80 bg-surface-raised p-0.5 shadow-md group-focus-within:flex group-hover:flex ${
                mine ? 'right-1' : 'left-1'
              }`}
            >
              <button
                type="button"
                aria-label="Reply"
                className="icon-btn size-7 border-0 hover:bg-surface-hover"
                onClick={onReply}
              >
                <CornerUpLeft className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="React"
                className="icon-btn size-7 border-0 hover:bg-surface-hover"
                onClick={() => setPicking((v) => !v)}
              >
                <SmilePlus className="size-3.5" aria-hidden />
              </button>
              {mine ? (
                <>
                  {m.kind === 'text' ? (
                    <button
                      type="button"
                      aria-label="Edit message"
                      className="icon-btn size-7 border-0 hover:bg-surface-hover"
                      onClick={onEdit}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Delete message"
                    className="icon-btn size-7 border-0 hover:bg-surface-hover text-danger hover:text-danger"
                    onClick={() => edit.mutate({ id: m.id, deleted: true })}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Quick Reaction Picker */}
          {picking ? (
            <div
              className={`absolute top-6 z-30 flex gap-1 rounded-full border border-border bg-surface-raised p-1 shadow-xl backdrop-blur-md ${
                mine ? 'right-0' : 'left-0'
              }`}
              role="group"
              aria-label="Pick a reaction"
            >
              {QUICK.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`React ${e}`}
                  className="grid size-8 place-items-center rounded-full text-[18px] hover:bg-surface-hover transition-transform active:scale-90"
                  onClick={() => {
                    toggle(e)
                    setPicking(false)
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          ) : null}

          {/* Step 3: Reactions Attached to Bubble Bottom Edge with 8px overlap */}
          {hasReactions ? (
            <div
              className={`absolute -bottom-2.5 z-10 flex flex-wrap gap-1 ${
                mine ? 'right-2 justify-end' : 'left-2 justify-start'
              }`}
            >
              {[...counts.entries()].map(([emoji, c]) => (
                <button
                  key={`${emoji}:${c.n}`}
                  type="button"
                  aria-pressed={c.mine}
                  aria-label={`${emoji} ${c.n}`}
                  onClick={() => toggle(emoji)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption font-medium shadow-sm transition-all duration-150 ring-2 ring-bg active:scale-95 cursor-pointer select-none ${
                    c.mine
                      ? 'border-primary/50 bg-primary/15 text-primary-ink'
                      : 'border-border bg-surface text-text hover:bg-surface-raised'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-[11px] font-semibold">{c.n}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Step 4: Timestamp under LAST bubble of a group */}
        {isLastOfGroup || audience ? (
          <div
            className={`mt-1 flex items-center gap-1 px-1 text-[11px] text-muted ${
              mine ? 'justify-end' : 'justify-start'
            }`}
          >
            {audience ? (
              <span data-testid="audience" className="inline-flex items-center gap-0.5">
                {audience === 'Private' ? (
                  <Lock className="size-3" aria-hidden />
                ) : (
                  <Globe className="size-3" aria-hidden />
                )}
                {audience}
                {isLastOfGroup ? ' ·' : ''}
              </span>
            ) : null}
            {isLastOfGroup ? <span>{time}</span> : null}
            {m.edited_at && !deleted ? <span>· edited</span> : null}
            {seen ? (
              <span data-testid="seen" className="inline-flex items-center gap-0.5">
                · <Check className="size-3" aria-hidden /> {seen}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FileChip({ file }: { file: Attachment }) {
  const toast = useToast()
  const [preview, setPreview] = useState<string | null>(null)
  const isImage = file.mime_type.startsWith('image/')
  useEffect(() => {
    if (!isImage) return
    let alive = true
    void requireSupabase()
      .storage.from('workspace-files')
      .createSignedUrl(file.storage_path, 3600)
      .then(({ data }) => alive && data && setPreview(data.signedUrl))
    return () => {
      alive = false
    }
  }, [file.storage_path, isImage])
  const open = async () => {
    try {
      window.open(await signedFileUrl(file.storage_path), '_blank', 'noopener')
    } catch {
      toast.show("Couldn't open the file.", 'error')
    }
  }
  return isImage && preview ? (
    <button
      type="button"
      onClick={() => void open()}
      className="mt-1 block"
      aria-label={`Open ${file.file_name}`}
    >
      <img src={preview} alt={file.file_name} className="max-h-60 max-w-full rounded-[12px]" />
    </button>
  ) : (
    <button
      type="button"
      onClick={() => void open()}
      className="mt-1 flex items-center gap-2 rounded-[12px] border border-white/15 bg-black/15 px-3 py-2 text-left"
    >
      <FileText className="size-4 shrink-0" aria-hidden />
      <span className="min-w-0">
        <span className="block truncate">{file.file_name}</span>
        <span className="block text-[10px] opacity-75">{formatBytes(file.size_bytes)}</span>
      </span>
    </button>
  )
}

function Composer({
  replyTo,
  editing,
  replyName,
  onDone,
  onTyping,
  typingLabel,
  placeholder = 'Write a message...',
  onCustomSubmit,
  target = null,
  peerName = null,
  onTogglePublic,
}: {
  replyTo: Message | null
  editing: Message | null
  replyName: (id: string | null) => string
  onDone: () => void
  onTyping: () => void
  typingLabel: string | null
  placeholder?: string
  onCustomSubmit?: (body: string) => void
  target?: MessageTarget
  peerName?: string | null
  onTogglePublic?: (on: boolean) => void
}) {
  const send = useSendMessage()
  const sendSticker = useSendSticker()
  const [polling, setPolling] = useState(0)

  const edit = useEditMessage()
  const toast = useToast()
  const [text, setText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const area = useRef<HTMLTextAreaElement>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  if (editing && editing.id !== editingId) {
    setEditingId(editing.id)
    setText(editing.body ?? '')
  }
  useEffect(() => {
    if (replyTo || editing) area.current?.focus()
  }, [replyTo, editing])

  const submit = () => {
    const body = text.trim()
    if (editing) {
      if (!body) return
      edit.mutate(
        { id: editing.id, body },
        {
          onSuccess: () => {
            setText('')
            setEditingId(null)
            onDone()
          },
        },
      )
      return
    }
    if (!body && !file) return
    if (onCustomSubmit) {
      onCustomSubmit(body)
      setText('')
      onDone()
      return
    }
    if (file && file.size > 25 * 1024 * 1024)
      return toast.show('Files can be up to 25 MB.', 'error')
    const draft = { body, replyTo: replyTo?.id ?? null, file, to: target }
    setText('')
    setFile(null)
    onDone()
    send.mutate(draft, {
      onError: (e) => {
        setText(draft.body)
        toast.show(messageForCode(toAppError(e).code, "Couldn't send the message."), 'error')
      },
    })
  }

  const hasContent = Boolean(text.trim() || file)

  return (
    <div className="w-full space-y-1.5">
      {target && peerName && !editing ? (
        <div className="flex items-center justify-between gap-2 px-1">
          <div
            role="radiogroup"
            aria-label="Who can see this message"
            className="inline-flex rounded-full border border-border bg-surface-raised p-0.5 text-caption"
          >
            {(
              [
                [true, 'Private', Lock],
                [false, 'Public', Globe],
              ] as const
            ).map(([isPrivate, label, Icon]) => (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={target.isPrivate === isPrivate}
                onClick={() => onTogglePublic?.(!isPrivate)}
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium transition-colors ${
                  target.isPrivate === isPrivate
                    ? 'bg-primary-subtle text-primary-ink'
                    : 'text-muted hover:text-text'
                }`}
              >
                <Icon className="size-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <span className="truncate text-caption text-muted" aria-live="polite">
            {target.isPrivate
              ? `Only you and ${peerName} will see it`
              : `Everyone in the team chat will see it, addressed to ${peerName}`}
          </span>
        </div>
      ) : null}
      {replyTo || editing ? (
        <div className="flex items-center gap-2 rounded-xl bg-surface-raised/90 border border-border/40 px-3 py-1.5 text-caption text-muted backdrop-blur-sm">
          <span className="min-w-0 flex-1 truncate text-xs">
            {editing
              ? 'Editing your message'
              : `Replying to ${replyName(replyTo!.sender_id)}: ${plain(replyTo!.body ?? 'File').slice(0, 80)}`}
          </span>
          <button
            type="button"
            title="Cancel"
            aria-label="Cancel"
            onClick={() => {
              setText(editing ? '' : text)
              setEditingId(null)
              onDone()
            }}
            className="rounded-full p-1 text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {file ? (
        <div className="inline-flex max-w-full items-center gap-2 rounded-xl bg-surface-raised/90 border border-border/40 px-3 py-1.5 text-caption text-text backdrop-blur-sm">
          <Paperclip className="size-3.5 shrink-0 text-primary-ink" aria-hidden />
          <span className="min-w-0 truncate text-xs font-medium">{file.name}</span>
          <button
            type="button"
            title="Remove attachment"
            aria-label="Remove attachment"
            onClick={() => setFile(null)}
            className="rounded-full p-0.5 text-muted hover:text-text hover:bg-surface transition-colors cursor-pointer"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {typingLabel ? (
        <p
          className="flex items-center gap-1.5 px-3 text-[11px] text-muted"
          aria-live="polite"
          data-testid="typing"
        >
          <span className="flex gap-0.5" aria-hidden>
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-1 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: `${i * 140}ms` }}
              />
            ))}
          </span>
          <span>{typingLabel}…</span>
        </p>
      ) : null}
      <form
        className="group relative flex items-end gap-1 sm:gap-1.5 p-1.5 rounded-[24px] border border-border/50 bg-surface/90 shadow-sm backdrop-blur-md transition-all duration-200 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/15"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <input
          ref={fileInput}
          type="file"
          hidden
          accept={ACCEPT}
          data-testid="chat-file-input"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            e.target.value = ''
          }}
        />
        {editing ? null : (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              title="Start a poll"
              aria-label="Start a poll"
              className="relative inline-flex size-9 min-h-[44px] min-w-[36px] items-center justify-center rounded-full text-muted transition-all duration-150 hover:bg-surface-raised hover:text-text active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer motion-reduce:transform-none"
              onClick={() => setPolling((n) => n + 1)}
            >
              <BarChart3 className="size-[19px] stroke-[1.85]" aria-hidden />
            </button>
            <button
              type="button"
              title="Attach a file"
              aria-label="Attach a file"
              className="relative inline-flex size-9 min-h-[44px] min-w-[36px] items-center justify-center rounded-full text-muted transition-all duration-150 hover:bg-surface-raised hover:text-text active:scale-[0.94] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-pointer motion-reduce:transform-none"
              onClick={() => fileInput.current?.click()}
            >
              <Paperclip className="size-[19px] stroke-[1.85]" aria-hidden />
            </button>
            {onCustomSubmit ? null : (
              <StickerPicker
                disabled={sendSticker.isPending}
                onPick={(id) =>
                  sendSticker.mutate(
                    { id, replyTo: replyTo?.id ?? null, to: target },
                    {
                      onSuccess: () => onDone(),
                      onError: (e) => toast.show(e.message, 'error'),
                    },
                  )
                }
              />
            )}
          </div>
        )}
        {polling ? <PollDialog key={polling} to={target} onClose={() => setPolling(0)} /> : null}
        <textarea
          ref={area}
          aria-label="Message"
          rows={1}
          value={text}
          maxLength={8000}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value)
            if (e.target.value.trim()) onTyping()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          className="field-sizing-content max-h-36 min-h-[36px] flex-1 resize-none border-0 bg-transparent px-2.5 py-1.5 text-base sm:text-[15px] leading-relaxed text-text placeholder:text-muted/60 outline-none focus:outline-none focus:ring-0 selection:bg-primary/25"
        />
        <div className="flex items-center shrink-0 mb-[1px]">
          <button
            type="submit"
            id="send"
            title={editing ? 'Save edit' : 'Send message'}
            aria-label={editing ? 'Save edit' : 'Send message'}
            disabled={!hasContent}
            className={`relative inline-flex size-[34px] min-h-[44px] min-w-[34px] items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 motion-reduce:transition-none motion-reduce:transform-none ${
              hasContent
                ? 'bg-primary text-white shadow-md scale-100 opacity-100 active:scale-[0.90] cursor-pointer'
                : 'bg-surface-raised/60 text-muted/30 opacity-40 cursor-not-allowed scale-[0.88] pointer-events-none'
            }`}
          >
            {send.isPending && file ? (
              <Spinner className="size-3.5 text-white" />
            ) : (
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 19V5M5 12l7-7 7 7" />
              </svg>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
