import { useQuery } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField, TextField } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { signedFileUrl } from '@/lib/files'
import {
  useAddBookmark,
  useCreateFolder,
  useUpdateFolder,
  useUpdateItem,
  type Bookmark,
  type ItemKind,
  type VaultFile,
  type VaultNote,
} from './hooks'
import { flattenTree, normalizeUrl, parseTags, type Folder, type FolderNode } from './model'

const NO_FOLDER = ''

function FolderSelect({
  tree,
  value,
  onChange,
}: {
  tree: FolderNode[]
  value: string | null
  onChange: (id: string | null) => void
}) {
  return (
    <SelectField
      label="Folder"
      value={value ?? NO_FOLDER}
      onChange={(e) => onChange(e.target.value || null)}
      options={[
        { value: NO_FOLDER, label: 'Vault (top level)' },
        ...flattenTree(tree).map(({ folder, level }) => ({
          value: folder.id,
          label: `${'– '.repeat(level)}${folder.name}`,
        })),
      ]}
    />
  )
}

function PrivateToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <label className="flex items-center gap-2 text-body-sm text-muted">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  )
}

/** New folder (inside `parent`) or rename `folder`. Mount with a key to reset. */
export function FolderDialog({
  open,
  onClose,
  parent,
  folder,
}: {
  open: boolean
  onClose: () => void
  parent: Folder | null
  folder?: Folder
}) {
  const create = useCreateFolder()
  const update = useUpdateFolder()
  const toast = useToast()
  const [name, setName] = useState(folder?.name ?? '')
  const [isPrivate, setPrivate] = useState(false)
  const pending = create.isPending || update.isPending
  const error = create.error ?? update.error
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const done = { onSuccess: () => onClose() }
    if (folder) update.mutate({ id: folder.id, name }, done)
    else
      create.mutate(
        { name, parentId: parent?.id ?? null, isPrivate },
        { onSuccess: () => (toast.show('Folder created', 'success'), onClose()) },
      )
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? null : onClose())}
      title={folder ? 'Rename folder' : parent ? `New folder in ${parent.name}` : 'New folder'}
    >
      <form onSubmit={submit} className="space-y-4">
        <TextField
          label="Name"
          value={name}
          maxLength={80}
          autoFocus
          required
          onChange={(e) => setName(e.target.value)}
        />
        {!folder && parent?.visibility !== 'private' ? (
          <PrivateToggle
            checked={isPrivate}
            onChange={setPrivate}
            label="Private: only I can see this folder"
          />
        ) : null}
        {error ? <Alert tone="danger">{error.message}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {folder ? 'Rename' : 'Create folder'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** Add a link or research reference (FR-VAULT-04). */
export function AddLinkDialog({
  open,
  onClose,
  tree,
  folderId,
}: {
  open: boolean
  onClose: () => void
  tree: FolderNode[]
  folderId: string | null
}) {
  const add = useAddBookmark()
  const toast = useToast()
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [folder, setFolder] = useState(folderId)
  const [reference, setReference] = useState(false)
  const [isPrivate, setPrivate] = useState(false)
  const [urlError, setUrlError] = useState<string>()
  const submit = (e: FormEvent) => {
    e.preventDefault()
    const clean = normalizeUrl(url)
    if (!clean) return setUrlError('Enter a web address, like example.org/page')
    setUrlError(undefined)
    add.mutate(
      {
        url: clean,
        title: title.trim() || new URL(clean).hostname.replace(/^www\./, ''),
        description: description.trim() || null,
        tags: parseTags(tags),
        kind: reference ? 'reference' : 'bookmark',
        folderId: folder,
        isPrivate,
      },
      { onSuccess: () => (toast.show('Link saved', 'success'), onClose()) },
    )
  }
  return (
    <Dialog open={open} onOpenChange={(o) => (o ? null : onClose())} title="Add a link">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="Web address"
          value={url}
          autoFocus
          inputMode="url"
          placeholder="https://"
          error={urlError}
          onChange={(e) => setUrl(e.target.value)}
        />
        <TextField
          label="Title"
          hint="Leave empty to use the site name."
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
        />
        <TextField
          label="Why it's useful"
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
        />
        <TextField
          label="Tags"
          hint="Separate with commas."
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <FolderSelect tree={tree} value={folder} onChange={setFolder} />
        <PrivateToggle
          checked={reference}
          onChange={setReference}
          label="Research reference (paper, article, dataset)"
        />
        <PrivateToggle checked={isPrivate} onChange={setPrivate} label="Private: only I see it" />
        {add.error ? <Alert tone="danger">{add.error.message}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={add.isPending}>
            Save link
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

export type EditTarget =
  | { kind: 'note'; item: VaultNote }
  | { kind: 'file'; item: VaultFile }
  | { kind: 'bookmark'; item: Bookmark }

/** Rename, tag and move one item. Mount with a key per item to reset the form. */
export function EditItemDialog({
  target,
  onClose,
  tree,
}: {
  target: EditTarget
  onClose: () => void
  tree: FolderNode[]
}) {
  const update = useUpdateItem()
  const toast = useToast()
  const { kind, item } = target
  const [name, setName] = useState(
    target.kind === 'file'
      ? target.item.file_name
      : target.kind === 'bookmark'
        ? target.item.title
        : '',
  )
  const [url, setUrl] = useState(target.kind === 'bookmark' ? target.item.url : '')
  const [description, setDescription] = useState(
    target.kind === 'bookmark' ? (target.item.description ?? '') : '',
  )
  const [tags, setTags] = useState(item.tags.join(', '))
  const [folder, setFolder] = useState(item.folder_id)
  const [urlError, setUrlError] = useState<string>()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const patch: Parameters<typeof update.mutate>[0]['patch'] = {
      tags: parseTags(tags),
      folder_id: folder,
    }
    if (kind === 'file' && name.trim()) patch.file_name = name.trim()
    if (kind === 'bookmark') {
      const clean = normalizeUrl(url)
      if (!clean) return setUrlError('Enter a web address, like example.org/page')
      patch.url = clean
      if (name.trim()) patch.title = name.trim()
      patch.description = description.trim() || null
    }
    update.mutate(
      { kind: kind as ItemKind, id: item.id, patch },
      { onSuccess: () => (toast.show('Saved', 'success'), onClose()) },
    )
  }
  const heading =
    target.kind === 'note' ? target.item.title : target.kind === 'file' ? 'File' : 'Link'
  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())} title={`Edit ${heading}`}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {kind === 'file' ? (
          <TextField
            label="File name"
            value={name}
            maxLength={255}
            onChange={(e) => setName(e.target.value)}
          />
        ) : null}
        {kind === 'bookmark' ? (
          <>
            <TextField
              label="Web address"
              value={url}
              error={urlError}
              onChange={(e) => setUrl(e.target.value)}
            />
            <TextField
              label="Title"
              value={name}
              maxLength={300}
              onChange={(e) => setName(e.target.value)}
            />
            <TextField
              label="Why it's useful"
              value={description}
              maxLength={2000}
              onChange={(e) => setDescription(e.target.value)}
            />
          </>
        ) : null}
        <TextField
          label="Tags"
          hint="Separate with commas."
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
        <FolderSelect tree={tree} value={folder} onChange={setFolder} />
        {update.error ? <Alert tone="danger">{update.error.message}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={update.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

/** Inline preview for images and PDFs (FR-VAULT-03). */
export function PreviewDialog({ file, onClose }: { file: VaultFile; onClose: () => void }) {
  const link = useQuery({
    queryKey: ['vault', 'preview', file.id],
    queryFn: () => signedFileUrl(file.storage_path, false),
    staleTime: 50_000,
  })
  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())} title={file.file_name}>
      {link.isPending ? (
        <Spinner label="Loading preview" />
      ) : link.error ? (
        <Alert tone="danger">Couldn&apos;t load the preview.</Alert>
      ) : file.mime_type.startsWith('image/') ? (
        <img
          src={link.data}
          alt={file.file_name}
          className="max-h-[65dvh] w-full rounded-[14px] object-contain"
        />
      ) : (
        <iframe
          src={link.data}
          title={file.file_name}
          className="h-[65dvh] w-full rounded-[14px] border border-hairline bg-white"
        />
      )}
    </Dialog>
  )
}
