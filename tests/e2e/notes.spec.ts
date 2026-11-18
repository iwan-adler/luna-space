import { expect, test } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('shared notepad', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('a shared note syncs live; private notes stay private', async ({ browser, isMobile }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
    const a = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(a, ua, 'Note Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    const b = await (await browser.newContext()).newPage()
    await acceptInvite(b, url, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()

    // A writes a shared note with a to-do list.
    await a.goto('/notes')
    await a.getByRole('button', { name: 'New note' }).click()
    await a.getByLabel('Note title').fill('Hackathon plan')
    await a.getByLabel('Note text').fill('- [ ] Pick a track\n- [ ] Book a room')
    await expect(a.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })

    // B opens it and sees the text; A's next edit appears for B without reloading.
    await b.goto('/notes')
    await b.getByTestId('note-list').getByText('Hackathon plan').click()
    await expect(b.getByLabel('Note text')).toHaveValue('- [ ] Pick a track\n- [ ] Book a room')
    await a.getByLabel('Note text').fill('- [x] Pick a track\n- [ ] Book a room')
    await expect(a.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })
    await expect(b.getByLabel('Note text')).toHaveValue('- [x] Pick a track\n- [ ] Book a room', {
      timeout: 10_000,
    })
    await expect(b.getByTestId('save-status')).toContainText('edited by Ana')

    // B ticks the second item in preview; A sees it.
    await b.getByRole('tab', { name: 'preview' }).click()
    await b.getByLabel('Book a room').click()
    await expect(b.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })
    await expect(a.getByLabel('Note text')).toHaveValue('- [x] Pick a track\n- [x] Book a room', {
      timeout: 10_000,
    })

    // A private note never reaches B.
    await a.getByRole('button', { name: 'New note' }).click()
    await a.getByLabel('Note title').fill('My diary')
    await expect(a.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })
    await a.getByRole('button', { name: 'Make private' }).click()
    await expect(a.getByText('Now private')).toBeVisible()
    await b.goto('/notes')
    await expect(b.getByTestId('note-list')).toContainText('Hackathon plan')
    await expect(b.getByTestId('note-list')).not.toContainText('My diary')
  })
})
