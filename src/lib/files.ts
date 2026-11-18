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

/** A short-lived link (a download, or inline for previews); RLS on the files row decides who may get one. */
export async function signedFileUrl(path: string, download = true): Promise<string> {
  const { data, error } = await requireSupabase()
    .storage.from('workspace-files')
    .createSignedUrl(path, 60, download ? { download: true } : undefined)
  if (error) throw new AppError('Could not open the file.')
  return data.signedUrl
}

/** Types the files table accepts (Schema §21), keyed by extension for browsers that send none. */
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  zip: 'application/zip',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odt: 'application/vnd.oasis.opendocument.text',
}
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024
export const UPLOAD_ACCEPT = Object.keys(MIME_BY_EXTENSION)
  .map((e) => `.${e}`)
  .join(',')

/** The stored type for a file, or null when the workspace does not accept it. */
export function mimeFor(name: string, browserType: string): string | null {
  const known = new Set(Object.values(MIME_BY_EXTENSION))
  if (known.has(browserType)) return browserType
  const ext = name.toLowerCase().split('.').pop() ?? ''
  return MIME_BY_EXTENSION[ext] ?? null
}
