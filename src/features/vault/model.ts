/** Vault folders and tags (FR-VAULT-01, 05). */

export interface Folder {
  id: string
  name: string
  parent_id: string | null
  depth: number
  visibility: 'shared' | 'private'
  owner_id: string | null
}

export interface FolderNode extends Folder {
  children: FolderNode[]
}

export const MAX_DEPTH = 4

const byName = (a: { name: string }, b: { name: string }) =>
  a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true })

/** Folders as a tree, siblings sorted by name. Orphans (parent not visible) become roots. */
export function buildTree(folders: Folder[]): FolderNode[] {
  const nodes = new Map<string, FolderNode>(folders.map((f) => [f.id, { ...f, children: [] }]))
  const roots: FolderNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parent_id ? nodes.get(node.parent_id) : undefined
    if (parent) parent.children.push(node)
    else roots.push(node)
  }
  const sort = (list: FolderNode[]) => {
    list.sort(byName)
    list.forEach((n) => sort(n.children))
  }
  sort(roots)
  return roots
}

/** Depth-first list, for folder pickers. */
export function flattenTree(tree: FolderNode[], level = 0): { folder: Folder; level: number }[] {
  return tree.flatMap((n) => [{ folder: n, level }, ...flattenTree(n.children, level + 1)])
}

/** The folders from the top down to `id` (for breadcrumbs). */
export function folderPath(folders: Folder[], id: string | null): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  const seen = new Set<string>()
  for (let f = id ? byId.get(id) : undefined; f && !seen.has(f.id);) {
    seen.add(f.id)
    path.unshift(f)
    f = f.parent_id ? byId.get(f.parent_id) : undefined
  }
  return path
}

/** "Research, #ml , ML" → ["research", "ml"]: lower case, no #, no duplicates, at most 20. */
export function parseTags(input: string): string[] {
  const out: string[] = []
  for (const raw of input.split(/[,\n]/)) {
    const tag = raw.trim().replace(/^#+/, '').replace(/\s+/g, ' ').toLowerCase().slice(0, 40)
    if (tag && !out.includes(tag)) out.push(tag)
  }
  return out.slice(0, 20)
}

/** Every tag in use, most used first. */
export function tagCounts(items: { tags: string[] }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>()
  for (const it of items) for (const t of it.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
}

/** The host of a link, without "www.". */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/** A link the way the database accepts it (adds https:// when missing), or null. */
export function normalizeUrl(input: string): string | null {
  const v = input.trim()
  if (!v || /\s/.test(v)) return null
  const withScheme = /^https?:\/\//i.test(v) ? v : /^[a-z]+:/i.test(v) ? null : `https://${v}`
  if (!withScheme) return null
  try {
    const u = new URL(withScheme)
    return u.hostname.includes('.') || u.hostname === 'localhost' ? withScheme : null
  } catch {
    return null
  }
}
