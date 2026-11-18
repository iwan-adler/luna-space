import { Download, Eye, EyeOff, FileText, Trash2, Upload } from 'lucide-react'
import { useRef } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { messageForCode, toAppError } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { signedFileUrl } from '../api'
import { ACCEPTED_MIME_TYPES, MAX_FILE_BYTES } from '../constants'
import { useDeleteFile, useSetFileGuestVisible, useUploadFile } from '../hooks'
import { formatBytes, type FileRow } from '../model'
import type { RoomPermissions } from '../room'

/** Picks a file, checks type and size on the client (the database checks again). */
export function UploadButton({
  projectId,
  taskId = null,
  size = 'md',
}: {
  projectId: string
  taskId?: string | null
  size?: 'sm' | 'md'
}) {
  const input = useRef<HTMLInputElement>(null)
  const upload = useUploadFile(projectId)
  const toast = useToast()
  return (
    <>
      <input
        ref={input}
        type="file"
        hidden
        accept={ACCEPTED_MIME_TYPES.join(',')}
        data-testid={taskId ? 'task-file-input' : 'project-file-input'}
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (!file) return
          if (!ACCEPTED_MIME_TYPES.includes(file.type))
            return toast.show('That file type is not supported.', 'error')
          if (file.size > MAX_FILE_BYTES) return toast.show('Files can be up to 25 MB.', 'error')
          upload.mutate(
            { file, taskId },
            {
              onSuccess: () => toast.show(`Uploaded ${file.name}`, 'success'),
              onError: (err) =>
                toast.show(messageForCode(toAppError(err).code, toAppError(err).message), 'error'),
            },
          )
        }}
      />
      <Button
        variant="secondary"
        size={size}
        loading={upload.isPending}
        icon={<Upload className="size-4" aria-hidden />}
        onClick={() => input.current?.click()}
      >
        Upload
      </Button>
    </>
  )
}

export function FileList({
  projectId,
  files,
  viewerTz,
  perms,
  compact = false,
}: {
  projectId: string
  files: FileRow[]
  viewerTz: string
  perms: RoomPermissions
  compact?: boolean
}) {
  const remove = useDeleteFile(projectId)
  const share = useSetFileGuestVisible(projectId)
  const toast = useToast()
  if (files.length === 0)
    return (
      <p className="text-body-sm text-muted">{compact ? 'No attachments.' : 'No files yet.'}</p>
    )

  const open = async (f: FileRow) => {
    try {
      window.open(await signedFileUrl(f.storage_path), '_blank', 'noopener')
    } catch {
      toast.show("Couldn't open the file.", 'error')
    }
  }

  return (
    <ul className="divide-y divide-hairline" data-testid="file-list">
      {files.map((f) => (
        <li key={f.id} className="flex items-center gap-3 py-2.5 text-body-sm">
          <FileText className="size-4 shrink-0 text-muted" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate">{f.file_name}</p>
            {compact ? null : (
              <p className="text-caption text-muted">
                {formatBytes(f.size_bytes)} · {formatDate(f.created_at, viewerTz)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void open(f)}
            aria-label={`Download ${f.file_name}`}
            className="grid size-8 place-items-center rounded-full text-muted hover:bg-hairline hover:text-text"
          >
            <Download className="size-4" aria-hidden />
          </button>
          {perms.member && f.visibility === 'shared' ? (
            <button
              type="button"
              aria-pressed={f.guest_visible}
              onClick={() =>
                share.mutate(
                  { id: f.id, visible: !f.guest_visible },
                  {
                    onSuccess: () =>
                      toast.show(
                        f.guest_visible ? 'Hidden from guests' : 'Guests can now see this file',
                        'success',
                      ),
                  },
                )
              }
              aria-label={`Visible to guests: ${f.file_name}`}
              title={f.guest_visible ? 'Visible to guests' : 'Hidden from guests'}
              className={`grid size-8 place-items-center rounded-full hover:bg-hairline ${f.guest_visible ? 'text-info' : 'text-muted'}`}
            >
              {f.guest_visible ? (
                <Eye className="size-4" aria-hidden />
              ) : (
                <EyeOff className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
          {perms.editTasks ? (
            <button
              type="button"
              onClick={() =>
                remove.mutate(f.id, {
                  onSuccess: () => toast.show('File moved to the recycle bin', 'success'),
                })
              }
              aria-label={`Delete ${f.file_name}`}
              className="grid size-8 place-items-center rounded-full text-muted hover:bg-hairline hover:text-danger"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  )
}
