import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { useAuth } from '@/features/auth'
import { storagePath } from '@/lib/files'
import { useCurrentWorkspace } from '@/features/workspace'
import { AppError, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'

type Tables = Database['public']['Tables']
type MessageRow = Omit<Tables['messages']['Row'], 'search'>
export interface Attachment {
  id: string
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
  upload_state: string
  deleted_at: string | null
}
export type Message = MessageRow & {
  reactions: { user_id: string; emoji: string }[]
  files: Attachment[]
  votes: { user_id: string; option_index: number }[]
}
export type ReadState = Tables['chat_read_state']['Row']

const PAGE = 50
const COLUMNS =
  'id, workspace_id, sender_id, recipient_id, is_private, project_id, reply_to_id, kind, body, metadata, client_id, edited_at, deleted_at, created_at, reactions:message_reactions(user_id, emoji), files(id, file_name, mime_type, size_bytes, storage_path, upload_state, deleted_at), votes:poll_votes(user_id, option_index)'

/**
 * Who a message goes to (ADR 0024): null is the team chat; otherwise one person, either
 * privately (only the two of you) or publicly (also shown in the team chat).
 */
export type MessageTarget = { recipient: string; isPrivate: boolean } | null

const NIL = '00000000-0000-0000-0000-000000000000'

export const chatKeys = {
  all: ['chat'] as const,
  /** Every conversation of a workspace; add the peer for one conversation. */
  messages: (ws: string, peer?: string | null) =>
    peer === undefined
      ? (['chat', 'messages', ws] as const)
      : (['chat', 'messages', ws, peer ?? 'team'] as const),
  read: (ws: string) => ['chat', 'read', ws] as const,
  unread: (ws: string, uid: string | undefined) => ['chat', 'unread', ws, uid] as const,
}

const db = () => requireSupabase()

/**
 * One conversation, newest first, 50 per page; older pages load on demand (FR-CHAT-01).
 * `peer` null is the team chat (team messages and public DMs); a user id is your direct
 * conversation with that person (private and public). The database hides private messages
 * between other people either way.
 */
export function useMessages(peer: string | null = null) {
  const { workspaceId } = useCurrentWorkspace()
  const { user } = useAuth()
  const me = user?.id ?? NIL
  return useInfiniteQuery({
    queryKey: chatKeys.messages(workspaceId, peer),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Message[]> => {
      let q = db()
        .from('messages')
        .select(COLUMNS)
        .or(
          peer
            ? `and(sender_id.eq.${me},recipient_id.eq.${peer}),and(sender_id.eq.${peer},recipient_id.eq.${me})`
            : 'recipient_id.is.null,is_private.eq.false',
        )
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(PAGE)
      if (pageParam) q = q.lt('created_at', pageParam)
      const { data, error } = await q
      if (error) throw toAppError(error)
      return data as unknown as Message[]
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1]!.created_at : null),
  })
}

export function useReadStates() {
  const { workspaceId } = useCurrentWorkspace()
  return useQuery({
    queryKey: chatKeys.read(workspaceId),
    queryFn: async (): Promise<ReadState[]> => {
      const { data, error } = await db().from('chat_read_state').select('*')
      if (error) throw toAppError(error)
      return data
    },
  })
}

export interface ChatUnread {
  /** Unread in the team chat (team messages and public DMs). */
  team: number
  /** Unread private messages, by the person who sent them. */
  byPeer: Record<string, number>
  total: number
}

