import * as RadixDialog from '@radix-ui/react-dialog'
import { Paperclip, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { controlClass, inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
import type { Member } from '@/features/workspace'
import { messageForCode, toAppError } from '@/lib/errors'
import { formatDateTime } from '@/lib/format'
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from '../constants'
import { useAddComment, useComments, useCreateTask, useFiles, useUpdateTask } from '../hooks'
import { positionAt, type Task } from '../model'
import { FileList, UploadButton } from './Files'

interface DrawerProps {
  projectId: string
  task: Task | undefined
  tasks: Task[]
  members: Member[]
  viewerTz: string
  onClose: () => void
}

/** Task details in a side sheet, addressed by ?task=<id> so it can be linked (UI spec §15). */
export function TaskDrawer({ projectId, task, tasks, members, viewerTz, onClose }: DrawerProps) {
  return (
    <RadixDialog.Root open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]" />
        <RadixDialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-hairline bg-surface-raised shadow-3 outline-none"
          aria-describedby={undefined}
        >
          {task ? (
            <TaskDetails
              key={task.id}
              projectId={projectId}
              task={task}
              tasks={tasks}
              members={members}
              viewerTz={viewerTz}
              onClose={onClose}
            />
          ) : null}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

function TaskDetails({
  projectId,
  task,
  tasks,
  members,
  viewerTz,
  onClose,
}: DrawerProps & { task: Task }) {
  const update = useUpdateTask(projectId)
  const toast = useToast()
  const { user } = useAuth()
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description ?? '')

  const save = (patch: Parameters<typeof update.mutate>[0]['patch'], message?: string) =>
    update.mutate(
      { id: task.id, patch },
      {
        onSuccess: () => (message ? toast.show(message, 'success') : undefined),
        onError: (e) =>
          toast.show(messageForCode(toAppError(e).code, "Couldn't save the change."), 'error'),
      },
    )

  const subtasks = tasks
    .filter((t) => t.parent_task_id === task.id && !t.deleted_at)
    .sort((a, b) => a.position - b.position)

  return (
    <>
      <header className="flex items-start gap-3 border-b border-hairline p-5">
        <RadixDialog.Title className="sr-only">Task: {task.title}</RadixDialog.Title>
        <textarea
          aria-label="Task title"
          value={title}
          rows={1}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const v = title.trim()
            if (v && v !== task.title) save({ title: v })
            else setTitle(task.title)
          }}
          className="field-sizing-content min-h-9 flex-1 resize-none rounded-[10px] bg-transparent px-1 text-h2 font-semibold outline-none focus-visible:bg-hairline"
        />
        <RadixDialog.Close
          className="grid size-9 place-items-center rounded-full text-muted hover:bg-hairline hover:text-text"
          aria-label="Close task"
        >
          <X className="size-4" aria-hidden />
        </RadixDialog.Close>
      </header>

      <div className="flex-1 space-y-6 overflow-y-auto p-5">
        <dl className="grid grid-cols-[7rem_1fr] items-center gap-x-3 gap-y-2.5 text-body-sm">
          <dt className="text-muted">
            <label htmlFor="task-status">Status</label>
          </dt>
          <dd>
            <select
              id="task-status"
              className={controlClass}
              value={task.status}
              onChange={(e) => {
                const status = e.target.value as TaskStatus
                const column = tasks.filter((t) => t.status === status && !t.parent_task_id)
                save(
                  {
                    status,
                    position: positionAt(
                      column.sort((a, b) => a.position - b.position),
                      column.length,
                    ),
                  },
                  `Moved to ${STATUS_LABELS[status]}`,
                )
              }}
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </dd>
          <dt className="text-muted">
            <label htmlFor="task-priority">Priority</label>
          </dt>
          <dd>
            <select
              id="task-priority"
              className={controlClass}
              value={task.priority}
              onChange={(e) => save({ priority: e.target.value as TaskPriority })}
            >
              {Object.entries(PRIORITY_LABELS).map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
          </dd>
          <dt className="text-muted">
            <label htmlFor="task-assignee">Assignee</label>
          </dt>
          <dd>
            <select
              id="task-assignee"
              className={controlClass}
              value={task.assignee_id ?? ''}
              onChange={(e) => save({ assignee_id: e.target.value || null })}
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.displayName}
                  {m.userId === user?.id ? ' (you)' : ''}
                </option>
              ))}
            </select>
          </dd>
          <dt className="text-muted">
            <label htmlFor="task-due">Due date</label>
          </dt>
          <dd className="flex items-center gap-2">
            <input
              id="task-due"
              type="date"
              className={controlClass}
              value={task.due_date ?? ''}
              onChange={(e) =>
                save({ due_date: e.target.value || null, due_at: null, due_timezone: null })
              }
            />
            {task.due_date ? (
              <button
                type="button"
                className="text-caption text-muted underline"
                onClick={() => save({ due_date: null })}
              >
                Clear
              </button>
            ) : null}
          </dd>
        </dl>

        <div className="space-y-1.5">
          <label htmlFor="task-description" className="eyebrow block">
            Description
          </label>
          <textarea
            id="task-description"
            value={description}
            rows={4}
            maxLength={20000}
            placeholder="Add details, acceptance criteria, links…"
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => {
              if (description !== (task.description ?? ''))
                save({ description: description || null })
            }}
            className={inputClass}
          />
        </div>

        {task.parent_task_id ? null : (
          <Subtasks projectId={projectId} parent={task} subtasks={subtasks} />
        )}
        <Attachments projectId={projectId} taskId={task.id} viewerTz={viewerTz} />
        <Comments taskId={task.id} members={members} viewerTz={viewerTz} />
      </div>

      <footer className="flex justify-between border-t border-hairline p-4">
        <Button
          variant="ghost"
          icon={<Trash2 className="size-4" aria-hidden />}
          onClick={() => {
            save({ deleted_at: new Date().toISOString(), deleted_by: user!.id }, 'Task deleted')
            onClose()
          }}
        >
          Delete
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Done
        </Button>
      </footer>
    </>
  )
}

