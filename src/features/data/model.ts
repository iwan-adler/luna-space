import type { BinItem, BinKind } from './hooks'

export const BIN_LABEL: Record<BinKind, string> = {
  opportunity: 'Opportunity',
  project: 'Project',
  task: 'Task',
  note: 'Note',
  bookmark: 'Link',
  folder: 'Folder',
  file: 'File',
  event: 'Event',
}

/** Whole days until the item is removed for good (0 = today). */
export function daysLeft(purgeAt: string, now = new Date()): number {
  return Math.max(0, Math.ceil((new Date(purgeAt).getTime() - now.getTime()) / 86_400_000))
}

/** Where a restored item can be opened. */
export function restoredHref(item: Pick<BinItem, 'kind' | 'id' | 'project_id'>): string {
  switch (item.kind) {
    case 'opportunity':
      return `/opportunities/${item.id}`
    case 'project':
      return `/projects/${item.id}`
    case 'task':
      return item.project_id ? `/projects/${item.project_id}/board` : '/tasks'
    case 'note':
      return `/notes/${item.id}`
    case 'folder':
      return `/vault/${item.id}`
    case 'bookmark':
    case 'file':
      return '/vault'
    case 'event':
      return '/calendar'
  }
}

/** Tables in a personal export (FR-PLAT-13), in a readable order. RLS decides the rows. */
export const EXPORT_TABLES = [
  'profiles',
  'workspaces',
  'workspace_members',
  'opportunities',
  'opportunity_dates',
  'projects',
  'project_members',
  'tasks',
  'task_comments',
  'checklists',
  'checklist_items',
  'calendar_events',
  'reminders',
  'notifications',
  'notification_preferences',
  'notes',
  'vault_folders',
  'bookmarks',
  'files',
  'messages',
  'message_reactions',
  'activity_log',
] as const

export function exportFileName(workspaceName: string, today: string): string {
  const slug =
    workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'workspace'
  return `luna-space-${slug}-${today}.json`
}
