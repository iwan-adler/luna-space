import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { App } from './App'

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App', () => {
  it('renders the welcome page inside the shell', () => {
    renderAt('/')
    expect(screen.getByRole('heading', { level: 1, name: 'Welcome to Luna Space' })).toBeVisible()
    expect(screen.getByRole('link', { name: /luna space/i })).toHaveAttribute('href', '/')
    expect(screen.getByTestId('backend-status')).toBeInTheDocument()
  })

  it('renders the sign-in placeholder', () => {
    renderAt('/auth/sign-in')
    expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
  })

  it('renders a not-found page for unknown routes', () => {
    renderAt('/does-not-exist')
    expect(screen.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible()
  })
})