/** Unread messages from others, per conversation, after my read position in each. */
export function useChatUnreadDetail() {
  const { workspaceId } = useCurrentWorkspace()
  const { user } = useAuth()
  return useQuery({
    queryKey: chatKeys.unread(workspaceId, user?.id),
    enabled: Boolean(user),
    queryFn: async (): Promise<ChatUnread> => {
      const me = user!.id
      const { data: mine, error: readError } = await db()
        .from('chat_read_state')
        .select('peer_id, last_read_at')
        .eq('user_id', me)
      if (readError) throw toAppError(readError)
      const readAt = new Map((mine ?? []).map((r) => [r.peer_id ?? 'team', r.last_read_at]))

      let teamQ = db()
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', me)
        .is('deleted_at', null)
        .or('recipient_id.is.null,is_private.eq.false')
      const teamRead = readAt.get('team')
      if (teamRead) teamQ = teamQ.gt('created_at', teamRead)
      const { count, error } = await teamQ
      if (error) throw toAppError(error)

      const { data: dms, error: dmError } = await db()
        .from('messages')
        .select('sender_id, created_at')
        .eq('recipient_id', me)
        .eq('is_private', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(500)
      if (dmError) throw toAppError(dmError)
      const byPeer: Record<string, number> = {}
      for (const m of dms ?? []) {
        if (!m.sender_id) continue
        const seen = readAt.get(m.sender_id)
        if (!seen || m.created_at > seen) byPeer[m.sender_id] = (byPeer[m.sender_id] ?? 0) + 1
      }
      const team = count ?? 0
      return { team, byPeer, total: team + Object.values(byPeer).reduce((a, b) => a + b, 0) }
    },
  })
}

/** All unread messages for me (nav badge). */
export function useChatUnread() {
  const detail = useChatUnreadDetail()
  return { ...detail, data: detail.data?.total }
}

/** Columns for a message's recipient. */
const toColumns = (to: MessageTarget) =>
  to ? { recipient_id: to.recipient, is_private: to.isPrivate } : {}

export function useSendMessage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: {
      body: string
      replyTo: string | null
      file: File | null
      to?: MessageTarget
    }) => {
      const { data, error } = await db()
        .from('messages')
        .insert({
          workspace_id: workspaceId,
          sender_id: user!.id,
          ...toColumns(args.to ?? null),
          kind: args.file ? 'file' : 'text',
          body: args.body.trim() || null,
          reply_to_id: args.replyTo,
          client_id: crypto.randomUUID(),
        })
        .select('id')
        .single()
      if (error) throw toAppError(error)
      if (args.file) await uploadAttachment(workspaceId, user!.id, data.id, args.file)
      return data.id
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) })
    },
  })
}

/** Sends a sticker from the built-in pack (ADR 0021). */
export function useSendSticker() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: { id: string; replyTo: string | null; to?: MessageTarget }) => {
      const { error } = await db()
        .from('messages')
        .insert({
          workspace_id: workspaceId,
          sender_id: user!.id,
          ...toColumns(args.to ?? null),
          kind: 'sticker',
          body: null,
          metadata: { sticker: args.id },
          reply_to_id: args.replyTo,
          client_id: crypto.randomUUID(),
        })
      if (error) throw toAppError(error)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) })
    },
  })
}

/** Starts a poll: a question with 2–8 options (ADR 0021). */
export function useSendPoll() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: {
      question: string
      options: string[]
      multi: boolean
      to?: MessageTarget
    }) => {
      const { error } = await db()
        .from('messages')
        .insert({
          workspace_id: workspaceId,
          sender_id: user!.id,
          ...toColumns(args.to ?? null),
          kind: 'poll',
          body: null,
          metadata: { question: args.question, options: args.options, multi: args.multi },
          client_id: crypto.randomUUID(),
        })
      if (error) throw toAppError(error)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) })
    },
  })
}

/** Votes for an option, or takes the vote back. Single-choice polls move your vote. */
export function useVote() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: { messageId: string; option: number; on: boolean }) => {
      const table = db().from('poll_votes')
      const { error } = args.on
        ? await table.insert({
            workspace_id: workspaceId,
            message_id: args.messageId,
            user_id: user!.id,
            option_index: args.option,
          })
        : await table
            .delete()
            .eq('message_id', args.messageId)
            .eq('user_id', user!.id)
            .eq('option_index', args.option)
      if (error) throw toAppError(error)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) }),
  })
}

async function uploadAttachment(
  workspaceId: string,
  userId: string,
  messageId: string,
  file: File,
) {
  const id = crypto.randomUUID()
  const path = storagePath(workspaceId, id, file.name)
  const { error: rowError } = await db()
    .from('files')
    .insert({
      id,
      workspace_id: workspaceId,
      owner_id: userId,
      storage_path: path,
      file_name: file.name.slice(0, 255),
      mime_type: file.type,
      size_bytes: file.size,
      message_id: messageId,
    })
  if (rowError) throw toAppError(rowError)
  const { error: upError } = await db()
    .storage.from('workspace-files')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (upError) throw new AppError(`Upload failed: ${upError.message}`)
  const { error } = await db().rpc('confirm_upload', { p_file: id })
  if (error) throw toAppError(error)
}

export function useEditMessage() {
  const qc = useQueryClient()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: { id: string; body?: string; deleted?: boolean }) => {
      const patch = args.deleted
        ? { deleted_at: new Date().toISOString() }
        : { body: args.body!.trim() }
      const { error } = await db().from('messages').update(patch).eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) }),
  })
}

export function useToggleReaction() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: { messageId: string; emoji: string; on: boolean }) => {
      const table = db().from('message_reactions')
      const { error } = args.on
        ? await table.insert({
            workspace_id: workspaceId,
            message_id: args.messageId,
            user_id: user!.id,
            emoji: args.emoji,
          })
        : await table
            .delete()
            .eq('message_id', args.messageId)
            .eq('user_id', user!.id)
            .eq('emoji', args.emoji)
      if (error) throw toAppError(error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) }),
  })
}

