import { celebrate } from '@/lib/visuals'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Paperclip, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { CustomSelect } from '@/components/ui/CustomSelect'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { controlClass, inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { useAuth } from '@/features/auth'
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
import type { RoomPermissions, RoomPerson } from '../room'
import { FileList, UploadButton } from './Files'

interface DrawerProps {
  projectId: string
  task: Task | undefined
  tasks: Task[]
  people: RoomPerson[]
  viewerTz: string
  perms: RoomPermissions
  onClose: () => void
}

/** Task details in a side sheet, addressed by ?task=<id> so it can be linked (UI spec §15). */
export function TaskDrawer({
  projectId,
  task,
  tasks,
  people,
  viewerTz,
  perms,
  onClose,
}: DrawerProps) {
  return (
    <RadixDialog.Root open={Boolean(task)} onOpenChange={(open) => !open && onClose()}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/65 backdrop-blur-sm" />
        <RadixDialog.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-border bg-surface shadow-2xl outline-none"
          aria-describedby={undefined}
        >
          {task ? (
            <TaskDetails
              key={task.id}
              projectId={projectId}
              task={task}
              tasks={tasks}
              people={people}
              viewerTz={viewerTz}
              perms={perms}
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
  people,
  viewerTz,
  perms,
  onClose,
}: DrawerProps & { task: Task }) {
  const readOnly = !perms.editTasks
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
          readOnly={readOnly}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            const v = title.trim()
            if (v && v !== task.title) save({ title: v })
            else setTitle(task.title)
          }}
          className="field-sizing-content min-h-9 flex-1 resize-none rounded-[10px] bg-transparent px-1 text-h2 outline-none focus-visible:bg-hairline"
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
            <span>Status</span>
          </dt>
          <dd>
            <CustomSelect
              ariaLabel="Status"
              disabled={readOnly}
              value={task.status}
              onChange={(val) => {
                const status = val as TaskStatus
                if (status === 'done' && task.status !== 'done') celebrate(document.body)
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
              options={TASK_STATUSES.map((s) => ({
                value: s,
                label: STATUS_LABELS[s],
              }))}
            />
          </dd>
          <dt className="text-muted">
            <span>Priority</span>
          </dt>
          <dd>
            <CustomSelect
              ariaLabel="Priority"
              disabled={readOnly}
              value={task.priority}
              onChange={(val) => save({ priority: val as TaskPriority })}
              options={Object.entries(PRIORITY_LABELS).map(([k, l]) => ({
                value: k,
                label: l,
              }))}
            />
          </dd>
          <dt className="text-muted">
            <span>Assignee</span>
          </dt>
          <dd>
            <CustomSelect
              ariaLabel="Assignee"
              disabled={readOnly}
              value={task.assignee_id ?? ''}
              onChange={(val) => save({ assignee_id: val || null })}
              options={[
                { value: '', label: 'Unassigned' },
                ...people
                  .filter((m) => m.kind === 'member' || task.guest_visible)
                  .map((m) => ({
                    value: m.userId,
                    label: `${m.displayName}${m.userId === user?.id ? ' (you)' : m.kind === 'guest' ? ' (guest)' : ''}`,
                  })),
              ]}
            />
          </dd>
          <dt className="text-muted">
            <label htmlFor="task-due">Due date</label>
          </dt>
          <dd className="flex items-center gap-2">
            <input
              id="task-due"
              disabled={readOnly}
              type="date"
              className={controlClass}
              value={task.due_date ?? ''}
              onChange={(e) =>
                save({ due_date: e.target.value || null, due_at: null, due_timezone: null })
              }
            />
            {task.due_date && !readOnly ? (
              <button
                type="button"
                className="text-caption text-muted underline"
                onClick={() => save({ due_date: null })}
              >
                Clear
              </button>
            ) : null}
          </dd>
          {perms.member && !task.parent_task_id ? (
            <>
              <dt className="text-muted">Guests</dt>
              <dd>
                <Switch
                  checked={task.guest_visible}
                  onCheckedChange={(checked) => save({ guest_visible: checked })}
                  label="Visible to guests"
                />
              </dd>
            </>
          ) : null}
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
            readOnly={readOnly}
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
          <Subtasks projectId={projectId} parent={task} subtasks={subtasks} perms={perms} />
        )}
        <Attachments projectId={projectId} taskId={task.id} viewerTz={viewerTz} perms={perms} />
        <Comments taskId={task.id} people={people} viewerTz={viewerTz} canComment={perms.comment} />
      </div>

      <footer className="flex justify-between border-t border-hairline p-4">
        {readOnly ? (
          <span />
        ) : (
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
        )}
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
  perms,
}: {
  projectId: string
  parent: Task
  subtasks: Task[]
  perms: RoomPermissions
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
          <li key={s.id} className="flex items-center text-body-sm py-0.5">
            <label className="custom-checkbox flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={s.status === 'done'}
                disabled={!perms.editTasks}
                aria-label={`Done: ${s.title}`}
                onChange={(e) => {
                  if (e.target.checked) celebrate(e.target)
                  update.mutate({ id: s.id, patch: { status: e.target.checked ? 'done' : 'todo' } })
                }}
              />
              <span className="checkmark" />
              <span className={s.status === 'done' ? 'text-muted line-through' : ''}>
                {s.title}
              </span>
            </label>
          </li>
        ))}
      </ul>
      {perms.createTasks ? (
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            const v = title.trim()
            if (!v) return
            create.mutate(
              {
                title: v,
                parentTaskId: parent.id,
              },
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
      ) : null}
    </section>
  )
}

function Attachments({
  projectId,
  taskId,
  viewerTz,
  perms,
}: {
  projectId: string
  taskId: string
  viewerTz: string
  perms: RoomPermissions
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
        {perms.upload ? <UploadButton projectId={projectId} taskId={taskId} size="sm" /> : null}
      </div>
      {files.isPending ? (
        <Spinner className="size-4" />
      ) : (
        <FileList projectId={projectId} files={mine} viewerTz={viewerTz} perms={perms} compact />
      )}
    </section>
  )
}

function Comments({
  taskId,
  people,
  viewerTz,
  canComment,
}: {
  taskId: string
  people: RoomPerson[]
  viewerTz: string
  canComment: boolean
}) {
  const comments = useComments(taskId)
  const add = useAddComment(taskId)
  const toast = useToast()
  const [body, setBody] = useState('')
  const name = (id: string | null) => {
    const person = people.find((m) => m.userId === id)
    if (!person) return 'Former member or guest'
    return person.kind === 'guest' ? `${person.displayName} (guest)` : person.displayName
  }
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
      {canComment ? (
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
      ) : null}
    </section>
  )
}
