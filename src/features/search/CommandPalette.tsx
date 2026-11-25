import * as RadixDialog from '@radix-ui/react-dialog'
import {
  ArrowRight,
  Award,
  CalendarDays,
  FolderKanban,
  House,
  Library,
  ListChecks,
  MessageCircle,
  NotebookPen,
  Plus,
  Search,
  Settings,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router'
import { Spinner } from '@/components/ui/Spinner'
import { useCreateNote } from '@/features/notes'
import { useDebounced, useSearch } from './hooks'
import { Highlight } from './Highlight'
import { hitHref, hitTitle, KIND_LABEL } from './model'
import { KIND_ICON } from './SearchResults'

interface Command {
  label: string
  icon: LucideIcon
  run: () => void
}

/**
 * Ctrl K / ⌘ K: jump anywhere, create something, or search (FR-PLAT-12, FR-PLAT-11).
 * A combobox: arrow keys move through the options, Enter opens one. Only the instance with
 * `shortcut` listens for the key (the shell renders one per screen size).
 */
export function CommandPalette({ shortcut = false }: { shortcut?: boolean }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!shortcut) return
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shortcut])

  return (
    <RadixDialog.Root open={open} onOpenChange={setOpen}>
      <RadixDialog.Trigger asChild>
        <button
          type="button"
          className="icon-btn lg:flex lg:w-56 lg:items-center lg:justify-start lg:gap-2 lg:px-4"
          aria-keyshortcuts="Control+K Meta+K"
        >
          <Search className="size-[18px]" strokeWidth={1.75} aria-hidden />
          <span className="sr-only flex-1 text-left text-body-sm text-muted lg:not-sr-only">
            Search…
          </span>
          <kbd
            aria-hidden
            className="hidden rounded-md border border-hairline px-1.5 text-caption text-muted lg:inline"
          >
            Ctrl K
          </kbd>
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-[12dvh] left-1/2 z-50 w-[min(94vw,38rem)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl backdrop-blur-none"
        >
          <RadixDialog.Title className="sr-only">Search and commands</RadixDialog.Title>
          {open ? <Palette close={() => setOpen(false)} /> : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function Palette({ close }: { close: () => void }) {
  const navigate = useNavigate()
  const createNote = useCreateNote()
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const [seenQ, setSeenQ] = useState(q)
  if (seenQ !== q) {
    setSeenQ(q)
    setActive(0)
  }
  const term = useDebounced(q, 180)
  const results = useSearch(term, undefined, 8)

  const go = (to: string) => () => {
    close()
    void navigate(to)
  }
  const commands: Command[] = [
    { label: 'Home', icon: House, run: go('/') },
    { label: 'Opportunities', icon: Trophy, run: go('/opportunities') },
    { label: 'Projects', icon: FolderKanban, run: go('/projects') },
    { label: 'My tasks', icon: ListChecks, run: go('/tasks') },
    { label: 'Calendar', icon: CalendarDays, run: go('/calendar') },
    { label: 'Notes', icon: NotebookPen, run: go('/notes') },
    { label: 'Chat', icon: MessageCircle, run: go('/chat') },
    { label: 'Vault', icon: Library, run: go('/vault') },
    { label: 'Trophy wall', icon: Award, run: go('/trophies') },
    { label: 'Team finder', icon: Users, run: go('/teams') },
    { label: 'Settings', icon: Settings, run: go('/settings/profile') },
    { label: 'Add an opportunity', icon: Plus, run: go('/opportunities/new') },
    {
      label: 'New note',
      icon: Plus,
      run: () =>
        createNote.mutate(
          {},
          {
            onSuccess: (id) => {
              close()
              void navigate(`/notes/${id}`)
            },
          },
        ),
    },
  ]
  const needle = q.trim().toLowerCase()
  const shown = needle
    ? commands.filter((c) => c.label.toLowerCase().includes(needle)).slice(0, 5)
    : commands
  const hits = term.trim().length >= 2 && q.trim().length >= 2 ? (results.data ?? []) : []
  const options = [
    ...shown.map((c) => ({ key: `cmd:${c.label}`, run: c.run })),
    ...hits.map((h) => ({ key: `${h.kind}:${h.id}`, run: go(hitHref(h)) })),
    ...(q.trim().length >= 2
      ? [{ key: 'all', run: go(`/search?q=${encodeURIComponent(q.trim())}`) }]
      : []),
  ]
  const current = Math.min(active, Math.max(options.length - 1, 0))

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((current + 1) % Math.max(options.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((current - 1 + options.length) % Math.max(options.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      options[current]?.run()
    }
  }

  const optionClass = (key: string) =>
    `flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-body-sm ${
      options[current]?.key === key ? 'bg-hairline text-text' : 'text-muted'
    }`
  const indexOf = (key: string) => options.findIndex((o) => o.key === key)

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-hairline px-4">
        <Search className="size-5 text-muted" aria-hidden />
        <input
          autoFocus
          role="combobox"
          aria-expanded
          aria-controls="palette-options"
          aria-activedescendant={options[current] ? `palette-${current}` : undefined}
          aria-label="Search or jump to"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Search or jump to…"
          className="h-14 flex-1 bg-transparent text-body outline-none placeholder:text-muted/70"
        />
        {results.isFetching && q.trim().length >= 2 ? <Spinner label="Searching" /> : null}
      </div>
      <ul id="palette-options" role="listbox" className="max-h-[60dvh] overflow-y-auto p-2">
        {shown.map((c) => {
          const key = `cmd:${c.label}`
          const i = indexOf(key)
          return (
            <li
              key={key}
              id={`palette-${i}`}
              role="option"
              aria-selected={current === i}
              className={optionClass(key)}
              onMouseEnter={() => setActive(i)}
              onClick={c.run}
            >
              <c.icon className="size-4" aria-hidden />
              <span className="flex-1">{c.label}</span>
            </li>
          )
        })}
        {hits.map((h) => {
          const key = `${h.kind}:${h.id}`
          const i = indexOf(key)
          const Icon = KIND_ICON[h.kind]
          return (
            <li
              key={key}
              id={`palette-${i}`}
              role="option"
              aria-selected={current === i}
              className={optionClass(key)}
              onMouseEnter={() => setActive(i)}
              onClick={options[i]?.run}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="min-w-0 flex-1">
                <Highlight
                  text={h.kind === 'message' ? h.snippet : (h.title ?? hitTitle(h))}
                  className="block truncate text-text"
                />
              </span>
              <span className="shrink-0 text-caption">{KIND_LABEL[h.kind]}</span>
            </li>
          )
        })}
        {q.trim().length >= 2 ? (
          <li
            id={`palette-${indexOf('all')}`}
            role="option"
            aria-selected={options[current]?.key === 'all'}
            className={optionClass('all')}
            onMouseEnter={() => setActive(indexOf('all'))}
            onClick={options[indexOf('all')]?.run}
          >
            <ArrowRight className="size-4" aria-hidden />
            <span className="flex-1">See all results for “{q.trim()}”</span>
          </li>
        ) : null}
      </ul>
    </div>
  )
}
