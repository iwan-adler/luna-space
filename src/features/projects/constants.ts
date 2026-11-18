import type { Database } from '@/types/database'

type Enums = Database['public']['Enums']
export type ProjectCategory = Enums['project_category']
export type ProjectStage = Enums['project_stage']
export type TaskStatus = Enums['task_status']
export type TaskPriority = Enums['task_priority']

export const CATEGORY_LABELS: Record<ProjectCategory, string> = {
  hackathon: 'Hackathon',
  competition: 'Competition',
  academic: 'Academic',
  practice: 'Practice',
  personal: 'Personal',
  research: 'Research',
  other: 'Other',
}

export const STAGE_LABELS: Record<ProjectStage, string> = {
  idea: 'Idea',
  planning: 'Planning',
  building: 'Building',
  testing: 'Testing',
  submitting: 'Submitting',
  presenting: 'Presenting',
  completed: 'Completed',
  archived: 'Archived',
}

/** Board columns in order (FR-PRJ-03). */
export const TASK_STATUSES: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done']

export const STATUS_LABELS: Record<TaskStatus, string> = {
  backlog: 'Backlog',
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
}

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const PRIORITY_TONES: Record<TaskPriority, 'neutral' | 'info' | 'warning' | 'danger'> = {
  low: 'neutral',
  medium: 'info',
  high: 'warning',
  urgent: 'danger',
}

/** Files accepted by the bucket and the files table (Schema §21). */
export const ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/zip',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text',
]
export const MAX_FILE_BYTES = 25 * 1024 * 1024
