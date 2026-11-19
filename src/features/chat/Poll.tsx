import { BarChart3, Check, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Card'
import { Dialog } from '@/components/ui/Dialog'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { useSendPoll, useVote, type Message } from './hooks'
import { pollOf } from './polls'

/** A poll inside a chat message: tap an option to vote; bars and names update live. */
export function PollCard({
  message,
  myId,
  nameOf,
}: {
  message: Message
  myId: string
  nameOf: (id: string | null) => string
}) {
  const poll = pollOf(message.metadata)
  const vote = useVote()
  if (!poll) return <p className="italic">This poll can&apos;t be shown.</p>
  const voters = new Set(message.votes.map((v) => v.user_id))
  const total = voters.size
  return (
    <div className="w-[min(70vw,20rem)] space-y-2.5" data-testid="poll">
      <p className="flex items-start gap-2 font-semibold">
        <BarChart3 className="mt-0.5 size-4 shrink-0 text-highlight" aria-hidden />
        {poll.question}
      </p>
      <ul className="space-y-1.5">
        {poll.options.map((option, i) => {
          const votes = message.votes.filter((v) => v.option_index === i)
          const mine = votes.some((v) => v.user_id === myId)
          const share = total ? votes.length / total : 0
          return (
            <li key={i}>
              <button
                type="button"
                aria-pressed={mine}
                aria-label={`${option}: ${votes.length} vote${votes.length === 1 ? '' : 's'}`}
                disabled={vote.isPending}
                onClick={() => vote.mutate({ messageId: message.id, option: i, on: !mine })}
                className={`relative w-full overflow-hidden rounded-[12px] border px-3 py-2 text-left text-body-sm transition-colors ${mine ? 'border-primary/60' : 'border-hairline hover:border-border'}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-y-0 left-0 bg-primary/20 transition-[width] duration-500"
                  style={{ width: `${share * 100}%` }}
                />
                <span className="relative flex items-center gap-2">
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full border ${mine ? 'border-primary bg-primary text-[var(--color-on-primary)]' : 'border-border'}`}
                    aria-hidden
                  >
                    {mine ? <Check className="size-3" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{option}</span>
                  <span className="stat-number text-caption">{votes.length}</span>
                </span>
                {votes.length ? (
                  <span className="relative mt-1 block truncate text-[11px] text-muted">
                    {votes.map((v) => nameOf(v.user_id)).join(', ')}
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-caption text-muted">
        {total} {total === 1 ? 'person' : 'people'} voted
        {poll.multi ? ' · choose any' : ' · choose one'}
      </p>
    </div>
  )
}

/** Composer dialog to start a poll. Mount with a key to reset. */
export function PollDialog({ onClose }: { onClose: () => void }) {
  const send = useSendPoll()
  const toast = useToast()
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [multi, setMulti] = useState(false)
  const filled = options.map((o) => o.trim()).filter(Boolean)
  const valid = question.trim().length > 0 && filled.length >= 2

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!valid) return
    send.mutate(
      { question: question.trim(), options: filled.map((o) => o.slice(0, 100)), multi },
      { onSuccess: () => (toast.show('Poll sent', 'success'), onClose()) },
    )
  }

  return (
    <Dialog open onOpenChange={(o) => (o ? null : onClose())} title="Start a poll">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <TextField
          label="Question"
          placeholder="Which track should we pick?"
          maxLength={200}
          autoFocus
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <fieldset className="space-y-2">
          <legend className="mb-1 text-body-sm font-medium text-muted">Options</legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                aria-label={`Option ${i + 1}`}
                value={o}
                maxLength={100}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => setOptions(options.map((x, j) => (j === i ? e.target.value : x)))}
                className="w-full rounded-[12px] border border-hairline bg-surface-raised px-3.5 py-2 text-body-sm outline-none focus-visible:border-primary/60"
              />
              {options.length > 2 ? (
                <button
                  type="button"
                  className="icon-btn size-8 shrink-0"
                  aria-label={`Remove option ${i + 1}`}
                  onClick={() => setOptions(options.filter((_, j) => j !== i))}
                >
                  <X className="size-4" aria-hidden />
                </button>
              ) : null}
            </div>
          ))}
          {options.length < 8 ? (
            <Button
              size="sm"
              variant="ghost"
              icon={<Plus className="size-4" aria-hidden />}
              onClick={() => setOptions([...options, ''])}
            >
              Add option
            </Button>
          ) : null}
        </fieldset>
        <label className="flex items-center gap-2 text-body-sm text-muted">
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          Allow choosing more than one
        </label>
        {send.error ? <Alert tone="danger">{send.error.message}</Alert> : null}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={send.isPending} disabled={!valid}>
            Send poll
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
