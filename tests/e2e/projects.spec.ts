import { expect, test, type Browser, type Page } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

async function pair(browser: Browser): Promise<{ a: Page; b: Page }> {
  const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
  const a = await (await browser.newContext({ timezoneId: 'Asia/Kolkata' })).newPage()
  const url = await onboardWithInvite(a, ua, 'Room Crew')
  await a.getByRole('button', { name: 'Go to my dashboard' }).click()
  const b = await (await browser.newContext({ timezoneId: 'Asia/Kolkata' })).newPage()
  await acceptInvite(b, url, ub)
  await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()
  return { a, b }
}

test.describe('project rooms (Phase 4)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('convert an opportunity, share a live board, checklist, files and My tasks', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const { a, b } = await pair(browser)

    // A converts a hackathon into a project room (AC-16).
    await a.goto('/opportunities/new/manual')
    await a.getByLabel('Name').fill('Lunar Build Week')
    await a.getByLabel('Official website').fill('https://lunar.example/build')
    await a.getByLabel('Submission deadline date').fill('2027-02-20')
    await a.getByRole('button', { name: 'Save opportunity' }).click()
    await a.getByRole('button', { name: 'Convert to project' }).click()
    await expect(a.getByRole('heading', { level: 1, name: 'Lunar Build Week' })).toBeVisible()
    await expect(a.getByLabel('Stage')).toHaveValue('planning')
    await expect(a.getByRole('link', { name: /Official website/ })).toBeVisible()

    // The opportunity now links to the room instead of offering a second conversion.
    await a.getByRole('link', { name: 'View the opportunity' }).click()
    await a.getByRole('link', { name: 'Open Lunar Build Week' }).click()

    // B opens the board; A adds a task and B sees it without reloading (FR-PRJ-03, TRD §9).
    const roomUrl = a.url().replace(/\/overview$/, '')
    await b.goto(`${roomUrl.replace(/^https?:\/\/[^/]+/, '')}/board`)
    await expect(b.getByTestId('column-todo')).toBeVisible()
    await a.getByRole('link', { name: 'Board' }).click()
    await a.getByLabel('Add a task to To do').fill('Record the demo video')
    await a.getByRole('button', { name: 'Add to To do' }).click()
    await expect(b.getByTestId('column-todo').getByText('Record the demo video')).toBeVisible()

    // A assigns it to B with a due date and moves it to In progress from the drawer.
    await a.getByTestId('column-todo').getByText('Record the demo video').click()
    await a.getByLabel('Assignee').selectOption({ label: 'Ben' })
    await a.getByLabel('Due date').fill('2027-02-18')
    await a.getByLabel('Status').selectOption('in_progress')
    await expect(a.getByText('Moved to In progress')).toBeVisible()
    await a.getByLabel('Write a comment').fill('Keep it under three minutes')
    await a.getByRole('button', { name: 'Comment' }).click()
    await expect(a.getByTestId('comments')).toContainText('Keep it under three minutes')
    await a.getByRole('button', { name: 'Close task' }).click()
    await expect(
      b.getByTestId('column-in_progress').getByText('Record the demo video'),
    ).toBeVisible()

    // Drag and drop with the keyboard: move it on to Review.
    const card = a.getByTestId('column-in_progress').getByTestId('task-card').first()
    await card.focus()
    await a.keyboard.press('Space')
    await expect(card).toHaveAttribute('aria-pressed', 'true')
    await a.keyboard.press('ArrowRight')
    await expect(a.getByText('Over Review.')).toBeAttached()
    await a.keyboard.press('Space')
    await expect(a.getByTestId('column-review').getByText('Record the demo video')).toBeVisible()
    await expect(b.getByTestId('column-review').getByText('Record the demo video')).toBeVisible()

    // B sees it in My tasks with A's comment.
    await b.goto('/tasks')
    await expect(b.getByTestId('my-tasks-later')).toContainText('Record the demo video')
    await b.getByText('Record the demo video').click()
    await expect(b.getByTestId('comments')).toContainText('Keep it under three minutes')
    await b.getByRole('button', { name: 'Close task' }).click()

    // Submission checklist from a built-in template, ticked by B and seen by A (FR-PRJ-08/09).
    await a.getByRole('link', { name: 'Checklist' }).click()
    await a.getByRole('button', { name: 'Start from a template' }).click()
    await a.getByRole('button', { name: 'Add checklist' }).click()
    await expect(a.getByTestId('checklist-progress')).toHaveText('0 of 10 done')
    await b.getByRole('link', { name: 'Checklist' }).click()
    await b.getByLabel('Public code repository with a clear README').click()
    await expect(b.getByLabel('Public code repository with a clear README')).toBeChecked()
    await expect(a.getByTestId('checklist-progress')).toHaveText('1 of 10 done')

    // Files: upload privately, list, and see it attached in the activity trail (FR-PRJ-07).
    await a.getByRole('link', { name: 'Files' }).click()
    await a.getByTestId('project-file-input').setInputFiles({
      name: 'pitch-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Moonshot pitch notes'),
    })
    await expect(a.getByText('Uploaded pitch-notes.txt')).toBeVisible()
    await expect(a.getByTestId('file-list')).toContainText('pitch-notes.txt')
    await b.getByRole('link', { name: 'Files' }).click()
    await expect(b.getByTestId('file-list')).toContainText('pitch-notes.txt')

    await a.getByRole('link', { name: 'Activity' }).click()
    await expect(a.getByTestId('activity-list')).toContainText(
      'Moved "Record the demo video" to review',
    )
    await expect(a.getByTestId('activity-list')).toContainText(
      'Created the project "Lunar Build Week"',
    )
  })
})
