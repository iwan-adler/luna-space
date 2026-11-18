import { expect, test, type Browser, type Page } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

/** A in Kolkata, B in Los Angeles: date-only values must not move between them (AC-18). */
async function pair(browser: Browser): Promise<{ a: Page; b: Page }> {
  const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
  const a = await (await browser.newContext({ timezoneId: 'Asia/Kolkata' })).newPage()
  const url = await onboardWithInvite(a, ua, 'Cal Crew')
  await a.getByRole('button', { name: 'Go to my dashboard' }).click()
  const b = await (await browser.newContext({ timezoneId: 'America/Los_Angeles' })).newPage()
  await acceptInvite(b, url, ub)
  await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()
  await b.goto('/settings/profile')
  await b.getByLabel('Time zone').selectOption('America/Los_Angeles')
  await b.getByRole('button', { name: /save/i }).click()
  return { a, b }
}

const isoIn = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}

test.describe('calendar and notifications (Phase 5)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('shared and private events, deadlines on their date, live assignment notifications', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const { a, b } = await pair(browser)
    const deadline = isoIn(10)

    // A: an interested hackathon with a date-only deadline, a shared and a private event.
    await a.goto('/opportunities/new/manual')
    await a.getByLabel('Name').fill('Aurora Hack')
    await a.getByLabel('Registration deadline date').fill(deadline)
    await a.getByRole('button', { name: 'Save opportunity' }).click()
    await expect(a.getByRole('heading', { name: 'Aurora Hack' })).toBeVisible()

    await a.goto(`/calendar?view=agenda&date=${isoIn(1)}`)
    await a.getByRole('button', { name: 'New event' }).click()
    await a.getByLabel('Title').fill('Team sync')
    await a.getByLabel('All day').check()
    await a.getByLabel('Date', { exact: true }).fill(isoIn(3))
    await a.getByRole('button', { name: 'Add event' }).click()
    await expect(a.getByText('Event added')).toBeVisible()

    await a.getByRole('button', { name: 'New event' }).click()
    await a.getByLabel('Title').fill('Dentist')
    await a.getByLabel('All day').check()
    await a.getByLabel('Date', { exact: true }).fill(isoIn(4))
    await a.getByLabel('Private (only you can see it)').check()
    await a.getByRole('button', { name: 'Add event' }).click()
    await expect(a.getByTestId('calendar-agenda')).toContainText('Dentist')

    // B sees the shared event and the deadline on the same date, but not A's private event.
    await b.goto(`/calendar?view=agenda&date=${isoIn(1)}`)
    const agenda = b.getByTestId('calendar-agenda')
    await expect(agenda).toContainText('Team sync')
    await expect(agenda).toContainText('Aurora Hack — registration deadline')
    await expect(agenda).not.toContainText('Dentist')
    const deadlineDay = agenda
      .locator('li', { hasText: 'Aurora Hack — registration deadline' })
      .first()
    const expectedLabel = new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      weekday: 'short',
      timeZone: 'UTC',
    }).format(new Date(`${deadline}T00:00:00Z`))
    await expect(deadlineDay).toContainText(expectedLabel)

    // Layers: hiding Deadlines removes it.
    await b.getByRole('button', { name: 'Deadlines' }).click()
    await expect(agenda).not.toContainText('Aurora Hack')

    // Clicking a derived item opens its source (FR-CAL-03).
    await b.getByRole('button', { name: 'Deadlines' }).click()
    await agenda.getByText('Aurora Hack — registration deadline').click()
    await expect(b.getByRole('heading', { name: 'Aurora Hack' })).toBeVisible()

    // A assigns B a task; B's bell updates live and the notification links to the task.
    await a.goto('/projects')
    await a.getByRole('button', { name: 'New project' }).click()
    await a.getByLabel('Name').fill('Aurora Build')
    await a.getByRole('button', { name: 'Create project' }).click()
    await a.getByLabel('Add a task to To do').fill('Design the logo')
    await a.getByRole('button', { name: 'Add to To do' }).click()
    await b.goto('/')
    await expect(b.getByTestId('notification-bell').filter({ visible: true })).toHaveAccessibleName(
      'Notifications',
    )
    await a.getByTestId('column-todo').getByText('Design the logo').click()
    await a.getByLabel('Assignee').selectOption({ label: 'Ben' })
    await expect(b.getByTestId('notification-bell').filter({ visible: true })).toHaveAccessibleName(
      'Notifications, 1 unread',
    )
    await b.getByTestId('notification-bell').filter({ visible: true }).click()
    await expect(b.getByTestId('notification-list')).toContainText(
      'Ana assigned you "Design the logo"',
    )
    await b.getByText('Ana assigned you "Design the logo"').click()
    await expect(b.getByLabel('Task title')).toHaveValue('Design the logo')
    await b.goto('/notifications')
    await expect(b.getByRole('button', { name: 'Mark all as read' })).toHaveCount(0)
  })
})
