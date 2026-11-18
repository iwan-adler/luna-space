import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuth } from '@/features/auth'
import { useCurrentWorkspace } from '@/features/workspace'
import { requireSupabase } from '@/lib/supabase'
import {
  addChecklistItem,
  addComment,
  checklistFromTemplate,
  convertOpportunity,
  createProject,
  createTask,
  deleteFile,
  getProject,
  listChecklists,
  listComments,
  listFiles,
  listMyTasks,
  listProjectActivity,
  listProjects,
  listProjectTasks,
  listTemplates,
  projectForOpportunity,
  saveChecklistAsTemplate,
  setFileGuestVisible,
  setItemDone,
  updateProject,
  updateTask,
  uploadFile,
  type ChecklistWithItems,
  type NewProject,
  type ProjectPatch,
  type TaskPatch,
} from './api'
import type { Task } from './model'
import { useRoom } from './room'

export const projectKeys = {
  all: ['projects'] as const,
  list: () => ['projects', 'list'] as const,
  detail: (id: string) => ['projects', 'detail', id] as const,
  forOpportunity: (oppId: string) => ['projects', 'for-opp', oppId] as const,
  tasks: (id: string) => ['projects', 'tasks', id] as const,
  myTasks: () => ['projects', 'my-tasks'] as const,
  comments: (taskId: string) => ['projects', 'comments', taskId] as const,
  files: (id: string) => ['projects', 'files', id] as const,
  checklists: (id: string) => ['projects', 'checklists', id] as const,
  templates: () => ['projects', 'templates'] as const,
  activity: (id: string) => ['projects', 'activity', id] as const,
}

export function useProjects() {
  return useQuery({ queryKey: projectKeys.list(), queryFn: listProjects })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: projectKeys.detail(id),
    queryFn: () => getProject(id),
    enabled: !!id,
  })
}

export function useProjectForOpportunity(oppId: string) {
  return useQuery({
    queryKey: projectKeys.forOpportunity(oppId),
    queryFn: () => projectForOpportunity(oppId),
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useCurrentWorkspace()
  return useMutation({
    mutationFn: (input: NewProject) => createProject(workspaceId, user!.id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useUpdateProject(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: ProjectPatch) => updateProject(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.all }),
  })
}

export function useConvertOpportunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: convertOpportunity,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: projectKeys.all })
      void qc.invalidateQueries({ queryKey: ['opp'] })
    },
  })
}

// Tasks --------------------------------------------------------------------------------------

export function useProjectTasks(projectId: string) {
  return useQuery({
    queryKey: projectKeys.tasks(projectId),
    queryFn: () => listProjectTasks(projectId),
  })
}

export function useMyTasks() {
  const { user } = useAuth()
  return useQuery({ queryKey: projectKeys.myTasks(), queryFn: () => listMyTasks(user!.id) })
}

interface CreateTaskArgs {
  title: string
  status?: Task['status']
  parentTaskId?: string
}

/**
 * Adds a task at the end of its column (or subtask list). The card appears at once with a
 * temporary id, and its position is taken from what is already on screen, so several quick
 * adds keep the order they were typed in.
 */
export function useCreateTask(projectId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useRoom()
  const key = projectKeys.tasks(projectId)
  const tempId = (clientId: string) => `temp-${clientId}`
  const mutation = useMutation({
    mutationFn: (args: CreateTaskArgs & { position: number; clientId: string }) =>
      createTask({
        workspaceId,
        ownerId: user!.id,
        projectId,
        title: args.title,
        status: args.status ?? 'todo',
        position: args.position,
        parentTaskId: args.parentTaskId ?? null,
        clientId: args.clientId,
      }),
    onMutate: (args) => {
      const now = new Date().toISOString()
      const temp: Task = {
        id: tempId(args.clientId),
        workspace_id: workspaceId,
        owner_id: user?.id ?? null,
        visibility: 'shared',
        project_id: projectId,
        parent_task_id: args.parentTaskId ?? null,
        title: args.title,
        description: null,
        status: args.status ?? 'todo',
        priority: 'medium',
        assignee_id: null,
        due_date: null,
        due_at: null,
        due_timezone: null,
        position: args.position,
        tags: [],
        client_id: args.clientId,
        completed_at: null,
        guest_visible: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        deleted_by: null,
      }
      qc.setQueryData<Task[]>(key, (old) => [...(old ?? []), temp])
    },
    onSuccess: (task, args) => {
      qc.setQueryData<Task[]>(key, (old) => [
        ...(old ?? []).filter((t) => t.id !== tempId(args.clientId) && t.id !== task.id),
        task,
      ])
      void qc.invalidateQueries({ queryKey: projectKeys.activity(projectId) })
    },
    onError: (_e, args) => {
      qc.setQueryData<Task[]>(key, (old) => old?.filter((t) => t.id !== tempId(args.clientId)))
    },
  })

  const add = (args: CreateTaskArgs, options?: Parameters<typeof mutation.mutate>[1]) => {
    const siblings = (qc.getQueryData<Task[]>(key) ?? []).filter((t) =>
      args.parentTaskId
        ? t.parent_task_id === args.parentTaskId
        : !t.parent_task_id && t.status === (args.status ?? 'todo'),
    )
    const position = siblings.reduce((max, t) => Math.max(max, t.position), 0) + 1024
    mutation.mutate({ ...args, position, clientId: crypto.randomUUID() }, options)
  }
  return { ...mutation, mutate: add }
}

