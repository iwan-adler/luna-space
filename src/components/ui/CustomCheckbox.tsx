import { type InputHTMLAttributes } from 'react'

export interface CustomCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string
  checked?: boolean
  disabled?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

/**
 * Uiverse.io 3D animated checklist checkbox (by KhaledMatalkah).
 * Features a 360-degree 3D flip rotation on check with theme colors.
 */
export function CustomCheckbox({
  label,
  checked,
  disabled,
  onChange,
  className = '',
  ...props
}: CustomCheckboxProps) {
  return (
    <label
      className={`custom-checkbox ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      <input type="checkbox" checked={checked} disabled={disabled} onChange={onChange} {...props} />
      <span className="checkmark" />
      {label ? <span className={checked ? 'text-muted line-through' : ''}>{label}</span> : null}
    </label>
  )
}
