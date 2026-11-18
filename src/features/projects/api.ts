import { AppError, toAppError } from '@/lib/errors'
import { requireSupabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import type { ProjectCategory, ProjectStage } from './constants'
import type {
  ActivityRow,
  Checklist,
  ChecklistItem,
  FileRow,
  Project,
  Task,
  TaskComment,
  Template,
} from './model'
import { storagePath } from './model'

type Tables = Database['public']['Tables']
export type TaskPatch = Tables['tasks']['Update']
export type ProjectPatch = Tables['projects']['Update']

const PROJECT_COLUMNS =
  'id, workspace_id, owner_id, visibility, opportunity_id, name, category, summary, stage, start_date, end_date, repo_urls, links, created_at, updated_at, deleted_at, deleted_by'
const TASK_COLUMNS =
  'id, workspace_id, owner_id, visibility, project_id, parent_task_id, title, description, status, priority, assignee_id, due_date, due_at, due_timezone, position, tags, client_id, completed_at, created_at, updated_at, deleted_at, deleted_by'

const db = () => requireSupabase()

// Projects -----------------------------------------------------------------------------------

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await db()
    .from('projects')
    .select(PROJECT_COLUMNS)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
    .limit(300)
  if (error) throw toAppError(error)
  return data
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await db()
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}

export async function projectForOpportunity(opportunityId: string): Promise<Project | null> {
  const { data, error } = await db()
    .from('projects')
    .select(PROJECT_COLUMNS)
    .eq('opportunity_id', opportunityId)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw toAppError(error)
  return data
}

export interface NewProject {
  name: string
  category: ProjectCategory
  stage: ProjectStage
  visibility: 'shared' | 'private'
  summary: string | null
}

