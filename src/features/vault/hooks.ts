import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth'
import { useCurrentWorkspace } from '@/features/workspace'
import { AppError, toAppError } from '@/lib/errors'
import { MAX_UPLOAD_BYTES, mimeFor, storagePath } from '@/lib/files'
import { requireSupabase } from '@/lib/supabase'
import type { Folder } from './model'

export type ItemKind = 'note' | 'file' | 'bookmark'

export interface VaultNote {
  id: string
  title: string
  body_md: string
  tags: string[]
  folder_id: string | null
  visibility: 'shared' | 'private'
  owner_id: string | null
  pinned: boolean
  updated_at: string
}
export interface VaultFile {
  id: string
  file_name: string
  mime_type: string
  size_bytes: number
  storage_path: string
  tags: string[]
  folder_id: string | null
  visibility: 'shared' | 'private'
  owner_id: string | null
  created_at: string
}
export interface Bookmark {
  id: string
  kind: 'bookmark' | 'reference'
  url: string
  title: string
  description: string | null
  tags: string[]
  folder_id: string | null
  visibility: 'shared' | 'private'
  owner_id: string | null
  updated_at: string
}
export interface VaultItems {
  notes: VaultNote[]
  files: VaultFile[]
  bookmarks: Bookmark[]
}

const TABLE = { note: 'notes', file: 'files', bookmark: 'bookmarks' } as const

export const vaultKeys = {
  all: ['vault'] as const,
  folders: (ws: string) => ['vault', 'folders', ws] as const,
  items: (ws: string, folder: string | null, tag: string | null) =>
    ['vault', 'items', ws, folder, tag] as const,
}

const db = () => requireSupabase()

export function useFolders() {
  const { workspaceId } = useCurrentWorkspace()
  return useQuery({
    queryKey: vaultKeys.folders(workspaceId),
    queryFn: async (): Promise<Folder[]> => {
      const { data, error } = await db()
        .from('vault_folders')
        .select('id, name, parent_id, depth, visibility, owner_id')
        .is('deleted_at', null)
        .order('name')
      if (error) throw toAppError(error)
      return data
    },
  })
}

/**
 * What is inside a folder (or at the top level). With a tag, everything carrying that tag in
 * any folder (FR-VAULT-05). Files at the top level are those added in the Vault, not project or
 * chat attachments (those stay findable through search).
 */
export function useVaultItems(folderId: string | null, tag: string | null) {
  const { workspaceId } = useCurrentWorkspace()
  return useQuery({
    queryKey: vaultKeys.items(workspaceId, folderId, tag),
    // Notes are edited on their own page; show the latest titles when coming back.
    refetchOnMount: 'always',
    queryFn: async (): Promise<VaultItems> => {
      let notes = db()
        .from('notes')
        .select('id, title, body_md, tags, folder_id, visibility, owner_id, pinned, updated_at')
        .is('deleted_at', null)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(300)
      let files = db()
        .from('files')
        .select(
          'id, file_name, mime_type, size_bytes, storage_path, tags, folder_id, visibility, owner_id, created_at',
        )
        .is('deleted_at', null)
        .eq('upload_state', 'stored')
        .order('created_at', { ascending: false })
        .limit(300)
      let bookmarks = db()
        .from('bookmarks')
        .select(
          'id, kind, url, title, description, tags, folder_id, visibility, owner_id, updated_at',
        )
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(300)
      if (tag) {
        notes = notes.contains('tags', [tag])
        files = files.contains('tags', [tag])
        bookmarks = bookmarks.contains('tags', [tag])
      } else if (folderId) {
        notes = notes.eq('folder_id', folderId)
        files = files.eq('folder_id', folderId)
        bookmarks = bookmarks.eq('folder_id', folderId)
      } else {
        notes = notes.is('folder_id', null)
        files = files
          .is('folder_id', null)
          .is('project_id', null)
          .is('task_id', null)
          .is('message_id', null)
        bookmarks = bookmarks.is('folder_id', null)
      }
      const [n, f, b] = await Promise.all([notes, files, bookmarks])
      const error = n.error ?? f.error ?? b.error
      if (error) throw toAppError(error)
      return {
        notes: n.data as VaultNote[],
        files: f.data as VaultFile[],
        bookmarks: b.data as Bookmark[],
      }
    },
  })
}

function useInvalidate() {
  const qc = useQueryClient()
  return () => {
    void qc.invalidateQueries({ queryKey: vaultKeys.all })
    void qc.invalidateQueries({ queryKey: ['search'] })
    void qc.invalidateQueries({ queryKey: ['notes'] })
  }
}

