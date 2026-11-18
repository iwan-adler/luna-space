import { AppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'

/** Shared file helpers for the private workspace-files bucket (Schema §21, §29). */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** Storage object names: workspace prefix, file id, then a conservative file name. */
export function storagePath(workspaceId: string, fileId: string, fileName: string): string {
  const safe =
    fileName
      .normalize('NFKD')
      .replace(/[^\w.-]+/g, '-')
      .replace(/\.{2,}/g, '.')
      .replace(/^[-.]+|[-.]+$/g, '')
      .slice(0, 120) || 'file'
  return `${workspaceId}/${fileId}/${safe}`
}

/** A short-lived download link; RLS on the files row decides who may get one. */
export async function signedFileUrl(path: string): Promise<string> {
  const { data, error } = await requireSupabase()
    .storage.from('workspace-files')
    .createSignedUrl(path, 60, { download: true })
  if (error) throw new AppError('Could not open the file.')
  return data.signedUrl
}
