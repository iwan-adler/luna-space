import { expect, test } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

// Critical journey 1 (Implementation Plan §11.2): A creates a workspace and invites friends with one
// link; both join; once full, nobody else can (AC-01, AC-03; ADR 0018).
test.describe('workspace onboarding', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('create workspace, one invite link brings in several friends', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop; mobile layout is covered by smoke tests')
    const [asha, bala, chitra] = await Promise.all([
      createTestUser('Asha'),
      createTestUser('Bala'),
      createTestUser('Chitra'),
    ])

    const a = await (await browser.newContext()).newPage()
    const inviteUrl = await onboardWithInvite(a, asha, 'E2E Crew')
    expect(inviteUrl).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}$/)
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    await expect(a.getByRole('heading', { level: 1, name: /, Asha/ })).toBeVisible()
    await expect(a.getByTestId('team-card')).toContainText('Invite your friends')

    const b = await (await browser.newContext()).newPage()
    await b.goto(inviteUrl)
    await b.getByRole('button', { name: 'Sign in to accept' }).click()
    await expect(
      b.getByText('Sign in or create an account to accept your invitation.'),
    ).toBeVisible()
    await b.goBack()
    await acceptInvite(b, inviteUrl, bala)
    await expect(b.getByRole('heading', { level: 1, name: /, Bala/ })).toBeVisible()
    await expect(b.getByTestId('team-card')).toContainText('Asha')

    const c = await (await browser.newContext()).newPage()
    await acceptInvite(c, inviteUrl, chitra)
    await expect(c.getByRole('heading', { level: 1, name: /, Chitra/ })).toBeVisible()

    await a.reload()
    await expect(a.getByTestId('team-card')).toContainText('Bala')
    await expect(a.getByTestId('team-card')).toContainText('Chitra')
  })

  test('workspace settings list members and hide invitations once full', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'runs once on desktop')
    const [x, y] = await Promise.all([createTestUser('Xia'), createTestUser('Yusuf')])
    const px = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(px, x, 'Settings Crew')

    const py = await (await browser.newContext()).newPage()
    await acceptInvite(py, url, y)
    await expect(py.getByRole('heading', { level: 1, name: /, Yusuf/ })).toBeVisible()

    await px.goto('/settings/workspace')
    await expect(px.getByTestId('member-list')).toContainText('Xia')
    await expect(px.getByTestId('member-list')).toContainText('Yusuf')
    await expect(px.getByRole('heading', { name: 'Invite people' })).toBeVisible()
    // The owner lowers the limit to two: the workspace is full and invitations disappear.
    await px.getByLabel('Member limit').selectOption('2')
    await expect(px.getByText('This workspace is full (2 people).')).toBeVisible()
    await expect(px.getByRole('heading', { name: 'Invite people' })).toHaveCount(0)
  })
})