export function useCreateFolder() {
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (args: { name: string; parentId: string | null; isPrivate: boolean }) => {
      const { data, error } = await db()
        .from('vault_folders')
        .insert({
          workspace_id: workspaceId,
          owner_id: user!.id,
          parent_id: args.parentId,
          name: args.name.trim(),
          visibility: args.isPrivate ? 'private' : 'shared',
        })
        .select('id')
        .single()
      if (error) throw toAppError(error)
      return data.id
    },
    onSuccess: invalidate,
  })
}

export function useUpdateFolder() {
  const { user } = useAuth()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (args: { id: string; name?: string; deleted?: boolean }) => {
      const patch = args.deleted
        ? { deleted_at: new Date().toISOString(), deleted_by: user!.id }
        : { name: args.name!.trim() }
      const { error } = await db().from('vault_folders').update(patch).eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSuccess: invalidate,
  })
}

/** Moves, tags, renames or deletes a note, file or bookmark. */
export function useUpdateItem() {
  const { user } = useAuth()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (args: {
      kind: ItemKind
      id: string
      patch: {
        folder_id?: string | null
        tags?: string[]
        file_name?: string
        title?: string
        url?: string
        description?: string | null
        bookmarkKind?: 'bookmark' | 'reference'
        deleted?: boolean
      }
    }) => {
      const { deleted, bookmarkKind, ...rest } = args.patch
      const patch: Record<string, unknown> = { ...rest }
      if (bookmarkKind) patch.kind = bookmarkKind
      if (deleted) {
        patch.deleted_at = new Date().toISOString()
        patch.deleted_by = user!.id
      }
      const { error } = await db()
        .from(TABLE[args.kind])
        .update(patch as never)
        .eq('id', args.id)
      if (error) throw toAppError(error)
    },
    onSuccess: invalidate,
  })
}

export function useAddBookmark() {
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (args: {
      url: string
      title: string
      description: string | null
      tags: string[]
      kind: 'bookmark' | 'reference'
      folderId: string | null
      isPrivate: boolean
    }) => {
      const { error } = await db()
        .from('bookmarks')
        .insert({
          workspace_id: workspaceId,
          owner_id: user!.id,
          url: args.url,
          title: args.title.trim(),
          description: args.description,
          tags: args.tags,
          kind: args.kind,
          folder_id: args.folderId,
          visibility: args.isPrivate ? 'private' : 'shared',
        })
      if (error) throw toAppError(error)
    },
    onSuccess: invalidate,
  })
}

/** Uploads into the private bucket: row first, then the object, then confirmation. */
export function useUploadFile() {
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (args: { file: File; folderId: string | null }) => {
      const { file } = args
      const mime = mimeFor(file.name, file.type)
      if (!mime) throw new AppError(`${file.name}: this type of file isn't supported.`)
      if (file.size === 0 || file.size > MAX_UPLOAD_BYTES)
        throw new AppError(`${file.name}: files must be under 25 MB.`)
      const id = crypto.randomUUID()
      const path = storagePath(workspaceId, id, file.name)
      const { error: rowError } = await db()
        .from('files')
        .insert({
          id,
          workspace_id: workspaceId,
          owner_id: user!.id,
          storage_path: path,
          file_name: file.name.slice(0, 255),
          mime_type: mime,
          size_bytes: file.size,
          folder_id: args.folderId,
        })
      if (rowError) throw toAppError(rowError)
      const { error: upError } = await db()
        .storage.from('workspace-files')
        .upload(path, file, { contentType: mime, upsert: false })
      if (upError) throw new AppError(`Upload failed: ${upError.message}`)
      const { error } = await db().rpc('confirm_upload', { p_file: id })
      if (error) throw toAppError(error)
    },
    onSettled: invalidate,
  })
}

/** Live updates when someone else files, adds or changes something. */
export function useVaultRealtime() {
  const qc = useQueryClient()
  const { workspaceId } = useCurrentWorkspace()
  useEffect(() => {
    const client = db()
    const refresh = () => void qc.invalidateQueries({ queryKey: vaultKeys.all })
    const filter = `workspace_id=eq.${workspaceId}`
    const channel = client.channel(`vault:${workspaceId}:${crypto.randomUUID()}`)
    for (const table of ['vault_folders', 'bookmarks', 'files', 'notes'])
      channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, refresh)
    channel.subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [qc, workspaceId])
}
