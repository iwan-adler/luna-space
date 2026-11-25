import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemberPresence } from './MemberPresence'

describe('MemberPresence', () => {
  it('renders member name and status line without duplicate bullet dots', () => {
    const { container } = render(<MemberPresence displayName="Sam" isOnline={false} />)

    expect(screen.getByText('Sam')).toBeInTheDocument()
    expect(screen.getByText('Offline')).toBeInTheDocument()
    // Verify no bullet dot character exists in the status text
    const statusEl = screen.getByText('Offline')
    expect(statusEl.textContent).toBe('Offline')
    expect(container.textContent).not.toContain('•')
  })

  it('renders online status with active dot when isOnline is true', () => {
    render(<MemberPresence displayName="Alex" isOnline={true} />)

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Online')).toBeInTheDocument()
    const dot = screen.getByTitle('Online')
    expect(dot).toBeInTheDocument()
  })

  it('applies reduced opacity to avatar for offline members', () => {
    const { container } = render(<MemberPresence displayName="Sam" isOnline={false} />)

    const avatarWrapper = container.querySelector('.opacity-75')
    expect(avatarWrapper).toBeInTheDocument()
  })

  it('renders custom statusText and badge if provided', () => {
    render(
      <MemberPresence
        displayName="Sam"
        isOnline={true}
        statusText="Active now"
        badge={<span data-testid="test-badge">Owner</span>}
      />,
    )

    expect(screen.getByText('Active now')).toBeInTheDocument()
    expect(screen.getByTestId('test-badge')).toBeInTheDocument()
  })
})
