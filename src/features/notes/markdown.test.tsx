import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Markdown } from './markdown'
import { toggleTask } from './tasks'

describe('Markdown-lite', () => {
  it('renders headings, emphasis, lists and code', () => {
    const { container } = render(
      <Markdown
        body={'# Plan\nSome **bold** and *soft* text with `code`.\n\n- one\n- two\n\n1. first'}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Plan' })).toBeTruthy()
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('em')?.textContent).toBe('soft')
    expect(container.querySelector('code')?.textContent).toBe('code')
    expect(container.querySelectorAll('ul li')).toHaveLength(2)
    expect(container.querySelectorAll('ol li')).toHaveLength(1)
  })

  it('never renders raw HTML or unsafe links', () => {
    const { container } = render(
      <Markdown
        body={'<img src=x onerror=alert(1)> [click](javascript:alert(1)) https://ok.example/page'}
      />,
    )
    expect(container.querySelector('img')).toBeNull()
    const links = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(['https://ok.example/page'])
    expect(container.textContent).toContain('<img src=x onerror=alert(1)>')
  })

  it('renders task lists and toggles the right line', () => {
    const body = 'Todo\n- [ ] pick a track\n- [x] register'
    render(<Markdown body={body} onToggleTask={() => undefined} />)
    expect((screen.getByLabelText('pick a track') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByLabelText('register') as HTMLInputElement).checked).toBe(true)
    expect(toggleTask(body, 1)).toBe('Todo\n- [x] pick a track\n- [x] register')
    expect(toggleTask(body, 2)).toBe('Todo\n- [ ] pick a track\n- [ ] register')
    expect(toggleTask(body, 0)).toBe(body)
  })
})
