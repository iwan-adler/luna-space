import { expect, test } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('several workspaces (ADR 0018)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('a second workspace for other friends; switching keeps data apart', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
    const a = await (await browser.newContext()).newPage()
    await onboardWithInvite(a, ua, 'Hack Club')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()

    // A note in the first workspace.
    await a.goto('/notes')
    await a.getByRole('button', { name: 'New note' }).click()
    await a.getByLabel('Note title').fill('Club roadmap')
    await expect(a.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })

    // A second workspace from the switcher, with its own invite link.
    await a.getByTestId('workspace-switcher').click()
    await a.getByRole('menuitem', { name: 'New workspace' }).click()
    await a.getByLabel('Emoji').fill('📚')
    await a.getByLabel('Name').fill('Study duo')
    await a.getByRole('button', { name: 'Create workspace' }).click()
    await expect(a.getByRole('heading', { name: 'Workspace settings' })).toBeVisible()
    await expect(a.getByTestId('workspace-switcher')).toContainText('Study duo')
    await a.getByRole('button', { name: 'Create invite link' }).click()
    const studyLink = await a.getByTestId('invite-link').inputValue()

    // The new workspace starts empty: the club's note is not here.
    await a.goto('/notes')
    await expect(a.getByText('No notes yet.', { exact: false })).toBeVisible()

    // Ben joins only the study workspace and sees just that one.
    const b = await (await browser.newContext()).newPage()
    await acceptInvite(b, studyLink, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()
    await expect(b.getByTestId('workspace-switcher')).toContainText('Study duo')
    await b.getByTestId('workspace-switcher').click()
    await expect(b.getByRole('menuitem', { name: /Hack Club/ })).toHaveCount(0)
    await b.keyboard.press('Escape')

    // Ana switches back to the club and finds her note again.
    await a.getByTestId('workspace-switcher').click()
    await a.getByRole('menuitem', { name: /Hack Club/ }).click()
    await expect(a.getByTestId('workspace-switcher')).toContainText('Hack Club')
    await a.goto('/notes')
    await expect(a.getByTestId('note-list')).toContainText('Club roadmap')
  })
})
