import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Switch, Toggle } from './Switch'

describe('Switch component', () => {
  it('renders with label and accessibility role="switch"', () => {
    render(<Switch checked={false} onCheckedChange={() => {}} label="All day" />)
    const toggle = screen.getByRole('switch', { name: 'All day' })
    expect(toggle).toBeDefined()
    expect(toggle).not.toBeChecked()
  })

  it('calls onCheckedChange when clicked', () => {
    const fn = vi.fn()
    render(<Switch checked={false} onCheckedChange={fn} label="Airplane Mode" />)
    const toggle = screen.getByRole('switch', { name: 'Airplane Mode' })
    fireEvent.click(toggle)
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('supports onChange callback and Toggle alias', () => {
    const fn = vi.fn()
    render(<Toggle checked={false} onChange={fn} label="Push notifications" />)
    const toggle = screen.getByRole('switch', { name: 'Push notifications' })
    fireEvent.click(toggle)
    expect(fn).toHaveBeenCalledWith(true)
  })

  it('respects disabled state', () => {
    const fn = vi.fn()
    render(<Switch checked={true} onCheckedChange={fn} disabled label="Locked" />)
    const toggle = screen.getByRole('switch', { name: 'Locked' })
    expect(toggle).toBeDisabled()
    fireEvent.click(toggle)
    expect(fn).not.toHaveBeenCalled()
  })
})
