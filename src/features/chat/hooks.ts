import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
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
}
export type ReadState = Tables['chat_read_state']['Row']

const PAGE = 50
const COLUMNS =
  'id, workspace_id, sender_id, project_id, reply_to_id, kind, body, metadata, client_id, edited_at, deleted_at, created_at, reactions:message_reactions(user_id, emoji), files(id, file_name, mime_type, size_bytes, storage_path, upload_state, deleted_at)'

export const chatKeys = {
  all: ['chat'] as const,
  messages: (ws: string) => ['chat', 'messages', ws] as const,
  read: (ws: string) => ['chat', 'read', ws] as const,
  unread: (ws: string, uid: string | undefined) => ['chat', 'unread', ws, uid] as const,
}

const db = () => requireSupabase()

/** Newest first, 50 per page; older pages load on demand (FR-CHAT-01). */
export function useMessages() {
  const { workspaceId } = useCurrentWorkspace()
  return useInfiniteQuery({
    queryKey: chatKeys.messages(workspaceId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }): Promise<Message[]> => {
      let q = db()
        .from('messages')
        .select(COLUMNS)
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

/** Messages from the partner after my last read position (nav badge). */
export function useChatUnread() {
  const { workspaceId } = useCurrentWorkspace()
  const { user } = useAuth()
  return useQuery({
    queryKey: chatKeys.unread(workspaceId, user?.id),
    enabled: Boolean(user),
    queryFn: async () => {
      const { data: mine } = await db()
        .from('chat_read_state')
        .select('last_read_at')
        .eq('user_id', user!.id)
        .maybeSingle()
      let q = db()
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', user!.id)
        .is('deleted_at', null)
      if (mine?.last_read_at) q = q.gt('created_at', mine.last_read_at)
      const { count, error } = await q
      if (error) throw toAppError(error)
      return count ?? 0
    },
  })
}

export function useSendMessage() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: async (args: { body: string; replyTo: string | null; file: File | null }) => {
      const { data, error } = await db()
        .from('messages')
        .insert({
          workspace_id: workspaceId,
          sender_id: user!.id,
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

export async function markChatRead(messageId: string) {
  await db().rpc('mark_chat_read', { p_message: messageId })
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

/** Who is online right now, through Realtime presence (FR-CHAT-08). */
export function usePresence(): Set<string> {
  const { workspaceId } = useCurrentWorkspace()
  const { user } = useAuth()
  const [online, setOnline] = useState<Set<string>>(new Set())
  useEffect(() => {
    if (!user) return
    const client = db()
    const channel = client.channel(`presence:${workspaceId}`, {
      config: { presence: { key: user.id } },
    })
    channel
      .on('presence', { event: 'sync' }, () =>
        setOnline(new Set(Object.keys(channel.presenceState()))),
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void channel.track({ at: new Date().toISOString() })
      })
    return () => {
      void client.removeChannel(channel)
    }
  }, [workspaceId, user])
  return online
}