/** Marks a conversation (the team chat, or your DMs with `peer`) read up to a message. */
export async function markChatRead(messageId: string, peer: string | null = null) {
  await db().rpc('mark_chat_read', { p_message: messageId, ...(peer ? { p_peer: peer } : {}) })
}

/** Live messages, reactions and read receipts (FR-CHAT-01, 06). */
export function useChatRealtime() {
  const qc = useQueryClient()
  const { workspaceId } = useCurrentWorkspace()
  useEffect(() => {
    const client = db()
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: chatKeys.messages(workspaceId) })
      void qc.invalidateQueries({ queryKey: ['chat', 'unread', workspaceId] })
    }
    const channel = client
      .channel(`chat:${workspaceId}:${crypto.randomUUID()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        refresh,
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, refresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'poll_votes' }, refresh)
      // Attachments finish uploading after their message arrives.
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'files',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        refresh,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_read_state',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: chatKeys.read(workspaceId) })
          void qc.invalidateQueries({ queryKey: ['chat', 'unread', workspaceId] })
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [qc, workspaceId])
}

type Channel = ReturnType<ReturnType<typeof requireSupabase>['channel']>
interface PresenceHub {
  channel: Channel
  online: Set<string>
  listeners: Set<() => void>
}
// One presence channel per workspace, shared by every component that asks who is online
// (supabase-js returns the same channel for the same topic, and it can be subscribed once).
const presenceHubs = new Map<string, PresenceHub>()
const nobody = new Set<string>()

function joinPresence(topic: string, userId: string): PresenceHub {
  const existing = presenceHubs.get(topic)
  if (existing) return existing
  // Private channel: Realtime admits only members of this workspace (migration 0025).
  const channel = db().channel(topic, { config: { private: true, presence: { key: userId } } })
  const hub: PresenceHub = { channel, online: nobody, listeners: new Set() }
  channel
    .on('presence', { event: 'sync' }, () => {
      hub.online = new Set(Object.keys(channel.presenceState()))
      hub.listeners.forEach((l) => l())
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') void channel.track({ at: new Date().toISOString() })
    })
  presenceHubs.set(topic, hub)
  return hub
}

/** Who is online right now, through Realtime presence (FR-CHAT-08). */
export function usePresence(): Set<string> {
  const { workspaceId } = useCurrentWorkspace()
  const { user } = useAuth()
  const userId = user?.id
  const topic = userId ? `presence:${workspaceId}` : null
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!topic || !userId) return () => undefined
      const hub = joinPresence(topic, userId)
      hub.listeners.add(onChange)
      return () => {
        hub.listeners.delete(onChange)
        if (hub.listeners.size === 0) {
          presenceHubs.delete(topic)
          void db().removeChannel(hub.channel)
        }
      }
    },
    [topic, userId],
  )
  return useSyncExternalStore(subscribe, () =>
    topic ? (presenceHubs.get(topic)?.online ?? nobody) : nobody,
  )
}

/**
 * "Ana is typing…" through a Realtime broadcast (nothing is stored). Only user ids travel;
 * names come from the member list. Returns who is typing and a throttled notifier.
 */
export function useTyping(peer: string | null = null): { typing: string[]; notify: () => void } {
  const { workspaceId } = useCurrentWorkspace()
  const { user } = useAuth()
  const [until, setUntil] = useState<Record<string, number>>({})
  const [now, setNow] = useState(() => Date.now())
  const channel = useRef<ReturnType<ReturnType<typeof requireSupabase>['channel']> | null>(null)
  const lastSent = useRef(0)
  useEffect(() => {
    if (!user) return
    const client = db()
    const ch = client.channel(`typing:${workspaceId}`, {
      config: { private: true, broadcast: { self: false } },
    })
    ch.on('broadcast', { event: 'typing' }, ({ payload }) => {
      const p = payload as { user_id?: string; to?: string | null }
      const id = p.user_id
      // Team chat: typing with no recipient; a DM: that person typing to me.
      const here = peer ? id === peer && p.to === user.id : !p.to
      if (id && id !== user.id && here) setUntil((u) => ({ ...u, [id]: Date.now() + 4000 }))
    }).subscribe()
    channel.current = ch
    const tick = window.setInterval(() => setNow(Date.now()), 1000)
    return () => {
      window.clearInterval(tick)
      void client.removeChannel(ch)
      channel.current = null
    }
  }, [workspaceId, user, peer])
  const notify = () => {
    const t = Date.now()
    if (!channel.current || !user || t - lastSent.current < 2500) return
    lastSent.current = t
    void channel.current.send({
      type: 'broadcast',
      event: 'typing',
      payload: { user_id: user.id, to: peer },
    })
  }
  return { typing: Object.keys(until).filter((id) => until[id]! > now), notify }
}
