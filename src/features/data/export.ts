import { AppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import { EXPORT_TABLES } from './model'

const PAGE = 1000

/**
 * Everything the signed-in member can read, as one JSON document (FR-PLAT-13). It runs in the
 * browser with the member's own session, so Row Level Security decides the contents: their own
 * private items plus everything shared, never the partner's private items. Uploaded files are
 * listed (name, type, size) but their contents are not included.
 */
export async function buildExport(workspaceId: string): Promise<Record<string, unknown>> {
  const db = requireSupabase()
  const tables: Record<string, unknown[]> = {}
  for (const table of EXPORT_TABLES) {
    const rows: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from(table)
        .select('*')
        .range(from, from + PAGE - 1)
      if (error) throw new AppError(`Couldn't read ${table.replace(/_/g, ' ')}.`)
      // Search vectors are derived data, not content.
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const copy = { ...row }
        delete copy.search
        rows.push(copy)
      }
      if (!data || data.length < PAGE) break
    }
    tables[table] = rows
  }
  return {
    format: 'luna-space-export',
    version: 1,
    exported_at: new Date().toISOString(),
    workspace_id: workspaceId,
    note: 'Contains your own items and everything shared in the workspace. File contents are not included.',
    tables,
  }
}

export function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