/** Optimistic task update; rolls back and refetches when the server refuses it. */
export function useUpdateTask(projectId: string) {
  const qc = useQueryClient()
  const key = projectKeys.tasks(projectId)
  return useMutation({
    mutationFn: (args: { id: string; patch: TaskPatch }) => updateTask(args.id, args.patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<Task[]>(key)
      qc.setQueryData<Task[]>(key, (old) =>
        old?.map((t) => (t.id === id ? ({ ...t, ...patch } as Task) : t)),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key })
      void qc.invalidateQueries({ queryKey: projectKeys.myTasks() })
      void qc.invalidateQueries({ queryKey: projectKeys.activity(projectId) })
    },
  })
}

export function useComments(taskId: string) {
  return useQuery({ queryKey: projectKeys.comments(taskId), queryFn: () => listComments(taskId) })
}

export function useAddComment(taskId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useRoom()
  return useMutation({
    mutationFn: (body: string) => addComment(workspaceId, taskId, user!.id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.comments(taskId) }),
  })
}

// Files --------------------------------------------------------------------------------------

export function useFiles(projectId: string) {
  return useQuery({ queryKey: projectKeys.files(projectId), queryFn: () => listFiles(projectId) })
}

export function useUploadFile(projectId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  const { workspaceId } = useRoom()
  return useMutation({
    mutationFn: (args: { file: File; taskId?: string | null }) =>
      uploadFile({
        workspaceId,
        userId: user!.id,
        projectId,
        taskId: args.taskId ?? null,
        file: args.file,
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: projectKeys.files(projectId) }),
  })
}

export function useSetFileGuestVisible(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { id: string; visible: boolean }) =>
      setFileGuestVisible(args.id, args.visible),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.files(projectId) }),
  })
}

export function useDeleteFile(projectId: string) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: (id: string) => deleteFile(id, user!.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.files(projectId) }),
  })
}

// Checklists ---------------------------------------------------------------------------------

export function useChecklists(projectId: string) {
  return useQuery({
    queryKey: projectKeys.checklists(projectId),
    queryFn: () => listChecklists(projectId),
  })
}

export function useTemplates() {
  return useQuery({ queryKey: projectKeys.templates(), queryFn: listTemplates, staleTime: 300_000 })
}

export function useChecklistFromTemplate(projectId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (templateId: string) => checklistFromTemplate(projectId, templateId),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.checklists(projectId) }),
  })
}

export function useSaveAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { checklistId: string; title: string }) =>
      saveChecklistAsTemplate(args.checklistId, args.title),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.templates() }),
  })
}

export function useToggleItem(projectId: string) {
  const qc = useQueryClient()
  const key = projectKeys.checklists(projectId)
  return useMutation({
    mutationFn: (args: { id: string; done: boolean }) => setItemDone(args.id, args.done),
    onMutate: async ({ id, done }) => {
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<ChecklistWithItems[]>(key)
      qc.setQueryData<ChecklistWithItems[]>(key, (old) =>
        old?.map((c) => ({
          ...c,
          items: c.items.map((i) => (i.id === id ? { ...i, is_done: done } : i)),
        })),
      )
      return { previous }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  })
}

export function useAddChecklistItem(projectId: string) {
  const qc = useQueryClient()
  const { workspaceId } = useRoom()
  return useMutation({
    mutationFn: (args: { checklistId: string; label: string; position: number }) =>
      addChecklistItem(workspaceId, args.checklistId, args.label, args.position),
    onSuccess: () => qc.invalidateQueries({ queryKey: projectKeys.checklists(projectId) }),
  })
}

export function useProjectActivity(projectId: string) {
  return useQuery({
    queryKey: projectKeys.activity(projectId),
    queryFn: () => listProjectActivity(projectId),
  })
}

/**
 * Live updates for a project room (TRD §9). Realtime applies RLS to every change event,
 * so the partner sees only what they could read anyway. Events only trigger refetches.
 */
export function useProjectRealtime(projectId: string) {
  const qc = useQueryClient()
  useEffect(() => {
    if (!projectId) return
    const client = requireSupabase()
    const invalidate = (key: readonly unknown[]) => () =>
      void qc.invalidateQueries({ queryKey: key })
    const channel = client
      .channel(`project:${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks', filter: `project_id=eq.${projectId}` },
        () => {
          void qc.invalidateQueries({ queryKey: projectKeys.tasks(projectId) })
          void qc.invalidateQueries({ queryKey: projectKeys.activity(projectId) })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
        invalidate(projectKeys.detail(projectId)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'files', filter: `project_id=eq.${projectId}` },
        invalidate(projectKeys.files(projectId)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'checklist_items' },
        invalidate(projectKeys.checklists(projectId)),
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_guest_memberships',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          void qc.invalidateQueries({ queryKey: ['projects', 'people', projectId] })
          void qc.invalidateQueries({ queryKey: ['projects', 'guest-memberships', projectId] })
          void qc.invalidateQueries({ queryKey: ['projects', 'my-guest-rooms'] })
        },
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'task_comments' },
        (p) => {
          const taskId = (p.new as { task_id?: string }).task_id
          if (taskId) void qc.invalidateQueries({ queryKey: projectKeys.comments(taskId) })
        },
      )
      .subscribe()
    return () => {
      void client.removeChannel(channel)
    }
  }, [projectId, qc])
}
