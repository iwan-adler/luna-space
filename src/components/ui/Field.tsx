import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type Ref,
} from 'react'

const control =
  'w-full rounded-[12px] border bg-surface-raised px-3.5 py-2.5 text-body text-text placeholder:text-muted/70 transition-colors outline-none focus-visible:border-primary/60 focus-visible:ring-4 focus-visible:ring-primary/10 aria-[invalid=true]:border-danger/70'

interface FieldShellProps {
  label: string
  error?: string | undefined
  hint?: ReactNode
  children: (ids: { id: string; describedBy: string | undefined }) => ReactNode
}

/** Label, control, hint and error wired together for screen readers (UI spec §7, §23). */
export function FieldShell({ label, error, hint, children }: FieldShellProps) {
  const id = useId()
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-body-sm font-medium text-muted">
        {label}
      </label>
      {children({ id, describedBy })}
      {hint ? (
        <p id={hintId} className="text-caption text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string | undefined
  hint?: ReactNode
  ref?: Ref<HTMLInputElement>
}

export function TextField({ label, error, hint, className = '', ref, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} border-hairline ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string | undefined
  hint?: ReactNode
  ref?: Ref<HTMLSelectElement>
  options: { value: string; label: string }[]
}

export function SelectField({
  label,
  error,
  hint,
  options,
  className = '',
  ref,
  ...rest
}: SelectFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <select
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${control} border-hairline ${className}`}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  )
}
