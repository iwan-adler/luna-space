import { SkeletonList } from '@/components/ui/Skeleton'
import * as Menu from '@radix-ui/react-dropdown-menu'
import {
  ChevronRight,
  Download,
  Eye,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  Link2,
  Lock,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { useCreateNote } from '@/features/notes'
import { useViewerTimeZone } from '@/features/profile'
import { Highlight, useDebounced, useSearch, type SearchHit } from '@/features/search'
import { formatBytes, signedFileUrl, UPLOAD_ACCEPT } from '@/lib/files'
import { formatDateTime } from '@/lib/format'
import {
  AddLinkDialog,
  EditItemDialog,
  FolderDialog,
  PreviewDialog,
  type EditTarget,
} from './dialogs'
import {
  useFolders,
  useUpdateFolder,
  useUpdateItem,
  useUploadFile,
  useVaultItems,
  useVaultRealtime,
  type Bookmark,
  type ItemKind,
  type VaultFile,
  type VaultNote,
} from './hooks'
import { buildTree, folderPath, hostOf, MAX_DEPTH, tagCounts, type FolderNode } from './model'

type Tab = 'all' | 'notes' | 'files' | 'links'
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'notes', label: 'Notes' },
  { id: 'files', label: 'Files' },
  { id: 'links', label: 'Links' },
]

