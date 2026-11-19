import { SkeletonList } from '@/components/ui/Skeleton'
import { ArrowLeft, Lock, Pin, PinOff, Plus, Search, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { PageSpinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth'
import { useViewerTimeZone } from '@/features/profile'
import { useCurrentWorkspace, useMembers } from '@/features/workspace'
import { formatDateTime } from '@/lib/format'
import {
  noteKeys,
  saveNote,
  useCreateNote,
  useNote,
  useNotes,
  useNotesRealtime,
  useUpdateNoteMeta,
  type Note,
} from './hooks'
import { Markdown } from './markdown'
import { toggleTask } from './tasks'

/** /notes and /notes/:id — the shared notepad (FR-VAULT-02, 05, 06). */
export function NotesPage() {
  const { id = null } = useParams()
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const notes = useNotes(q)
  const create = useCreateNote()
  const navigate = useNavigate()
  const tz = useViewerTimeZone()

  const onRemoteChange = useCallback(
    (changed: string) => void qc.invalidateQueries({ queryKey: noteKeys.one(changed) }),
    [qc],
  )
  useNotesRealtime(onRemoteChange)

  const newNote = () =>
    create.mutate({}, { onSuccess: (newId) => void navigate(`/notes/${newId}`) })

  return (
    <section aria-labelledby="notes-title" className="space-y-5">
      <div className={`flex flex-wrap items-center gap-3 ${id ? 'hidden lg:flex' : ''}`}>
        <h1 id="notes-title" className="flex-1 text-h1">
          Notes
        </h1>
        <Button
          icon={<Plus className="size-4" aria-hidden />}
          loading={create.isPending}
          onClick={newNote}
        >
          New note
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[19rem_minmax(0,1fr)]">
        <aside className={`space-y-3 ${id ? 'hidden lg:block' : ''}`}>
          <label className="relative block">
            <span className="sr-only">Search notes</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
              aria-hidden
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search notes"
              className="w-full rounded-full border border-border bg-surface py-2 pr-4 pl-10 text-body-sm placeholder:text-muted/70"
            />
          </label>
          {notes.isPending ? (
            <SkeletonList label="Loading notes" variant="card" rows={3} />
          ) : notes.error ? (
            <Alert tone="danger">Couldn&apos;t load notes.</Alert>
          ) : notes.data.length === 0 ? (
            <p className="panel p-5 text-body-sm text-muted">
              {q
                ? 'No notes match that search.'
                : 'No notes yet. Start one for ideas, plans or meeting notes.'}
            </p>
          ) : (
            <ul className="space-y-2" data-testid="note-list">
              {notes.data.map((n) => (
                <li key={n.id}>
                  <Link
                    to={`/notes/${n.id}`}
                    aria-current={n.id === id ? 'page' : undefined}
                    className={`panel block p-4 transition-colors ${n.id === id ? 'nav-active' : 'hover:border-border'}`}
                  >
                    <span className="flex items-center gap-1.5">
                      {n.pinned ? (
                        <Pin className="size-3.5 shrink-0 text-highlight" aria-label="Pinned" />
                      ) : null}
                      <span className="flex-1 truncate font-medium">{n.title}</span>
                      {n.visibility === 'private' ? (
                        <Lock className="size-3.5 text-muted" aria-label="Private" />
                      ) : null}
                    </span>
                    <span className="mt-1 line-clamp-2 block text-body-sm text-muted">
                      {n.body_md
                        .replace(/\[( |x|X)\]/g, '')
                        .replace(/[#*`>\-[\]]/g, '')
                        .trim() || 'Empty note'}
                    </span>
                    <span className="mt-1.5 block text-caption text-muted">
                      {formatDateTime(n.updated_at, tz)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <div className={id ? '' : 'hidden lg:block'}>
          {id ? (
            <NoteEditor key={id} id={id} />
          ) : (
            <div className="panel panel-glow">
              <EmptyState
                title="Your shared notepad"
                action={<Button onClick={newNote}>Start a note</Button>}
              >
                Jot down ideas, plans and meeting notes. Shared notes update live for both of you.
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

type Status = 'saved' | 'unsaved' | 'saving' | 'conflict' | 'error'

function NoteEditor({ id }: { id: string }) {
  const note = useNote(id)
  if (note.isPending) return <PageSpinner label="Opening note" />
  if (note.error || !note.data)
    return (
      <Alert tone="warning">
        This note doesn&apos;t exist, was deleted, or is private to someone else.{' '}
        <Link to="/notes" className="underline">
          Back to notes
        </Link>
      </Alert>
    )
  return <NoteForm id={id} note={note.data} />
}

function NoteForm({ id, note: n }: { id: string; note: Note }) {
  const meta = useUpdateNoteMeta()
  const toast = useToast()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  const members = useMembers(workspaceId)
  const tz = useViewerTimeZone()
  const [title, setTitle] = useState(n.title)
  const [body, setBody] = useState(n.body_md)
  const [base, setBase] = useState(n.version)
  const [seenVersion, setSeenVersion] = useState(n.version)
  const [status, setStatus] = useState<Status>('saved')
  const [conflict, setConflict] = useState<{
    version: number
    title: string
    body: string
    by: string | null
  } | null>(null)
  const [mode, setMode] = useState<'write' | 'preview'>('write')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const latest = useRef({ title, body, base })
  useEffect(() => {
    latest.current = { title, body, base }
  }, [title, body, base])

  // Adopt a newer version saved by someone else while there are no local edits (render-time
  // adjustment, so the editor never shows stale text after a live update).
  if (n.version !== seenVersion) {
    setSeenVersion(n.version)
    if (n.version > base && status === 'saved') {
      setTitle(n.title)
      setBody(n.body_md)
      setBase(n.version)
    }
  }

  const save = useCallback(async () => {
    const { title: t, body: b, base: v } = latest.current
    setStatus('saving')
    try {
      const r = await saveNote(id, t, b, v)
      if (r.ok) {
        setBase(r.version)
        setStatus((s) => (s === 'saving' ? 'saved' : s))
        void qc.invalidateQueries({ queryKey: ['notes', 'list'] })
      } else if (r.code === 'VERSION_CONFLICT') {
        setConflict({ version: r.version, title: r.title, body: r.body_md, by: r.updated_by })
        setStatus('conflict')
      } else {
        setStatus('error')
      }
    } catch {
      setStatus('error')
    }
  }, [id, qc])

  // Autosave shortly after typing stops.
  useEffect(() => {
    if (status !== 'unsaved') return
    const t = window.setTimeout(() => void save(), 900)
    return () => window.clearTimeout(t)
  }, [title, body, status, save])

  const edit = (patch: { title?: string; body?: string }) => {
    if (patch.title !== undefined) setTitle(patch.title)
    if (patch.body !== undefined) setBody(patch.body)
    if (status !== 'conflict') setStatus('unsaved')
  }

  const isOwner = n.owner_id === user?.id
  const nameOf = (uid: string | null) =>
    uid === user?.id
      ? 'you'
      : (members.data?.find((m) => m.userId === uid)?.displayName ?? 'someone else')

  return (
    <article className="panel space-y-4 p-5" aria-label="Note editor">
      <div className="flex flex-wrap items-center gap-2">
        <Link to="/notes" className="icon-btn size-9 lg:hidden" aria-label="Back to notes">
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <span className="text-caption text-muted" data-testid="save-status" aria-live="polite">
          {status === 'saving'
            ? 'Saving…'
            : status === 'unsaved'
              ? 'Unsaved changes'
              : status === 'error'
                ? 'Not saved: check your connection'
                : status === 'conflict'
                  ? 'Edited by someone else meanwhile'
                  : `Saved · edited by ${nameOf(n.updated_by)} ${formatDateTime(n.updated_at, tz)}`}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <div role="tablist" aria-label="Mode" className="flex gap-1">
            {(['write', 'preview'] as const).map((m) => (
              <button
                key={m}
                role="tab"
                type="button"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={`rounded-full px-3.5 py-1 text-body-sm capitalize ${mode === m ? 'nav-active' : 'border border-border text-muted hover:text-text'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="icon-btn size-9"
            aria-label={n.pinned ? 'Unpin note' : 'Pin note'}
            onClick={() => meta.mutate({ id, patch: { pinned: !n.pinned } })}
          >
            {n.pinned ? (
              <PinOff className="size-4" aria-hidden />
            ) : (
              <Pin className="size-4" aria-hidden />
            )}
          </button>
          {isOwner ? (
            <button
              type="button"
              className="icon-btn size-9"
              aria-label={n.visibility === 'private' ? 'Share with the workspace' : 'Make private'}
              title={n.visibility === 'private' ? 'Private: only you' : 'Shared with the workspace'}
              onClick={() =>
                meta.mutate(
                  { id, patch: { visibility: n.visibility === 'private' ? 'shared' : 'private' } },
                  {
                    onSuccess: () =>
                      toast.show(
                        n.visibility === 'private' ? 'Shared with the workspace' : 'Now private',
                        'success',
                      ),
                  },
                )
              }
            >
              {n.visibility === 'private' ? (
                <Lock className="size-4" aria-hidden />
              ) : (
                <Users className="size-4" aria-hidden />
              )}
            </button>
          ) : null}
          <button
            type="button"
            className="icon-btn size-9"
            aria-label="Delete note"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="size-4" aria-hidden />
          </button>
        </div>
      </div>

      {conflict ? (
        <Alert tone="warning">
          <p>
            {nameOf(conflict.by)[0]!.toUpperCase() + nameOf(conflict.by).slice(1)} changed this note
            while you were editing. Choose which version to keep.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                setBase(conflict.version)
                latest.current.base = conflict.version
                setConflict(null)
                void save()
              }}
            >
              Keep my version
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                setTitle(conflict.title)
                setBody(conflict.body)
                setBase(conflict.version)
                setConflict(null)
                setStatus('saved')
              }}
            >
              Use their version
            </Button>
          </div>
        </Alert>
      ) : null}

      <input
        aria-label="Note title"
        value={title}
        maxLength={200}
        onChange={(e) => edit({ title: e.target.value })}
        className="w-full bg-transparent text-h1 outline-none placeholder:text-muted/60"
        placeholder="Title"
      />
      {mode === 'write' ? (
        <textarea
          aria-label="Note text"
          value={body}
          maxLength={200000}
          onChange={(e) => edit({ body: e.target.value })}
          placeholder={'Write here. Markdown works: # heading, **bold**, - list, - [ ] to-do'}
          className="min-h-[55dvh] w-full resize-y rounded-[14px] border border-hairline bg-transparent p-4 font-mono text-body-sm leading-6 outline-none focus-visible:border-primary/50"
        />
      ) : (
        <div
          className="min-h-[55dvh] rounded-[14px] border border-hairline p-4"
          data-testid="note-preview"
        >
          {body.trim() ? (
            <Markdown body={body} onToggleTask={(line) => edit({ body: toggleTask(body, line) })} />
          ) : (
            <p className="text-body-sm text-muted">Nothing to preview yet.</p>
          )}
        </div>
      )}

      <Dialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete this note?"
        description="It moves to the recycle bin for 30 days."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={meta.isPending}
              onClick={() =>
                meta.mutate(
                  { id, patch: { deleted: true } },
                  {
                    onSuccess: () => {
                      toast.show('Note deleted', 'success')
                      void navigate('/notes')
                    },
                  },
                )
              }
            >
              Delete note
            </Button>
          </>
        }
      />
    </article>
  )
}
