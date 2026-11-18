import type { Database } from '@/types/database'
import { daysBetween, todayIn, type DateOnly } from '@/lib/dates'
import { TASK_STATUSES, type TaskStatus } from './constants'

type Tables = Database['public']['Tables']
export type Project = Omit<Tables['projects']['Row'], 'search'>
export type Task = Omit<Tables['tasks']['Row'], 'search'>
export type TaskComment = Tables['task_comments']['Row']
export type FileRow = Tables['files']['Row']
export type Checklist = Tables['checklists']['Row']
export type ChecklistItem = Tables['checklist_items']['Row']
export type Template = Tables['templates']['Row']
export type ActivityRow = Tables['activity_log']['Row']

export interface ProjectLink {
  label: string
  url: string
}

export function projectLinks(project: Pick<Project, 'links'>): ProjectLink[] {
  if (!Array.isArray(project.links)) return []
  return project.links.flatMap((l) =>
    l && typeof l === 'object' && !Array.isArray(l) && typeof l.url === 'string'
      ? [{ label: typeof l.label === 'string' ? l.label : l.url, url: l.url }]
      : [],
  )
}

const GAP = 1024

/** Groups top-level tasks into board columns, ordered by position. */
export function groupByStatus(tasks: Task[]): Record<TaskStatus, Task[]> {
  const groups = Object.fromEntries(TASK_STATUSES.map((s) => [s, [] as Task[]])) as Record<
    TaskStatus,
    Task[]
  >
  for (const t of tasks) {
    if (t.parent_task_id || t.deleted_at) continue
    groups[t.status].push(t)
  }
  for (const s of TASK_STATUSES) groups[s].sort((a, b) => a.position - b.position)
  return groups
}

/**
 * Position for an item inserted at `index` of `column` (which must not contain the moved item).
 * Midpoints keep reordering to one row update (Schema §18 `position double precision`).
 */
export function positionAt(column: Pick<Task, 'position'>[], index: number): number {
  const before = column[index - 1]?.position
  const after = column[index]?.position
  if (before === undefined && after === undefined) return GAP
  if (before === undefined) return after! - GAP
  if (after === undefined) return before + GAP
  return (before + after) / 2
}

/** Days until a date-only due date in the viewer's zone (negative when overdue). */
export function dueInDays(due: DateOnly, timeZone: string, now = new Date()): number {
  return daysBetween(todayIn(timeZone, now), due)
}

export function checklistProgress(items: Pick<ChecklistItem, 'is_done'>[]) {
  const done = items.filter((i) => i.is_done).length
  return {
    done,
    total: items.length,
    percent: items.length ? Math.round((done / items.length) * 100) : 0,
  }
}

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