/** /vault and /vault/:folderId — folders of notes, files and links (FR-VAULT-01–06). */
export function VaultPage() {
  const { folderId = null } = useParams()
  const [params, setParams] = useSearchParams()
  const rawTab = params.get('tab')
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : 'all'
  const tag = params.get('tag')
  const [q, setQ] = useState('')
  const term = useDebounced(q)
  const searching = term.trim().length >= 2

  useVaultRealtime()
  const folders = useFolders()
  const items = useVaultItems(folderId, tag)
  const createNote = useCreateNote()
  const upload = useUploadFile()
  const navigate = useNavigate()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)

  const [folderDialog, setFolderDialog] = useState<'new' | 'rename' | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [addLink, setAddLink] = useState(false)
  const updateFolder = useUpdateFolder()

  const all = folders.data ?? []
  const tree = buildTree(all)
  const current = folderId ? (all.find((f) => f.id === folderId) ?? null) : null
  const path = folderPath(all, folderId)
  const children = all
    .filter((f) => f.parent_id === folderId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const onFiles = (list: FileList | null) => {
    for (const file of Array.from(list ?? [])) {
      upload.mutate(
        { file, folderId: tag ? null : folderId },
        {
          onSuccess: () => toast.show(`${file.name} uploaded`, 'success'),
          onError: (e) => toast.show(e.message, 'error'),
        },
      )
    }
    if (fileInput.current) fileInput.current.value = ''
  }

  if (folderId && folders.isSuccess && !current) {
    return (
      <Alert tone="warning">
        This folder doesn&apos;t exist, was deleted, or is private to someone else.{' '}
        <Link to="/vault" className="underline">
          Back to the Vault
        </Link>
      </Alert>
    )
  }

  return (
    <section aria-labelledby="vault-title" className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 id="vault-title" className="flex-1 text-h1">
          Vault
        </h1>
        <Button
          variant="secondary"
          size="sm"
          icon={<NotebookPen className="size-4" aria-hidden />}
          loading={createNote.isPending}
          onClick={() =>
            createNote.mutate(
              { folderId: tag ? null : folderId },
              { onSuccess: (id) => void navigate(id ? `/notes/${id}` : '/notes') },
            )
          }
        >
          New note
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<Upload className="size-4" aria-hidden />}
          loading={upload.isPending}
          onClick={() => fileInput.current?.click()}
        >
          Upload
        </Button>
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          accept={UPLOAD_ACCEPT}
          data-testid="vault-file-input"
          onChange={(e) => onFiles(e.target.files)}
        />
        <Button
          size="sm"
          icon={<Link2 className="size-4" aria-hidden />}
          onClick={() => setAddLink(true)}
        >
          Add link
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="panel hidden self-start p-3 lg:block" aria-label="Folders">
          <Link
            to="/vault"
            aria-current={!folderId && !tag ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-body-sm ${!folderId && !tag ? 'nav-active' : 'text-muted hover:text-text'}`}
          >
            <FolderIcon className="size-4" aria-hidden /> All of the Vault
          </Link>
          {folders.isPending ? (
            <SkeletonList label="Loading folders" variant="card" rows={3} />
          ) : folders.error ? (
            <p className="px-3 py-2 text-caption text-danger">Couldn&apos;t load folders.</p>
          ) : (
            <FolderTree nodes={tree} selected={folderId} />
          )}
          <button
            type="button"
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-body-sm text-muted hover:text-text"
            onClick={() => {
              void navigate('/vault')
              setFolderDialog('new')
            }}
          >
            <FolderPlus className="size-4" aria-hidden /> New top-level folder
          </button>
        </aside>

        <div className="min-w-0 space-y-4">
          <nav aria-label="Folder path" className="flex flex-wrap items-center gap-1 text-body-sm">
            <Link to="/vault" className="text-muted hover:text-text">
              Vault
            </Link>
            {path.map((f) => (
              <span key={f.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-muted" aria-hidden />
                <Link
                  to={`/vault/${f.id}`}
                  aria-current={f.id === folderId ? 'page' : undefined}
                  className={f.id === folderId ? 'font-medium' : 'text-muted hover:text-text'}
                >
                  {f.name}
                </Link>
              </span>
            ))}
            {current?.visibility === 'private' ? (
              <Lock className="ml-1 size-3.5 text-muted" aria-label="Private folder" />
            ) : null}
            <span className="ml-auto flex gap-1">
              {(current?.depth ?? 0) < MAX_DEPTH && !tag ? (
                <button
                  type="button"
                  className="icon-btn size-8"
                  aria-label={current ? `New folder in ${current.name}` : 'New folder'}
                  onClick={() => setFolderDialog('new')}
                >
                  <FolderPlus className="size-4" aria-hidden />
                </button>
              ) : null}
              {current ? (
                <>
                  <button
                    type="button"
                    className="icon-btn size-8"
                    aria-label="Rename folder"
                    onClick={() => setFolderDialog('rename')}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </button>
                  <button
                    type="button"
                    className="icon-btn size-8"
                    aria-label="Delete folder"
                    onClick={() => setConfirmDelete(true)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </>
              ) : null}
            </span>
          </nav>

          <label className="relative block">
            <span className="sr-only">Search the Vault</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes, files and links"
              className="w-full rounded-full border border-border bg-surface py-2 pr-4 pl-10 text-body-sm placeholder:text-muted/70"
            />
          </label>

          {searching ? (
            <VaultSearch term={term} />
          ) : (
            <>
              {!tag && children.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Sub-folders">
                  {children.map((f) => (
                    <li key={f.id}>
                      <Link
                        to={`/vault/${f.id}`}
                        className="panel flex items-center gap-2 p-3 text-body-sm transition-colors hover:border-border"
                      >
                        <FolderIcon className="size-4 shrink-0 text-highlight" aria-hidden />
                        <span className="flex-1 truncate">{f.name}</span>
                        {f.visibility === 'private' ? (
                          <Lock className="size-3.5 text-muted" aria-label="Private" />
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5">
                <div role="tablist" aria-label="Show" className="flex gap-1">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      role="tab"
                      type="button"
                      aria-selected={tab === t.id}
                      onClick={() => setParam('tab', t.id === 'all' ? null : t.id)}
                      className={`rounded-full px-3.5 py-1 text-body-sm ${tab === t.id ? 'nav-active' : 'border border-border text-muted hover:text-text'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {tag ? (
                  <button
                    type="button"
                    onClick={() => setParam('tag', null)}
                    className="ml-auto flex items-center gap-1 rounded-full bg-primary/15 px-3 py-1 text-body-sm"
                    aria-label={`Clear tag ${tag}`}
                  >
                    #{tag} <X className="size-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>

              {items.isPending ? (
                <SkeletonList label="Loading the Vault" variant="card" rows={3} />
              ) : items.error ? (
                <Alert tone="danger">
                  Couldn&apos;t load this folder. Check your connection and try again.
                </Alert>
              ) : (
                <ItemList
                  tab={tab}
                  tree={tree}
                  notes={items.data.notes}
                  files={items.data.files}
                  bookmarks={items.data.bookmarks}
                  onTag={(t) => setParam('tag', t)}
                  empty={
                    <EmptyState
                      title={
                        tag
                          ? `Nothing tagged #${tag}`
                          : current
                            ? 'This folder is empty'
                            : 'Your shared Vault'
                      }
                    >
                      Keep notes, files and useful links together. Upload, add a link or start a
                      note.
                    </EmptyState>
                  }
                />
              )}
            </>
          )}
        </div>
      </div>

      {folderDialog ? (
        <FolderDialog
          key={`${folderDialog}:${folderId ?? ''}`}
          open
          onClose={() => setFolderDialog(null)}
          parent={folderDialog === 'new' ? current : null}
          {...(folderDialog === 'rename' && current ? { folder: current } : {})}
        />
      ) : null}
      {addLink ? (
        <AddLinkDialog
          open
          tree={tree}
          folderId={tag ? null : folderId}
          onClose={() => setAddLink(false)}
        />
      ) : null}
      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${current?.name ?? ''}”?`}
        description="Its sub-folders are deleted too. Notes, files and links inside move up one level, so nothing is lost."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={updateFolder.isPending}
              onClick={() =>
                current &&
                updateFolder.mutate(
                  { id: current.id, deleted: true },
                  {
                    onSuccess: () => {
                      setConfirmDelete(false)
                      toast.show('Folder deleted', 'success')
                      void navigate(current.parent_id ? `/vault/${current.parent_id}` : '/vault')
                    },
                  },
                )
              }
            >
              Delete folder
            </Button>
          </>
        }
      />
    </section>
  )
}

function FolderTree({ nodes, selected }: { nodes: FolderNode[]; selected: string | null }) {
  if (nodes.length === 0) return null
  return (
    <ul className="mt-1 space-y-0.5">
      {nodes.map((n) => (
        <li key={n.id}>
          <Link
            to={`/vault/${n.id}`}
            aria-current={n.id === selected ? 'page' : undefined}
            style={{ paddingLeft: `${0.75 + (n.depth - 1) * 0.9}rem` }}
            className={`flex items-center gap-2 rounded-xl py-1.5 pr-3 text-body-sm ${n.id === selected ? 'nav-active' : 'text-muted hover:text-text'}`}
          >
            <FolderIcon className="size-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{n.name}</span>
            {n.visibility === 'private' ? <Lock className="size-3" aria-label="Private" /> : null}
          </Link>
          <FolderTree nodes={n.children} selected={selected} />
        </li>
      ))}
    </ul>
  )
}

function VaultSearch({ term }: { term: string }) {
  const results = useSearch(term, ['note', 'file', 'bookmark'])
  if (results.isPending) return <SkeletonList label="Searching" variant="card" rows={3} />
  if (results.error)
    return (
      <Alert tone="danger">Search isn&apos;t available right now. Check your connection.</Alert>
    )
  if (results.data.length === 0)
    return (
      <p className="panel p-5 text-body-sm text-muted">
        Nothing in the Vault matches “{term.trim()}”.
      </p>
    )
  return (
    <ul className="space-y-2" data-testid="vault-search-results">
      {results.data.map((h) => (
        <li key={`${h.kind}:${h.id}`}>
          <Link to={vaultHref(h)} className="panel block p-4 transition-colors hover:border-border">
            <span className="flex items-center gap-2">
              {h.kind === 'note' ? (
                <NotebookPen className="size-4 text-muted" aria-hidden />
              ) : h.kind === 'file' ? (
                <FileText className="size-4 text-muted" aria-hidden />
              ) : (
                <Link2 className="size-4 text-muted" aria-hidden />
              )}
              <Highlight text={h.title} className="flex-1 truncate font-medium" />
            </span>
            {h.snippet?.trim() ? (
              <Highlight
                text={h.snippet}
                className="mt-1 line-clamp-2 block text-body-sm text-muted"
              />
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  )
}

function vaultHref(h: SearchHit): string {
  if (h.kind === 'note') return `/notes/${h.id}`
  return `/vault${h.folder_id ? `/${h.folder_id}` : ''}?tab=${h.kind === 'file' ? 'files' : 'links'}`
}

function ItemList({
  tab,
  tree,
  notes,
  files,
  bookmarks,
  onTag,
  empty,
}: {
  tab: Tab
  tree: FolderNode[]
  notes: VaultNote[]
  files: VaultFile[]
  bookmarks: Bookmark[]
  onTag: (tag: string) => void
  empty: ReactNode
}) {
  const tz = useViewerTimeZone()
  const [editing, setEditing] = useState<EditTarget | null>(null)
  const [preview, setPreview] = useState<VaultFile | null>(null)
  const show = (t: Tab) => tab === 'all' || tab === t
  const tags = tagCounts([...notes, ...files, ...bookmarks]).slice(0, 12)
  const count =
    (show('notes') ? notes.length : 0) +
    (show('files') ? files.length : 0) +
    (show('links') ? bookmarks.length : 0)

  return (
    <>
      {tags.length ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Tags here">
          {tags.map(({ tag, count: n }) => (
            <button
              key={tag}
              type="button"
              onClick={() => onTag(tag)}
              className="rounded-full border border-border px-2.5 py-0.5 text-caption text-muted hover:text-text"
            >
              #{tag} <span className="opacity-60">{n}</span>
            </button>
          ))}
        </div>
      ) : null}

      {count === 0 ? (
        <div className="panel panel-glow">{empty}</div>
      ) : (
        <ul className="space-y-2" data-testid="vault-items">
          {show('notes')
            ? notes.map((n) => (
                <li key={`n:${n.id}`} className="panel flex items-start gap-3 p-4">
                  <NotebookPen className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
                  <div className="min-w-0 flex-1 space-y-1">
                    <Link
                      to={`/notes/${n.id}`}
                      className="block truncate font-medium hover:underline"
                    >
                      {n.title}
                    </Link>
                    <p className="line-clamp-1 text-body-sm text-muted">
                      {n.body_md.replace(/[#*`>[\]-]/g, '').trim() || 'Empty note'}
                    </p>
                    <TagList list={n.tags} onTag={onTag} />
                  </div>
                  {n.visibility === 'private' ? (
                    <Lock className="size-3.5 text-muted" aria-label="Private" />
                  ) : null}
                  <ItemMenu
                    label={n.title}
                    kind="note"
                    id={n.id}
                    onEdit={() => setEditing({ kind: 'note', item: n })}
                  />
                </li>
              ))
            : null}
          {show('files')
            ? files.map((f) => {
                const previewable =
                  f.mime_type.startsWith('image/') || f.mime_type === 'application/pdf'
                return (
                  <li key={`f:${f.id}`} className="panel flex items-start gap-3 p-4">
                    <FileText className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-medium">{f.file_name}</p>
                      <p className="text-caption text-muted">
                        {formatBytes(f.size_bytes)} · {formatDateTime(f.created_at, tz)}
                      </p>
                      <TagList list={f.tags} onTag={onTag} />
                    </div>
                    {previewable ? (
                      <button
                        type="button"
                        className="icon-btn size-8"
                        aria-label={`Preview ${f.file_name}`}
                        onClick={() => setPreview(f)}
                      >
                        <Eye className="size-4" aria-hidden />
                      </button>
                    ) : null}
                    <DownloadButton file={f} />
                    <ItemMenu
                      label={f.file_name}
                      kind="file"
                      id={f.id}
                      onEdit={() => setEditing({ kind: 'file', item: f })}
                    />
                  </li>
                )
              })
            : null}
          {show('links')
            ? bookmarks.map((b) => (
                <li key={`b:${b.id}`} className="panel flex items-start gap-3 p-4">
                  <Link2 className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
                  <div className="min-w-0 flex-1 space-y-1">
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-medium hover:underline"
                    >
                      {b.title}
                    </a>
                    <p className="truncate text-caption text-muted">
                      {hostOf(b.url)}
                      {b.kind === 'reference' ? ' · Reference' : ''}
                    </p>
                    {b.description ? (
                      <p className="line-clamp-2 text-body-sm text-muted">{b.description}</p>
                    ) : null}
                    <TagList list={b.tags} onTag={onTag} />
                  </div>
                  {b.visibility === 'private' ? (
                    <Lock className="size-3.5 text-muted" aria-label="Private" />
                  ) : null}
                  <ItemMenu
                    label={b.title}
                    kind="bookmark"
                    id={b.id}
                    onEdit={() => setEditing({ kind: 'bookmark', item: b })}
                  />
                </li>
              ))
            : null}
        </ul>
      )}

      {editing ? (
        <EditItemDialog
          key={editing.item.id}
          target={editing}
          tree={tree}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {preview ? <PreviewDialog file={preview} onClose={() => setPreview(null)} /> : null}
    </>
  )
}

