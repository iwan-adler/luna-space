/** Search results and highlighting (FR-PLAT-11, FR-VAULT-06). */

export type SearchKind =
  'note' | 'bookmark' | 'file' | 'message' | 'opportunity' | 'task' | 'project'

export interface SearchHit {
  kind: SearchKind
  id: string
  title: string | null
  snippet: string | null
  project_id: string | null
  folder_id: string | null
  rank: number
  updated_at: string
}

export const KIND_LABEL: Record<SearchKind, string> = {
  note: 'Note',
  bookmark: 'Link',
  file: 'File',
  message: 'Message',
  opportunity: 'Opportunity',
  task: 'Task',
  project: 'Project',
}

export interface Segment {
  text: string
  hit: boolean
}

/** Splits the database's ⟦match⟧ markers into plain segments (never rendered as HTML). */
export function parseHighlights(s: string | null | undefined): Segment[] {
  if (!s) return []
  const out: Segment[] = []
  const re = /⟦([^⟧]*)⟧/g
  let last = 0
  for (let m = re.exec(s); m; m = re.exec(s)) {
    if (m.index > last) out.push({ text: s.slice(last, m.index), hit: false })
    out.push({ text: m[1] ?? '', hit: true })
    last = m.index + m[0].length
  }
  if (last < s.length) out.push({ text: s.slice(last), hit: false })
  return out
}

/** The text without markers, e.g. for accessible names. */
export function plainText(s: string | null | undefined): string {
  return (s ?? '').replace(/[⟦⟧]/g, '')
}

/** Where a result opens. */
export function hitHref(hit: SearchHit): string {
  const vault = (tab: string) => `/vault${hit.folder_id ? `/${hit.folder_id}` : ''}?tab=${tab}`
  switch (hit.kind) {
    case 'note':
      return `/notes/${hit.id}`
    case 'bookmark':
      return vault('links')
    case 'file':
      return hit.project_id && !hit.folder_id ? `/projects/${hit.project_id}/files` : vault('files')
    case 'message':
      return '/chat'
    case 'opportunity':
      return `/opportunities/${hit.id}`
    case 'task':
      return hit.project_id ? `/projects/${hit.project_id}/board` : '/tasks'
    case 'project':
      return `/projects/${hit.id}`
  }
}

/** A title for results that have none (messages): the start of the snippet. */
export function hitTitle(hit: SearchHit): string {
  if (hit.title) return hit.title
  return hit.kind === 'message' ? 'Chat message' : KIND_LABEL[hit.kind]
}
