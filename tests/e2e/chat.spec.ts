import { expect, test } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('chat (Phase 6)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('live messages, unread badge, reply, react, seen, edit, delete, attach', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
    const a = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(a, ua, 'Chat Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    const b = await (await browser.newContext()).newPage()
    await acceptInvite(b, url, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()

    // A writes; B (on Home) sees the unread badge, then the message.
    await a.goto('/chat')
    await expect(a.getByRole('heading', { name: 'Ben' })).toBeVisible()
    await a.getByLabel('Message', { exact: true }).fill('Hi **Ben**, ready for the hackathon?')
    await a.keyboard.press('Enter')
    await expect(a.getByTestId('chat-messages')).toContainText('ready for the hackathon?')
    await expect(b.getByTestId('chat-unread')).toHaveText('1', { timeout: 15_000 })
    await b.getByRole('link', { name: /^Chat/ }).click()
    const first = b.getByTestId('chat-message').filter({ hasText: 'ready for the hackathon?' })
    await expect(first).toBeVisible()
    await expect(first.locator('strong')).toHaveText('Ben')
    await expect(b.getByTestId('partner-status')).toContainText('Online')

    // B replies with a quote and reacts; A sees both, and "Seen" under the first message.
    await first.hover()
    await first.getByRole('button', { name: 'Reply' }).click()
    await b.getByLabel('Message', { exact: true }).fill('Yes! Let us pick a track.')
    await b.getByRole('button', { name: 'Send' }).click()
    await first.hover()
    await first.getByRole('button', { name: 'React' }).click()
    await b.getByRole('button', { name: 'React 🎉' }).click()
    const reply = a.getByTestId('chat-message').filter({ hasText: 'Let us pick a track' })
    await expect(reply).toContainText('You: Hi Ben, ready for the hackathon?')
    await expect(a.getByRole('button', { name: '🎉 1' })).toBeVisible()
    await expect(a.getByTestId('seen')).toBeVisible()

    // A edits and then deletes their message.
    const mine = a
      .getByTestId('chat-message')
      .filter({ hasText: 'ready for the hackathon?' })
      .first()
    await mine.hover()
    await mine.getByRole('button', { name: 'Edit message' }).click()
    await a
      .getByLabel('Message', { exact: true })
      .fill('Hi Ben, ready for the hackathon on Saturday?')
    await a.getByRole('button', { name: 'Save edit' }).click()
    await expect(b.getByTestId('chat-messages')).toContainText('on Saturday?')
    await expect(b.getByTestId('chat-messages')).toContainText('edited')
    const edited = a.getByTestId('chat-message').filter({ hasText: 'on Saturday?' }).first()
    await edited.hover()
    await edited.getByRole('button', { name: 'Delete message' }).click()
    await expect(b.getByTestId('chat-messages')).toContainText('Message deleted')
    await expect(b.getByTestId('chat-messages')).not.toContainText('on Saturday?')

    // A sends a file; B can see it.
    await a.getByTestId('chat-file-input').setInputFiles({
      name: 'rules.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4 test'),
    })
    await a.getByLabel('Message', { exact: true }).fill('Here are the rules')
    await a.getByRole('button', { name: 'Send' }).click()
    await expect(b.getByTestId('chat-messages')).toContainText('rules.pdf', { timeout: 15_000 })
  })
})
