import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { DateTimeInput } from '@/components/patterns/DateTimeInput'
import { Button } from '@/components/ui/Button'
import { Alert, Card } from '@/components/ui/Card'
import { SelectField, TextField } from '@/components/ui/Field'
import { PageSpinner } from '@/components/ui/Spinner'
import { inputClass } from '@/components/ui/styles'
import { useToast } from '@/components/ui/Toast'
import { DATE_KINDS, MODE_LABELS, TYPE_LABELS } from '../constants'
import {
  emptyForm,
  formFromOpportunity,
  opportunityFormSchema,
  toSavePayload,
  type OpportunityFormValues,
} from '../form'
import { useOpportunity, useSaveOpportunity, useViewerTimeZone } from '../hooks'

const textarea = inputClass

/** /opportunities/new and /opportunities/:id/edit — manual entry (FR-OPP-02, FR-OPP-13 fallback). */
export function OpportunityFormPage() {
  const { id } = useParams()
  const existing = useOpportunity(id ?? '')
  if (id && existing.isPending) return <PageSpinner />
  if (id && (existing.error || !existing.data)) {
    return (
      <Alert tone="danger">
        This opportunity doesn&apos;t exist or you don&apos;t have access.
      </Alert>
    )
  }
  return <OpportunityForm id={id ?? null} initial={existing.data ?? null} />
}