function TagList({ list, onTag }: { list: string[]; onTag: (tag: string) => void }) {
  if (!list.length) return null
  return (
    <span className="flex flex-wrap gap-1">
      {list.map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onTag(t)}
          className="rounded-full bg-hairline px-2 py-0.5 text-caption text-muted hover:text-text"
        >
          #{t}
        </button>
      ))}
    </span>
  )
}

function DownloadButton({ file }: { file: VaultFile }) {
  const toast = useToast()
  return (
    <button
      type="button"
      className="icon-btn size-8"
      aria-label={`Download ${file.file_name}`}
      onClick={() =>
        void signedFileUrl(file.storage_path)
          .then((url) => window.location.assign(url))
          .catch(() => toast.show('Could not download the file.', 'error'))
      }
    >
      <Download className="size-4" aria-hidden />
    </button>
  )
}

function ItemMenu({
  label,
  kind,
  id,
  onEdit,
}: {
  label: string
  kind: ItemKind
  id: string
  onEdit: () => void
}) {
  const update = useUpdateItem()
  const toast = useToast()
  const item =
    'flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2 text-body-sm text-muted outline-none data-[highlighted]:bg-hairline data-[highlighted]:text-text'
  return (
    <Menu.Root>
      <Menu.Trigger className="icon-btn size-8" aria-label={`More for ${label}`}>
        <MoreHorizontal className="size-4" aria-hidden />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-44 rounded-xl border border-border bg-surface-raised p-1.5 shadow-2xl backdrop-blur-none"
        >
          <Menu.Item className={item} onSelect={onEdit}>
            <Pencil className="size-4" aria-hidden /> Edit, tag or move
          </Menu.Item>
          <Menu.Item
            className={item}
            onSelect={() =>
              update.mutate(
                { kind, id, patch: { deleted: true } },
                { onSuccess: () => toast.show('Moved to the recycle bin', 'success') },
              )
            }
          >
            <Trash2 className="size-4" aria-hidden /> Delete
          </Menu.Item>
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  )
}
