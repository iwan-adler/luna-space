import { useQuery } from '@tanstack/react-query'
import {
  Check,
  CornerUpLeft,
  FileText,
  Paperclip,
  Pencil,
  Send,
  SmilePlus,
  Trash2,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { PageSpinner, Spinner } from '@/components/ui/Spinner'
import { controlClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import { Markdown } from '@/features/notes'
import { useMyProfile, useUpdateProfile, useViewerTimeZone } from '@/features/profile'
import { formatBytes, signedFileUrl } from '@/lib/files'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { formatDateOnly, utcIsoToZonedLocal } from '@/lib/dates'
import { messageForCode, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import {
  markChatRead,
  useChatRealtime,
  useEditMessage,
  useMessages,
  usePresence,
  useReadStates,
  useSendMessage,
  useToggleReaction,
  type Attachment,
  type Message,
} from './hooks'

/** Plain text for quotes and previews (no formatting marks). */
const plain = (s: string) =>
  s
    .replace(/[*_`>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()

const QUICK = ['👍', '❤️', '😂', '🎉', '😮', '🙏']
const AVAILABILITY = {
  available: 'Available',
  busy: 'Busy',
  focus: 'Focusing',
  away: 'Away',
} as const
type Availability = keyof typeof AVAILABILITY
const ACCEPT =
  'image/png,image/jpeg,image/webp,image/gif,application/pdf,text/plain,text/markdown,text/csv,application/zip,.docx,.xlsx,.pptx,.odt'

/** /chat — the workspace's conversation, for two people or a whole group (FR-CHAT-01–08, ADR 0018). */
export function ChatPage() {
  const { user } = useAuth()
  const { workspaceId, workspaceName } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const others = members.data?.filter((m) => m.userId !== user?.id) ?? []
  const group = others.length > 1
  // In a two-person workspace the header shows the other person, as before.
  const partner = group ? undefined : others[0]
  const messages = useMessages()
  const reads = useReadStates()
  const online = usePresence()
  const tz = useViewerTimeZone()
  useChatRealtime()

  const partnerProfile = useQuery({
    queryKey: ['chat', 'partner-profile', partner?.userId],
    enabled: Boolean(partner),
    queryFn: async () => {
      const { data } = await requireSupabase()
        .from('profiles')
        .select('availability')
        .eq('id', partner!.userId)
        .maybeSingle()
      return data
    },
    refetchInterval: 60_000,
  })

  const list = useMemo(() => [...(messages.data?.pages.flat() ?? [])].reverse(), [messages.data])
  const byId = useMemo(() => new Map(list.map((m) => [m.id, m])), [list])
  const rows = useMemo(
    () =>
      list.map((m, i) => {
        const day = utcIsoToZonedLocal(m.created_at, tz).slice(0, 10)
        const prev = list[i - 1]
        const showDay = !prev || utcIsoToZonedLocal(prev.created_at, tz).slice(0, 10) !== day
        const showSender = !prev || prev.sender_id !== m.sender_id || showDay
        return { m, day, showDay, showSender }
      }),
    [list, tz],
  )
  // "Seen" goes under my latest message that someone else has read; in a group it names them.
  const readAt = (uid: string) => reads.data?.find((r) => r.user_id === uid)?.last_read_at ?? null
  const lastMineSeen = [...list].reverse().find(
    (m) =>
      m.sender_id === user?.id &&
      others.some((o) => {
        const at = readAt(o.userId)
        return at !== null && m.created_at <= at
      }),
  )
  const seenLabel = (() => {
    if (!lastMineSeen) return null
    if (!group) return 'Seen'
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
    void markChatRead(newest.id)
  }, [newest])
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && newest) void markChatRead(newest.id)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [newest])

  // Stay at the bottom as messages arrive, unless the person scrolled up to read.
  const scroller = useRef<HTMLDivElement>(null)
  const atBottom = useRef(true)
  useEffect(() => {
    const el = scroller.current
    if (el && atBottom.current) el.scrollTop = el.scrollHeight
  }, [list.length])

  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [editing, setEditing] = useState<Message | null>(null)
  const nameOf = (id: string | null) =>
    id === user?.id
      ? 'You'
      : (members.data?.find((m) => m.userId === id)?.displayName ?? 'Former member')

  const partnerOnline = partner ? online.has(partner.userId) : false
  const onlineCount = others.filter((o) => online.has(o.userId)).length
  const status = (partnerProfile.data?.availability ?? 'available') as Availability

  return (
    <section
      aria-labelledby="chat-title"
      className="flex h-[calc(100dvh-12rem)] flex-col gap-3 lg:h-[calc(100dvh-8.5rem)]"
    >
      <header className="flex items-center gap-3">
        {group ? (
          <span className="flex shrink-0 -space-x-2.5" aria-hidden>
            {others.slice(0, 4).map((o) => (
              <span
                key={o.userId}
                className="btn-primary relative grid size-9 place-items-center rounded-full border-2 border-bg text-body-sm font-semibold"
              >
                {o.displayName.slice(0, 1).toUpperCase()}
                <span
                  className={`absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-bg ${online.has(o.userId) ? 'bg-success' : 'bg-neutral'}`}
                />
              </span>
            ))}
          </span>
        ) : (
          <span className="btn-primary relative grid size-11 shrink-0 place-items-center rounded-full font-semibold">
            {(partner?.displayName ?? '?').slice(0, 1).toUpperCase()}
            <span
              aria-hidden
              className={`absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-bg ${partnerOnline ? 'bg-success' : 'bg-neutral'}`}
            />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 id="chat-title" className="truncate text-h2">
            {group ? workspaceName : partner ? partner.displayName : 'Chat'}
          </h1>
          <p className="text-caption text-muted" data-testid="partner-status">
            {group
              ? `${others.length + 1} members · ${onlineCount} online now`
              : partner
                ? `${partnerOnline ? 'Online' : 'Offline'} · ${AVAILABILITY[status]}`
                : 'Invite someone to start chatting'}
          </p>
        </div>
        <MyAvailability />
      </header>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget
          atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        className="panel flex-1 space-y-1 overflow-y-auto p-4"
        data-testid="chat-messages"
      >
        {messages.isPending ? (
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
            {rows.map(({ m, day, showDay, showSender }) => {
              return (
                <Fragment key={m.id}>
                  {showDay ? (
                    <p className="py-2 text-center text-caption text-muted">
                      {formatDateOnly(day, { weekday: true })}
                    </p>
                  ) : null}
                  <Bubble
                    message={m}
                    mine={m.sender_id === user?.id}
                    reply={m.reply_to_id ? (byId.get(m.reply_to_id) ?? null) : null}
                    replyName={(id) => nameOf(id)}
                    time={utcIsoToZonedLocal(m.created_at, tz).slice(11)}
                    seen={m.id === lastMineSeen?.id ? seenLabel : null}
                    sender={
                      group && showSender && m.sender_id !== user?.id ? nameOf(m.sender_id) : null
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

      <Composer
        replyTo={replyTo}
        editing={editing}
        replyName={nameOf}
        onDone={() => {
          setReplyTo(null)
          setEditing(null)
          atBottom.current = true
        }}
      />
    </section>
  )
}

function MyAvailability() {
  const profile = useMyProfile()
  const update = useUpdateProfile()
  const value = (profile.data?.availability ?? 'available') as Availability
  return (
    <label className="flex items-center gap-2 text-caption text-muted">
      <span className="hidden sm:inline">Your status</span>
      <select
        aria-label="Your status"
        className={`${controlClass} py-1.5`}
        value={value}
        onChange={(e) => update.mutate({ availability: e.target.value as Availability })}
      >
        {Object.entries(AVAILABILITY).map(([k, l]) => (
          <option key={k} value={k}>
            {l}
          </option>
        ))}
      </select>
    </label>
  )
}

function Bubble({
  message: m,
  mine,
  reply,
  replyName,
  time,
  seen,
  sender,
  myId,
  onReply,
  onEdit,
}: {
  message: Message
  mine: boolean
  reply: Message | null
  replyName: (id: string | null) => string
  time: string
  seen: string | null
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
  for (const r of m.reactions) {
    const c = counts.get(r.emoji) ?? { n: 0, mine: false }
    c.n++
    if (r.user_id === myId) c.mine = true
    counts.set(r.emoji, c)
  }
  const toggle = (emoji: string) =>
    react.mutate({ messageId: m.id, emoji, on: !counts.get(emoji)?.mine })

  return (
    <div
      className={`group flex ${mine ? 'justify-end' : 'justify-start'}`}
      data-testid="chat-message"
    >
      <div className={`flex max-w-[82%] flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
        {sender ? (
          <span className="px-1 pt-1 text-caption font-medium text-highlight">{sender}</span>
        ) : null}
        <div className="relative">
          <div
            className={`rounded-[18px] px-3.5 py-2 text-body-sm ${mine ? 'btn-primary rounded-br-[6px]' : 'rounded-bl-[6px] border border-hairline bg-surface-raised'} ${deleted ? 'opacity-60' : ''}`}
          >
            {reply ? (
              <p
                className={`mb-1.5 border-l-2 pl-2 text-caption ${mine ? 'border-white/50 text-white/85' : 'border-primary/60 text-muted'}`}
              >
                <span className="font-medium">{replyName(reply.sender_id)}</span>:{' '}
                {reply.deleted_at ? 'Message deleted' : plain(reply.body ?? 'File').slice(0, 90)}
              </p>
            ) : null}
            {deleted ? (
              <p className="italic">Message deleted</p>
            ) : (
              <>
                {m.body ? <Markdown body={m.body} /> : null}
                {m.files
                  .filter((f) => !f.deleted_at && f.upload_state === 'stored')
                  .map((f) => (
                    <FileChip key={f.id} file={f} />
                  ))}
              </>
            )}
          </div>
          {!deleted ? (
            <div
              className={`absolute -top-3 hidden gap-0.5 rounded-full border border-hairline bg-surface-raised p-0.5 shadow-2 group-focus-within:flex group-hover:flex ${mine ? 'right-2' : 'left-2'}`}
            >
              <button
                type="button"
                aria-label="Reply"
                className="icon-btn size-7 border-0"
                onClick={onReply}
              >
                <CornerUpLeft className="size-3.5" aria-hidden />
              </button>
              <button
                type="button"
                aria-label="React"
                className="icon-btn size-7 border-0"
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
                      className="icon-btn size-7 border-0"
                      onClick={onEdit}
                    >
                      <Pencil className="size-3.5" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    aria-label="Delete message"
                    className="icon-btn size-7 border-0"
                    onClick={() => edit.mutate({ id: m.id, deleted: true })}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
          {picking ? (
            <div
              className={`absolute top-6 z-10 flex gap-1 rounded-full border border-hairline bg-surface-raised p-1 shadow-2 ${mine ? 'right-0' : 'left-0'}`}
              role="group"
              aria-label="Pick a reaction"
            >
              {QUICK.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-label={`React ${e}`}
                  className="grid size-8 place-items-center rounded-full text-[18px] hover:bg-hairline"
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
        </div>
        {counts.size ? (
          <div className="flex flex-wrap gap-1">
            {[...counts.entries()].map(([emoji, c]) => (
              <button
                key={emoji}
                type="button"
                aria-pressed={c.mine}
                aria-label={`${emoji} ${c.n}`}
                onClick={() => toggle(emoji)}
                className={`rounded-full border px-2 py-0.5 text-caption ${c.mine ? 'border-primary/60 bg-primary-subtle' : 'border-hairline'}`}
              >
                {emoji} {c.n}
              </button>
            ))}
          </div>
        ) : null}
        <p className="px-1 text-[10px] text-muted">
          {time}
          {m.edited_at && !deleted ? ' · edited' : ''}
          {seen ? (
            <span data-testid="seen" className="ml-1 inline-flex items-center gap-0.5">
              · <Check className="size-3" aria-hidden /> {seen}
            </span>
          ) : null}
        </p>
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
}: {
  replyTo: Message | null
  editing: Message | null
  replyName: (id: string | null) => string
  onDone: () => void
}) {
  const send = useSendMessage()
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
    if (file && file.size > 25 * 1024 * 1024)
      return toast.show('Files can be up to 25 MB.', 'error')
    const draft = { body, replyTo: replyTo?.id ?? null, file }
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

  return (
    <div className="panel space-y-2 p-2.5">
      {replyTo || editing ? (
        <div className="flex items-center gap-2 rounded-[12px] bg-hairline px-3 py-1.5 text-caption text-muted">
          <span className="min-w-0 flex-1 truncate">
            {editing
              ? 'Editing your message'
              : `Replying to ${replyName(replyTo!.sender_id)}: ${plain(replyTo!.body ?? 'File').slice(0, 80)}`}
          </span>
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => {
              setText(editing ? '' : text)
              setEditingId(null)
              onDone()
            }}
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      {file ? (
        <div className="flex items-center gap-2 rounded-[12px] bg-hairline px-3 py-1.5 text-caption">
          <Paperclip className="size-3.5" aria-hidden />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button type="button" aria-label="Remove attachment" onClick={() => setFile(null)}>
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      ) : null}
      <form
        className="flex items-end gap-2"
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
          <button
            type="button"
            aria-label="Attach a file"
            className="icon-btn size-10 shrink-0"
            onClick={() => fileInput.current?.click()}
          >
            <Paperclip className="size-4" aria-hidden />
          </button>
        )}
        <textarea
          ref={area}
          aria-label="Message"
          rows={1}
          value={text}
          maxLength={8000}
          placeholder="Write a message"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault()
              submit()
            }
          }}
          className="field-sizing-content max-h-40 min-h-10 flex-1 resize-none rounded-[14px] border border-hairline bg-transparent px-3.5 py-2.5 text-body-sm outline-none focus-visible:border-primary/50"
        />
        <Button
          type="submit"
          aria-label={editing ? 'Save edit' : 'Send'}
          className="size-10 shrink-0 px-0"
          disabled={send.isPending && Boolean(file)}
        >
          {send.isPending && file ? (
            <Spinner className="size-4" />
          ) : editing ? (
            <Check className="size-4" aria-hidden />
          ) : (
            <Send className="size-4" aria-hidden />
          )}
        </Button>
      </form>
    </div>
  )
}