export async function createProject(
  workspaceId: string,
  userId: string,
  input: NewProject,
): Promise<string> {
  const { data, error } = await db()
    .from('projects')
    .insert({ ...input, workspace_id: workspaceId, owner_id: userId })
    .select('id')
    .single()
  if (error) throw toAppError(error)
  return data.id
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<void> {
  const { error } = await db().from('projects').update(patch).eq('id', id)
  if (error) throw toAppError(error)
}

export async function convertOpportunity(opportunityId: string): Promise<string> {
  const { data, error } = await db().rpc('convert_opportunity_to_project', {
    p_opportunity: opportunityId,
  })
  if (error) throw toAppError(error)
  return data
}

// Tasks --------------------------------------------------------------------------------------

export async function listProjectTasks(projectId: string): Promise<Task[]> {
  const { data, error } = await db()
    .from('tasks')
    .select(TASK_COLUMNS)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('position')
    .limit(1000)
  if (error) throw toAppError(error)
  return data
}

export type MyTask = Task & { project: Pick<Project, 'id' | 'name'> | null }

/** Open tasks assigned to the viewer, across every project they can see (FR-PRJ-06). */
export async function listMyTasks(userId: string): Promise<MyTask[]> {
  const { data, error } = await db()
    .from('tasks')
    .select(`${TASK_COLUMNS}, project:projects(id, name)`)
    .eq('assignee_id', userId)
    .neq('status', 'done')
    .is('deleted_at', null)
    .order('due_date', { ascending: true, nullsFirst: false })
    .limit(300)
  if (error) throw toAppError(error)
  return data
}

export interface NewTask {
  workspaceId: string
  ownerId: string
  projectId: string
  parentTaskId?: string | null
  title: string
  status?: Task['status']
  position: number
  clientId: string
}

export async function createTask(input: NewTask): Promise<Task> {
  const { data, error } = await db()
    .from('tasks')
    .insert({
      workspace_id: input.workspaceId,
      owner_id: input.ownerId,
      project_id: input.projectId,
      parent_task_id: input.parentTaskId ?? null,
      title: input.title,
      status: input.status ?? 'todo',
      position: input.position,
      client_id: input.clientId,
    })
    .select(TASK_COLUMNS)
    .single()
  if (error) throw toAppError(error)
  return data
}

export async function updateTask(id: string, patch: TaskPatch): Promise<void> {
  const { error } = await db().from('tasks').update(patch).eq('id', id)
  if (error) throw toAppError(error)
}

export async function listComments(taskId: string): Promise<TaskComment[]> {
  const { data, error } = await db()
    .from('task_comments')
    .select('*')
    .eq('task_id', taskId)
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw toAppError(error)
  return data
}

export async function addComment(
  workspaceId: string,
  taskId: string,
  userId: string,
  body: string,
): Promise<void> {
  // The database copies workspace_id from the task regardless of what is sent.
  const { error } = await db()
    .from('task_comments')
    .insert({ workspace_id: workspaceId, task_id: taskId, author_id: userId, body })
  if (error) throw toAppError(error)
}

// Files --------------------------------------------------------------------------------------

export async function listFiles(projectId: string, taskId?: string): Promise<FileRow[]> {
  let q = db()
    .from('files')
    .select('*')
    .eq('project_id', projectId)
    .eq('upload_state', 'stored')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
  if (taskId) q = q.eq('task_id', taskId)
  const { data, error } = await q
  if (error) throw toAppError(error)
  return data
}

/** Three steps: metadata row (pending) → storage upload → server-side confirmation. */
export async function uploadFile(args: {
  workspaceId: string
  userId: string
  projectId: string
  taskId?: string | null
  file: File
}): Promise<void> {
  const id = crypto.randomUUID()
  const path = storagePath(args.workspaceId, id, args.file.name)
  const { error: rowError } = await db()
    .from('files')
    .insert({
      id,
      workspace_id: args.workspaceId,
      owner_id: args.userId,
      storage_path: path,
      file_name: args.file.name.slice(0, 255),
      mime_type: args.file.type,
      size_bytes: args.file.size,
      project_id: args.projectId,
      task_id: args.taskId ?? null,
    })
  if (rowError) throw toAppError(rowError)
  const { error: upError } = await db()
    .storage.from('workspace-files')
    .upload(path, args.file, { contentType: args.file.type, upsert: false })
  if (upError) throw new AppError(`Upload failed: ${upError.message}`)
  const { error: confirmError } = await db().rpc('confirm_upload', { p_file: id })
  if (confirmError) throw toAppError(confirmError)
}

export async function signedFileUrl(path: string): Promise<string> {
  const { data, error } = await db().storage.from('workspace-files').createSignedUrl(path, 60, {
    download: true,
  })
  if (error) throw new AppError('Could not open the file.')
  return data.signedUrl
}

export async function deleteFile(id: string, userId: string): Promise<void> {
  const { error } = await db()
    .from('files')
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq('id', id)
  if (error) throw toAppError(error)
}

// Checklists ---------------------------------------------------------------------------------

export type ChecklistWithItems = Checklist & { items: ChecklistItem[] }

export async function listChecklists(projectId: string): Promise<ChecklistWithItems[]> {
  const { data, error } = await db()
    .from('checklists')
    .select('*, items:checklist_items(*)')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at')
  if (error) throw toAppError(error)
  return data.map((c) => ({ ...c, items: [...c.items].sort((a, b) => a.position - b.position) }))
}

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await db()
    .from('templates')
    .select('*')
    .in('kind', ['submission_checklist', 'pitch'])
    .order('is_builtin', { ascending: false })
    .order('title')
  if (error) throw toAppError(error)
  return data
}

export async function checklistFromTemplate(
  projectId: string,
  templateId: string,
): Promise<string> {
  const { data, error } = await db().rpc('create_checklist_from_template', {
    p_project: projectId,
    p_template: templateId,
  })
  if (error) throw toAppError(error)
  return data
}

export async function saveChecklistAsTemplate(checklistId: string, title: string): Promise<void> {
  const { error } = await db().rpc('save_checklist_as_template', {
    p_checklist: checklistId,
    p_title: title,
  })
  if (error) throw toAppError(error)
}

export async function setItemDone(id: string, done: boolean): Promise<void> {
  const { error } = await db().from('checklist_items').update({ is_done: done }).eq('id', id)
  if (error) throw toAppError(error)
}

export async function addChecklistItem(
  workspaceId: string,
  checklistId: string,
  label: string,
  position: number,
) {
  const { error } = await db()
    .from('checklist_items')
    .insert({ workspace_id: workspaceId, checklist_id: checklistId, label, position })
  if (error) throw toAppError(error)
}

// Activity -----------------------------------------------------------------------------------

export async function listProjectActivity(projectId: string): Promise<ActivityRow[]> {
  const { data, error } = await db()
    .from('activity_log')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw toAppError(error)
  return data
}
