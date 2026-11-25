import { celebrate } from '@/lib/visuals'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { EmptyState } from '@/components/patterns/EmptyState'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { SelectField } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'
import { inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import type { ChecklistWithItems } from '../api'
import {
  useAddChecklistItem,
  useChecklistFromTemplate,
  useChecklists,
  useSaveAsTemplate,
  useTemplates,
  useToggleItem,
} from '../hooks'
import { checklistProgress, positionAt } from '../model'
import type { RoomPermissions } from '../room'

/** Submission checklists from templates (FR-PRJ-08/09, FR-AUTO-08). */
export function ChecklistTab({ projectId, perms }: { projectId: string; perms: RoomPermissions }) {
  const checklists = useChecklists(projectId)
  const [choosing, setChoosing] = useState(false)

  if (checklists.isPending) return <PageSpinner label="Loading checklists" />
  if (checklists.error)
    return (
      <Alert tone="danger">
        Couldn&apos;t load checklists.{' '}
        <button type="button" className="underline" onClick={() => checklists.refetch()}>
          Retry
        </button>
      </Alert>
    )
  return (
    <div className="space-y-4">
      {checklists.data.length === 0 ? (
        <EmptyState
          title="No checklist yet"
          action={
            perms.manageChecklists ? (
              <Button onClick={() => setChoosing(true)}>Start from a template</Button>
            ) : undefined
          }
        >
          {perms.manageChecklists
            ? 'Never miss a submission requirement: start from a ready-made checklist and tick items off together.'
            : 'Checklists the team shares with guests appear here.'}
        </EmptyState>
      ) : (
        <>
          {perms.manageChecklists ? (
            <div className="flex justify-end">
              <Button
                variant="secondary"
                icon={<Plus className="size-4" aria-hidden />}
                onClick={() => setChoosing(true)}
              >
                Add checklist
              </Button>
            </div>
          ) : null}
          {checklists.data.map((c) => (
            <ChecklistCard key={c.id} projectId={projectId} checklist={c} perms={perms} />
          ))}
        </>
      )}
      <TemplatePicker projectId={projectId} open={choosing} onOpenChange={setChoosing} />
    </div>
  )
}

function ChecklistCard({
  projectId,
  checklist,
  perms,
}: {
  projectId: string
  checklist: ChecklistWithItems
  perms: RoomPermissions
}) {
  const toggle = useToggleItem(projectId)
  const addItem = useAddChecklistItem(projectId)
  const saveTemplate = useSaveAsTemplate()
  const toast = useToast()
  const [label, setLabel] = useState('')
  const progress = checklistProgress(checklist.items)

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="flex-1 text-h3 font-semibold">{checklist.title}</h2>
        <span className="text-caption text-muted" data-testid="checklist-progress">
          {progress.done} of {progress.total} done
        </span>
        {perms.manageChecklists ? (
          <Button
            variant="ghost"
            size="sm"
            loading={saveTemplate.isPending}
            onClick={() =>
              saveTemplate.mutate(
                { checklistId: checklist.id, title: `${checklist.title} (copy)` },
                { onSuccess: () => toast.show('Saved as a template', 'success') },
              )
            }
          >
            Save as template
          </Button>
        ) : null}
      </div>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-hairline"
        role="progressbar"
        aria-label={`${checklist.title} progress`}
        aria-valuenow={progress.percent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${progress.percent}%` }}
        />
      </div>
      <ul className="mt-4 space-y-1.5">
        {checklist.items.map((i) => (
          <li key={i.id}>
            <label className="custom-checkbox flex cursor-pointer items-center rounded-[10px] px-1.5 py-1 text-body-sm hover:bg-hairline">
              <input
                type="checkbox"
                checked={i.is_done}
                disabled={!perms.editTasks}
                onChange={(e) => {
                  if (e.target.checked) celebrate(e.target)
                  toggle.mutate({ id: i.id, done: e.target.checked })
                }}
              />
              <span className="checkmark" />
              <span className={i.is_done ? 'text-muted line-through' : ''}>{i.label}</span>
            </label>
          </li>
        ))}
      </ul>
      {perms.editTasks ? (
        <form
          className="mt-3 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault()
            const v = label.trim()
            if (!v) return
            addItem.mutate(
              {
                checklistId: checklist.id,
                label: v,
                position: positionAt(checklist.items, checklist.items.length),
              },
              { onSuccess: () => setLabel('') },
            )
          }}
        >
          <input
            aria-label={`Add an item to ${checklist.title}`}
            placeholder="Add an item"
            maxLength={300}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className={`${inputClass} py-2`}
          />
          <Button
            type="submit"
            variant="secondary"
            size="sm"
            className="h-auto"
            aria-label="Add item"
            loading={addItem.isPending}
          >
            <Plus className="size-4" aria-hidden />
          </Button>
        </form>
      ) : null}
    </Card>
  )
}

function TemplatePicker({
  projectId,
  open,
  onOpenChange,
}: {
  projectId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const templates = useTemplates()
  const create = useChecklistFromTemplate(projectId)
  const toast = useToast()
  const [templateId, setTemplateId] = useState('')
  // Submission checklists first, the generic hackathon one on top (FR-AUTO-08).
  const options = [...(templates.data ?? [])].sort(
    (a, b) =>
      Number(b.kind === 'submission_checklist') - Number(a.kind === 'submission_checklist') ||
      Number(b.title === 'Generic hackathon submission') -
        Number(a.title === 'Generic hackathon submission'),
  )
  const selected = templateId || options[0]?.id || ''

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a checklist"
      description="Built-in templates cover common hackathon submissions; your saved templates appear too."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={create.isPending}
            disabled={!selected}
            onClick={() =>
              create.mutate(selected, {
                onSuccess: () => {
                  onOpenChange(false)
                  toast.show('Checklist added', 'success')
                },
                onError: () => toast.show("Couldn't add the checklist.", 'error'),
              })
            }
          >
            Add checklist
          </Button>
        </>
      }
    >
      {templates.isPending ? (
        <PageSpinner />
      ) : (
        <div className="space-y-3">
          <SelectField
            label="Template"
            value={selected}
            onChange={(e) => setTemplateId(e.target.value)}
            options={options.map((t) => ({
              value: t.id,
              label: `${t.title}${t.is_builtin ? '' : ' (saved)'} · ${Array.isArray((t.body as { items?: unknown[] } | null | undefined)?.items) ? (t.body as { items: unknown[] }).items.length : 0} items`,
            }))}
          />
        </div>
      )}
    </Dialog>
  )
}