function OpportunityForm({
  id,
  initial,
}: {
  id: string | null
  initial: Parameters<typeof formFromOpportunity>[0] | null
}) {
  const tz = useViewerTimeZone()
  const navigate = useNavigate()
  const toast = useToast()
  const save = useSaveOpportunity()
  const [params] = useSearchParams()
  const fallbackReason = params.get('reason')?.slice(0, 200) ?? null
  const prefillUrl = params.get('url') ?? ''
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: initial
      ? formFromOpportunity(initial, tz)
      : {
          ...emptyForm(tz),
          officialUrl: /^https?:\/\/\S+$/i.test(prefillUrl) ? prefillUrl.slice(0, 2048) : '',
        },
  })
  const errors = form.formState.errors
  const fee = useWatch({ control: form.control, name: 'fee' })

  useEffect(() => {
    document.title = `${id ? 'Edit' : 'Add'} opportunity · Luna Space`
    return () => {
      document.title = 'Luna Space'
    }
  }, [id])

  const onSubmit = form.handleSubmit((values) => {
    const payload = toSavePayload(values)
    save.mutate(
      { id, payload, sourceUrl: values.officialUrl || values.registrationUrl || null },
      {
        onSuccess: (savedId) => {
          toast.show(id ? 'Opportunity updated' : 'Opportunity added', 'success')
          navigate(`/opportunities/${savedId}`, { replace: true })
        },
      },
    )
  })

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="max-w-3xl space-y-5"
      aria-labelledby="opp-form-title"
    >
      <div className="flex flex-wrap items-center gap-3">
        <h1 id="opp-form-title" className="flex-1 text-h1 font-semibold">
          {id ? 'Edit opportunity' : 'Add opportunity'}
        </h1>
        <Link
          to={id ? `/opportunities/${id}` : '/opportunities'}
          className="text-body-sm text-muted hover:underline"
        >
          Cancel
        </Link>
      </div>
      {!id && fallbackReason ? (
        <Alert tone="warning" data-testid="fallback-reason">
          We couldn&apos;t read that page automatically: {fallbackReason} Enter what you know —
          missing details are fine and will be flagged.
        </Alert>
      ) : null}
      {save.error ? <Alert tone="danger">{save.error.message}</Alert> : null}

      <Card className="space-y-4">
        <h2 className="text-h3 font-semibold">Basics</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type"
            options={Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            {...form.register('type')}
          />
          <TextField label="Name" error={errors.title?.message} {...form.register('title')} />
          <TextField
            label="Organizer"
            error={errors.organizer?.message}
            {...form.register('organizer')}
          />
          <SelectField
            label="Visibility"
            hint="Private items are visible only to you."
            options={[
              { value: 'shared', label: 'Shared with my partner' },
              { value: 'private', label: 'Private (only me)' },
            ]}
            {...form.register('visibility')}
          />
          <TextField
            label="Official website"
            type="url"
            placeholder="https://"
            error={errors.officialUrl?.message}
            {...form.register('officialUrl')}
          />
          <TextField
            label="Registration link"
            type="url"
            placeholder="https://"
            error={errors.registrationUrl?.message}
            {...form.register('registrationUrl')}
          />
        </div>
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="text-h3 font-semibold">Dates</h2>
          <p className="text-caption text-muted">
            Leave the time off when the source only gives a date — it will show as that date
            everywhere.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {DATE_KINDS.map(({ kind, label }) => (
            <Controller
              key={kind}
              control={form.control}
              name={`dates.${kind}`}
              render={({ field, fieldState }) => (
                <DateTimeInput
                  label={label}
                  value={field.value ?? { date: '', hasTime: false, time: '', timezone: tz }}
                  onChange={field.onChange}
                  error={
                    fieldState.error?.message ??
                    (fieldState.error as { time?: { message?: string } } | undefined)?.time?.message
                  }
                />
              )}
            />
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-h3 font-semibold">Details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Mode"
            options={Object.entries(MODE_LABELS).map(([value, label]) => ({
              value,
              label: value === 'unknown' ? 'Not known yet' : label,
            }))}
            {...form.register('mode')}
          />
          <TextField label="Location" placeholder="City or venue" {...form.register('location')} />
          <TextField
            label="Minimum team size"
            inputMode="numeric"
            error={errors.teamMin?.message}
            {...form.register('teamMin')}
          />
          <TextField
            label="Maximum team size"
            inputMode="numeric"
            error={errors.teamMax?.message}
            {...form.register('teamMax')}
          />
          <SelectField
            label="Registration fee"
            options={[
              { value: 'unknown', label: 'Not known yet' },
              { value: 'free', label: 'Free' },
              { value: 'paid', label: 'Paid' },
            ]}
            {...form.register('fee')}
          />
          {fee === 'paid' ? (
            <div className="grid grid-cols-[1fr_6rem] gap-2">
              <TextField
                label="Amount"
                inputMode="decimal"
                error={errors.feeAmount?.message}
                {...form.register('feeAmount')}
              />
              <TextField
                label="Currency"
                error={errors.feeCurrency?.message}
                {...form.register('feeCurrency')}
              />
            </div>
          ) : null}
        </div>
        <TextArea label="Eligibility" rows={3} {...form.register('eligibilityText')} />
        <TextArea label="Prizes" rows={2} {...form.register('prizes')} />
        <TextArea label="Benefits" rows={2} {...form.register('benefits')} />
        <TextArea
          label="Required documents (one per line)"
          rows={2}
          {...form.register('requiredDocuments')}
        />
        <TextField label="Tracks / categories (comma-separated)" {...form.register('tracks')} />
        <TextField
          label="Rules link"
          type="url"
          placeholder="https://"
          error={errors.rulesUrl?.message}
          {...form.register('rulesUrl')}
        />
        <TextArea label="Rules and guidelines" rows={3} {...form.register('rulesText')} />
        <TextArea label="Description" rows={5} {...form.register('description')} />
        <TextField label="Tags (comma-separated)" {...form.register('tags')} />
      </Card>

      <div className="flex gap-2">
        <Button type="submit" loading={save.isPending}>
          {id ? 'Save changes' : 'Save opportunity'}
        </Button>
        <Link to={id ? `/opportunities/${id}` : '/opportunities'}>
          <Button variant="secondary">Cancel</Button>
        </Link>
      </div>
    </form>
  )
}

function TextArea({
  label,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string
  ref?: React.Ref<HTMLTextAreaElement>
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-body-sm font-medium text-muted">{label}</span>
      <textarea className={textarea} {...rest} />
    </label>
  )
}
