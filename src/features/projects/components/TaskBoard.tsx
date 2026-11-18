import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type KeyboardCoordinateGetter,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { CalendarClock, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Badge } from '@/components/ui/Badge'
import { inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import type { Member } from '@/features/workspace'
import { formatDateOnly } from '@/lib/dates'
import {
  PRIORITY_LABELS,
  PRIORITY_TONES,
  STATUS_LABELS,
  TASK_STATUSES,
  type TaskStatus,
} from '../constants'
import { useCreateTask, useUpdateTask } from '../hooks'
import { dueInDays, groupByStatus, positionAt, type Task } from '../model'

interface BoardProps {
  projectId: string
  tasks: Task[]
  members: Member[]
  viewerTz: string
}

/**
 * Five-column board (FR-PRJ-03). Drag with a pointer, touch (long press) or the keyboard
 * (Space to lift, arrows to move, Space to drop); the task drawer also has a status menu.
 */
export function TaskBoard({ projectId, tasks, members, viewerTz }: BoardProps) {
  const update = useUpdateTask(projectId)
  const toast = useToast()
  const groups = useMemo(() => groupByStatus(tasks), [tasks])
  const subtaskCounts = useMemo(() => {
    const counts = new Map<string, { done: number; total: number }>()
    for (const t of tasks) {
      if (!t.parent_task_id) continue
      const c = counts.get(t.parent_task_id) ?? { done: 0, total: 0 }
      c.total += 1
      if (t.status === 'done') c.done += 1
      counts.set(t.parent_task_id, c)
    }
    return counts
  }, [tasks])
  const [activeId, setActiveId] = useState<string | null>(null)
  const active = activeId ? tasks.find((t) => t.id === activeId) : undefined

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: boardKeyboardCoordinates }),
  )

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const task = tasks.find((t) => t.id === e.active.id)
    if (!task || !e.over) return
    const overId = String(e.over.id)
    const overTask = tasks.find((t) => t.id === overId)
    const status = (overTask ? overTask.status : overId.replace('column:', '')) as TaskStatus
    if (!TASK_STATUSES.includes(status)) return
    const column = groups[status].filter((t) => t.id !== task.id)
    const index = overTask ? column.findIndex((t) => t.id === overTask.id) : column.length
    const before = groups[status].findIndex((t) => t.id === task.id)
    const after = overTask ? groups[status].findIndex((t) => t.id === overTask.id) : -1
    // Moving down within the same column lands after the target, not before it.
    const target = status === task.status && before !== -1 && after > before ? index + 1 : index
    const position = positionAt(column, target < 0 ? column.length : target)
    if (status === task.status && position === task.position) return
    update.mutate(
      { id: task.id, patch: { status, position } },
      { onError: () => toast.show("Couldn't move the task. It was put back.", 'error') },
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        announcements: {
          onDragStart: ({ active: a }) => `Picked up ${titleOf(tasks, a.id)}.`,
          onDragOver: ({ over }) => (over ? `Over ${labelOf(tasks, over.id)}.` : undefined),
          onDragEnd: ({ active: a, over }) =>
            over ? `Dropped ${titleOf(tasks, a.id)} in ${labelOf(tasks, over.id)}.` : 'Dropped.',
          onDragCancel: ({ active: a }) => `Cancelled moving ${titleOf(tasks, a.id)}.`,
        },
      }}
    >
      <div
        className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-5 md:px-0"
        data-testid="task-board"
      >
        {TASK_STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            tasks={groups[status]}
            projectId={projectId}
            members={members}
            viewerTz={viewerTz}
            subtaskCounts={subtaskCounts}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <TaskCardView task={active} members={members} viewerTz={viewerTz} lifted />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

/**
 * Left and right move a lifted card to the neighbouring column; up and down reorder within a
 * column (the default sortable behaviour only moves within one list).
 */
const boardKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { active, over, droppableRects, droppableContainers } = args.context
  if ((event.code === 'ArrowRight' || event.code === 'ArrowLeft') && active) {
    event.preventDefault()
    const overId = String(over?.id ?? active.id)
    const container = droppableContainers.get(overId)?.data.current?.sortable?.containerId as
      string | undefined
    const current = (overId.startsWith('column:') ? overId : (container ?? '')).replace(
      /^(column|list):/,
      '',
    ) as TaskStatus
    const next =
      TASK_STATUSES[TASK_STATUSES.indexOf(current) + (event.code === 'ArrowRight' ? 1 : -1)]
    const rect = next ? droppableRects.get(`column:${next}`) : undefined
    return rect ? { x: rect.left + 10, y: rect.top + 40 } : undefined
  }
  return sortableKeyboardCoordinates(event, args)
}

function titleOf(tasks: Task[], id: string | number) {
  return `"${tasks.find((t) => t.id === id)?.title ?? 'task'}"`
}
function labelOf(tasks: Task[], id: string | number) {
  const t = tasks.find((x) => x.id === id)
  const status = (t ? t.status : String(id).replace('column:', '')) as TaskStatus
  return STATUS_LABELS[status] ?? 'a column'
}

