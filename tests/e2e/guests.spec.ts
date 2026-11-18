import { expect, test } from '@playwright/test'
import { onboardWithInvite, signIn } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('project guests (Phase 4b)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('invite a guest into one room, share selectively, remove them', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ug] = await Promise.all([createTestUser('Ana'), createTestUser('Gia')])

    // A: workspace, a project room and two tasks, one hidden from guests.
    const a = await (await browser.newContext({ timezoneId: 'Asia/Kolkata' })).newPage()
    await onboardWithInvite(a, ua, 'Guest Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    await a.goto('/projects')
    await a.getByRole('button', { name: 'New project' }).click()
    await a.getByLabel('Name').fill('Nova Hack Team')
    await a.getByRole('button', { name: 'Create project' }).click()
    await expect(a.getByRole('heading', { level: 1, name: 'Nova Hack Team' })).toBeVisible()
    await a.getByLabel('Add a task to To do').fill('Build the API')
    await a.getByRole('button', { name: 'Add to To do' }).click()
    await a.getByLabel('Add a task to To do').fill('Budget notes')
    await a.getByRole('button', { name: 'Add to To do' }).click()
    await a.getByTestId('column-todo').getByText('Budget notes').click()
    await a.getByLabel('Visible to guests').click()
    await expect(a.getByLabel('Visible to guests')).not.toBeChecked()
    await a.getByRole('button', { name: 'Close task' }).click()

    // A creates a collaborator invitation (FR-GUEST-01/02).
    await a.getByRole('link', { name: 'People' }).click()
    await a.getByRole('button', { name: 'Invite guests' }).click()
    await a.getByLabel('Label (optional)').fill('Gia')
    await a.getByRole('button', { name: 'Create link' }).click()
    const link = await a.getByTestId('guest-invite-link').inputValue()
    expect(link).toMatch(/\/join#[\w-]{20,}$/)
    await a.getByRole('button', { name: 'Done' }).click()
    await expect(a.getByTestId('invitation-list')).toContainText('Active')

    // G opens the link signed out, signs in and lands in the room (AC-28).
    const g = await (await browser.newContext()).newPage()
    await g.goto(link.replace(/^https?:\/\/[^/]+/, ''))
    await expect(g).toHaveURL(/\/join$/)
    await g.getByRole('button', { name: 'Sign in to join' }).click()
    await signIn(g, ug)
    await g.getByRole('button', { name: 'Join room' }).click()
    await expect(g.getByRole('heading', { level: 1, name: 'Nova Hack Team' })).toBeVisible()
    await expect(g.getByTestId('guest-role')).toHaveText('Guest · Collaborator')

    // G sees only guest-visible tasks and can add one that A sees live (FR-GUEST-06/08).
    await g.getByRole('link', { name: 'Board' }).click()
    await expect(g.getByTestId('column-todo').getByText('Build the API')).toBeVisible()
    await expect(g.getByText('Budget notes')).toHaveCount(0)
    await g.getByLabel('Add a task to To do').fill('Write the README')
    await g.getByRole('button', { name: 'Add to To do' }).click()
    await a.getByRole('link', { name: 'Board' }).click()
    await expect(a.getByTestId('column-todo').getByText('Write the README')).toBeVisible()
    await expect(a.getByTestId('guest-banner')).toContainText('1 guest can see')

    // Files are hidden from guests until a member shares them (AC-30).
    await a.getByRole('link', { name: 'Files' }).click()
    await a.getByTestId('project-file-input').setInputFiles({
      name: 'brief.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('Nova brief'),
    })
    await expect(a.getByTestId('file-list')).toContainText('brief.txt')
    await g.getByRole('link', { name: 'Files' }).click()
    await expect(g.getByText('No files yet.')).toBeVisible()
    await a.getByRole('button', { name: 'Visible to guests: brief.txt' }).click()
    await expect(g.getByTestId('file-list')).toContainText('brief.txt')

    // Guests never reach workspace pages: the app sends them to their rooms (FR-GUEST-11).
    await g.goto('/opportunities')
    await expect(g).toHaveURL(/\/guest$/)
    await expect(g.getByTestId('guest-rooms')).toContainText('Nova Hack Team')

    // A removes G; the room disappears for G (FR-GUEST-09, AC-31).
    await a.getByRole('link', { name: 'People' }).click()
    await expect(a.getByTestId('people-list')).toContainText('Gia')
    await a.getByRole('button', { name: 'Remove' }).click()
    await a.getByRole('button', { name: 'Remove guest' }).click()
    await expect(a.getByText('Gia was removed')).toBeVisible()
    await g.reload()
    await expect(g.getByRole('heading', { name: 'No rooms yet' })).toBeVisible()
  })
})
