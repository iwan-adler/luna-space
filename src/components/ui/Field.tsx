import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type Ref,
} from 'react'
import { CustomSelect } from './CustomSelect'

const control =
  'w-full min-h-[44px] rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-body text-text placeholder:text-muted/60 transition-all outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-[invalid=true]:border-danger'

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
          className={`${control} ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string | undefined
  hint?: ReactNode
  ref?: Ref<HTMLTextAreaElement>
}

export function TextAreaField({
  label,
  error,
  hint,
  className = '',
  ref,
  ...rest
}: TextAreaFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full min-h-[96px] rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-body text-text placeholder:text-muted/60 transition-all outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 aria-[invalid=true]:border-danger resize-y ${className}`}
          {...rest}
        />
      )}
    </FieldShell>
  )
}

interface SelectFieldProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  label: string
  error?: string | undefined
  hint?: ReactNode
  ref?: Ref<HTMLSelectElement>
  options: { value: string; label: string }[]
  align?: 'left' | 'right'
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void
}

export function SelectField({
  label,
  error,
  hint,
  options,
  className = '',
  align = 'left',
  value,
  onChange,
  disabled,
  name,
}: SelectFieldProps) {
  const strValue = String(value ?? options[0]?.value ?? '')
  return (
    <FieldShell label={label} error={error} hint={hint}>
      {({ id, describedBy }) => (
        <div className={`relative ${className}`}>
          <CustomSelect
            id={id}
            ariaDescribedBy={describedBy}
            invalid={Boolean(error)}
            ariaLabel={label}
            value={strValue}
            disabled={disabled}
            align={align}
            options={options}
            onChange={(val) => {
              if (onChange) {
                const syntheticEvent = {
                  target: { value: val, name },
                  currentTarget: { value: val, name },
                  preventDefault: () => {},
                  stopPropagation: () => {},
                } as unknown as React.ChangeEvent<HTMLSelectElement>
                onChange(syntheticEvent)
              }
            }}
            buttonClassName="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-xl border border-hairline bg-surface px-3.5 py-2.5 text-body text-text transition-all outline-none hover:border-border-hover focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50"
          />
        </div>
      )}
    </FieldShell>
  )
}