function Subtasks({
  projectId,
  parent,
  subtasks,
}: {
  projectId: string
  parent: Task
  subtasks: Task[]
}) {
  const create = useCreateTask(projectId)
  const update = useUpdateTask(projectId)
  const [title, setTitle] = useState('')
  return (
    <section aria-labelledby="subtasks-title" className="space-y-2">
      <h3 id="subtasks-title" className="eyebrow">
        Subtasks{' '}
        {subtasks.length
          ? `· ${subtasks.filter((s) => s.status === 'done').length}/${subtasks.length}`
          : ''}
      </h3>
      <ul className="space-y-1">
        {subtasks.map((s) => (
          <li key={s.id} className="flex items-center gap-2.5 text-body-sm">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-primary)]"
              checked={s.status === 'done'}
              aria-label={`Done: ${s.title}`}
              onChange={(e) =>
                update.mutate({ id: s.id, patch: { status: e.target.checked ? 'done' : 'todo' } })
              }
            />
            <span className={s.status === 'done' ? 'text-muted line-through' : ''}>{s.title}</span>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault()
          const v = title.trim()
          if (!v) return
          create.mutate(
            { title: v, parentTaskId: parent.id, position: positionAt(subtasks, subtasks.length) },
            { onSuccess: () => setTitle('') },
          )
        }}
      >
        <input
          aria-label="New subtask"
          placeholder="Add a subtask"
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          className={`${inputClass} py-2`}
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="h-auto"
          loading={create.isPending}
          aria-label="Add subtask"
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </form>
    </section>
  )
}

function Attachments({
  projectId,
  taskId,
  viewerTz,
}: {
  projectId: string
  taskId: string
  viewerTz: string
}) {
  const files = useFiles(projectId)
  const mine = files.data?.filter((f) => f.task_id === taskId) ?? []
  return (
    <section aria-labelledby="attachments-title" className="space-y-2">
      <div className="flex items-center gap-2">
        <h3 id="attachments-title" className="eyebrow flex-1">
          <Paperclip className="mr-1 inline size-3" aria-hidden />
          Attachments
        </h3>
        <UploadButton projectId={projectId} taskId={taskId} size="sm" />
      </div>
      {files.isPending ? (
        <Spinner className="size-4" />
      ) : (
        <FileList projectId={projectId} files={mine} viewerTz={viewerTz} compact />
      )}
    </section>
  )
}

function Comments({
  taskId,
  members,
  viewerTz,
}: {
  taskId: string
  members: Member[]
  viewerTz: string
}) {
  const comments = useComments(taskId)
  const add = useAddComment(taskId)
  const toast = useToast()
  const [body, setBody] = useState('')
  const name = (id: string | null) =>
    members.find((m) => m.userId === id)?.displayName ?? 'Former member'
  return (
    <section aria-labelledby="comments-title" className="space-y-3">
      <h3 id="comments-title" className="eyebrow">
        Comments
      </h3>
      {comments.isPending ? (
        <Spinner className="size-4" />
      ) : comments.error ? (
        <p className="text-body-sm text-danger">Couldn&apos;t load comments.</p>
      ) : comments.data.length === 0 ? (
        <p className="text-body-sm text-muted">No comments yet.</p>
      ) : (
        <ul className="space-y-3" data-testid="comments">
          {comments.data.map((c) => (
            <li key={c.id} className="text-body-sm">
              <p className="text-caption text-muted">
                <span className="font-medium text-text">{name(c.author_id)}</span> ·{' '}
                {formatDateTime(c.created_at, viewerTz)}
              </p>
              <p className="mt-0.5 whitespace-pre-line">{c.body}</p>
            </li>
          ))}
        </ul>
      )}
      <form
        className="space-y-2"
        onSubmit={(e) => {
          e.preventDefault()
          const v = body.trim()
          if (!v) return
          add.mutate(v, {
            onSuccess: () => setBody(''),
            onError: () => toast.show("Couldn't post the comment.", 'error'),
          })
        }}
      >
        <textarea
          aria-label="Write a comment"
          placeholder="Write a comment"
          rows={2}
          maxLength={5000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className={inputClass}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" loading={add.isPending} disabled={!body.trim()}>
            Comment
          </Button>
        </div>
      </form>
    </section>
  )
}
