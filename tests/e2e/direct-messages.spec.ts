import { expect, test, type Page } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

/** Opens your direct conversation with a teammate from the chat list. */
async function openDm(page: Page, name: string) {
  await page.goto('/chat')
  await page.getByRole('button', { name: new RegExp(`^${name} (Online now|Offline)`) }).click()
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible()
}

test.describe('direct messages, private or public (ADR 0024)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('a private DM reaches only its recipient; a public one reaches everyone', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'runs once on desktop')
    const [ua, ub, uc] = await Promise.all([
      createTestUser('Ana'),
      createTestUser('Ben'),
      createTestUser('Chitra'),
    ])
    const a = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(a, ua, 'DM Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    const b = await (await browser.newContext()).newPage()
    await acceptInvite(b, url, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()
    const c = await (await browser.newContext()).newPage()
    await acceptInvite(c, url, uc)
    await expect(c.getByRole('heading', { level: 1, name: /, Chitra/ })).toBeVisible()

    // Ana writes to Ben; Private is the default.
    await openDm(a, 'Ben')
    await expect(a.getByRole('radio', { name: 'Private' })).toHaveAttribute('aria-checked', 'true')
    await a.getByLabel('Message', { exact: true }).fill('Surprise party for Chitra on Friday')
    await a.keyboard.press('Enter')
    const secret = a.getByTestId('chat-message').filter({ hasText: 'Surprise party' })
    await expect(secret).toBeVisible()
    await expect(secret.getByTestId('audience')).toContainText('Private')

    // Ben sees it, with an unread badge first.
    await b.goto('/chat')
    await expect(b.getByTestId('dm-unread')).toHaveText(/1/, { timeout: 15_000 })
    await openDm(b, 'Ana')
    await expect(b.getByTestId('chat-messages')).toContainText('Surprise party for Chitra')

    // Chitra sees it nowhere: not in the team chat, not in her conversation with Ana.
    await c.goto('/chat')
    await expect(c.getByRole('heading', { level: 1, name: 'General' })).toBeVisible()
    await expect(c.getByTestId('chat-messages')).not.toContainText('Surprise party')
    await openDm(c, 'Ana')
    await expect(c.getByTestId('chat-messages')).not.toContainText('Surprise party')
    await expect(c.getByTestId('dm-unread')).toHaveCount(0)

    // Ana switches to Public: the message also appears in everyone's team chat.
    await a.getByRole('radio', { name: 'Public' }).click()
    await a.getByLabel('Message', { exact: true }).fill('Ben, can you bring the speakers?')
    await a.keyboard.press('Enter')
    await expect(
      a
        .getByTestId('chat-message')
        .filter({ hasText: 'bring the speakers' })
        .getByTestId('audience'),
    ).toContainText('Public')
    await c.goto('/chat')
    const shared = c.getByTestId('chat-message').filter({ hasText: 'bring the speakers' })
    await expect(shared).toBeVisible({ timeout: 15_000 })
    await expect(shared.getByTestId('audience')).toContainText('To Ben')
    await expect(c.getByTestId('chat-messages')).not.toContainText('Surprise party')
  })
})