function Column({
  status,
  tasks,
  projectId,
  members,
  viewerTz,
  subtaskCounts,
}: {
  status: TaskStatus
  tasks: Task[]
  projectId: string
  members: Member[]
  viewerTz: string
  subtaskCounts: Map<string, { done: number; total: number }>
}) {
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` })
  const create = useCreateTask(projectId)
  const toast = useToast()
  const [title, setTitle] = useState('')

  const add = (e: React.FormEvent) => {
    e.preventDefault()
    const value = title.trim()
    if (!value) return
    create.mutate(
      { title: value, status, position: positionAt(tasks, tasks.length) },
      {
        onSuccess: () => setTitle(''),
        onError: () => toast.show("Couldn't add the task.", 'error'),
      },
    )
  }

  return (
    <section
      ref={setNodeRef}
      aria-label={STATUS_LABELS[status]}
      data-testid={`column-${status}`}
      className={`flex w-[78vw] max-w-72 shrink-0 snap-start flex-col rounded-[18px] border p-2.5 transition-colors md:w-auto md:max-w-none ${isOver ? 'border-primary/40 bg-primary/5' : 'border-hairline'}`}
    >
      <h2 className="eyebrow mb-2.5 px-1.5 pt-1">
        {STATUS_LABELS[status]} <span className="text-muted">· {tasks.length}</span>
      </h2>
      <SortableContext
        id={`list:${status}`}
        items={tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="min-h-10 flex-1 space-y-2">
          {tasks.map((t) => (
            <SortableTask
              key={t.id}
              task={t}
              members={members}
              viewerTz={viewerTz}
              subtasks={subtaskCounts.get(t.id)}
            />
          ))}
        </ul>
      </SortableContext>
      <form onSubmit={add} className="mt-2 flex items-center gap-1.5">
        <label className="sr-only" htmlFor={`add-${status}`}>
          Add a task to {STATUS_LABELS[status]}
        </label>
        <input
          id={`add-${status}`}
          value={title}
          maxLength={300}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add task"
          className={`${inputClass} py-2`}
        />
        <button
          type="submit"
          aria-label={`Add to ${STATUS_LABELS[status]}`}
          disabled={create.isPending}
          className="grid size-9 shrink-0 place-items-center rounded-full text-muted hover:bg-hairline hover:text-text"
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </form>
    </section>
  )
}

function SortableTask({
  task,
  members,
  viewerTz,
  subtasks,
}: {
  task: Task
  members: Member[]
  viewerTz: string
  subtasks: { done: number; total: number } | undefined
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  const [params, setParams] = useSearchParams()
  const open = () => {
    const next = new URLSearchParams(params)
    next.set('task', task.id)
    setParams(next)
  }
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={isDragging ? 'opacity-40' : ''}
      {...attributes}
      {...listeners}
      aria-roledescription="Draggable task"
      onKeyDown={(e) => {
        if (e.key === 'Enter') open()
        listeners?.onKeyDown?.(e)
      }}
      onClick={open}
      data-testid="task-card"
    >
      <TaskCardView task={task} members={members} viewerTz={viewerTz} subtasks={subtasks} />
    </li>
  )
}

export function TaskCardView({
  task,
  members,
  viewerTz,
  subtasks,
  lifted = false,
}: {
  task: Task
  members: Member[]
  viewerTz: string
  subtasks?: { done: number; total: number } | undefined
  lifted?: boolean
}) {
  const assignee = members.find((m) => m.userId === task.assignee_id)
  const days = task.due_date ? dueInDays(task.due_date, viewerTz) : null
  return (
    <div
      className={`cursor-grab rounded-[14px] border border-hairline bg-surface-raised p-3 text-left active:cursor-grabbing ${lifted ? 'shadow-2 ring-1 ring-primary/30' : 'hover:border-border'}`}
    >
      <p className={`text-body-sm ${task.status === 'done' ? 'text-muted line-through' : ''}`}>
        {task.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {task.priority !== 'medium' ? (
          <Badge tone={PRIORITY_TONES[task.priority]}>{PRIORITY_LABELS[task.priority]}</Badge>
        ) : null}
        {task.due_date ? (
          <Badge
            tone={
              task.status === 'done'
                ? 'neutral'
                : days! < 0
                  ? 'danger'
                  : days! <= 2
                    ? 'warning'
                    : 'neutral'
            }
          >
            <CalendarClock className="size-3" aria-hidden />
            {formatDateOnly(task.due_date)}
          </Badge>
        ) : null}
        {subtasks ? (
          <span className="text-caption text-muted">
            {subtasks.done}/{subtasks.total} subtasks
          </span>
        ) : null}
        {assignee ? (
          <span
            title={`Assigned to ${assignee.displayName}`}
            className="ml-auto grid size-6 place-items-center rounded-full bg-primary/15 text-caption font-semibold text-primary"
          >
            <span aria-hidden>{assignee.displayName.slice(0, 1).toUpperCase()}</span>
            <span className="sr-only">Assigned to {assignee.displayName}</span>
          </span>
        ) : null}
      </div>
    </div>
  )
}
