import { expect, test } from '@playwright/test'
import { acceptInvite, choose, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('profiles, stickers, polls and the team finder (ADR 0021)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('bio and links, a sticker, a poll, and a team-finder post', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
    const a = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(a, ua, 'Social Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    const b = await (await browser.newContext()).newPage()
    await acceptInvite(b, url, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()

    // Ana fills in her bio, skills and links (pasted in messy forms).
    await a.goto('/settings/profile')
    await a.getByLabel('GitHub username').fill('https://github.com/ana-dev')
    await a.getByRole('button', { name: 'Save profile' }).click()
    await expect(a.getByText('Profile updated').first()).toBeVisible()
    await a.getByLabel('Bio').fill('Builds lunar rovers on weekends')
    await a.getByLabel('Skills').fill('Robotics, React')
    await a.getByLabel('LinkedIn').fill('linkedin.com/in/ana-dev')
    await a.getByLabel('Website').fill('ana.dev')
    await a.getByLabel('Devpost').fill('@ana_dev')
    await a.getByRole('button', { name: 'Save about you' }).click()
    await expect(a.getByText('Profile updated')).toBeVisible()

    // Ben opens Ana's card from the team card on Home.
    await b.reload()
    await b.getByTestId('team-card').getByRole('button', { name: "Ana's profile" }).click()
    const card = b.getByRole('dialog')
    await expect(card).toContainText('Builds lunar rovers on weekends')
    await expect(card).toContainText('robotics')
    await expect(card.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/ana-dev',
    )
    await expect(card.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/ana-dev/',
    )
    await expect(card.getByRole('link', { name: /Website/ })).toHaveAttribute(
      'href',
      'https://ana.dev',
    )
    await expect(card.getByRole('link', { name: /Devpost/ })).toHaveAttribute(
      'href',
      'https://devpost.com/ana_dev',
    )
    await b.keyboard.press('Escape')

    // Ana sends a sticker; Ben sees it.
    await a.goto('/chat')
    await a.getByTestId('sticker-button').click()
    await a.getByRole('menuitem', { name: 'Send sticker: Ship it!' }).click()
    await b.goto('/chat')
    await expect(b.getByRole('img', { name: 'Sticker: Ship it!' })).toBeVisible({ timeout: 15_000 })

    // Ben starts a poll; Ana votes; Ben sees the vote with her name.
    await b.getByRole('button', { name: 'Start a poll' }).click()
    await b.getByLabel('Question').fill('Which track?')
    await b.getByLabel('Option 1').fill('AI')
    await b.getByLabel('Option 2').fill('Fintech')
    await b.getByRole('button', { name: 'Send poll' }).click()
    const pollOnA = a.getByTestId('poll').filter({ hasText: 'Which track?' })
    await expect(pollOnA).toBeVisible({ timeout: 15_000 })
    await pollOnA.getByRole('button', { name: /^Fintech/ }).click()
    const pollOnB = b.getByTestId('poll').filter({ hasText: 'Which track?' })
    await expect(pollOnB.getByRole('button', { name: 'Fintech: 1 vote' })).toBeVisible({
      timeout: 15_000,
    })
    await expect(pollOnB).toContainText('Ana')

    // Ana's team needs people for a hackathon; Ben finds the post.
    await a.goto('/opportunities/new/manual')
    await a.getByLabel('Name').fill('Rover Hack')
    await a.getByRole('button', { name: 'Save opportunity' }).click()
    await expect(a.getByRole('heading', { name: 'Rover Hack' })).toBeVisible()
    await a.goto('/teams')
    await a.getByRole('button', { name: 'Post to finder' }).click()
    await a.getByRole('radio', { name: 'We need people' }).click()
    await choose(a, 'Opportunity', { label: 'Rover Hack' })
    await a.getByLabel('Skills you need').fill('UI design, ML')
    await a.getByLabel('A short note').fill('Online, this weekend')
    await a.getByRole('button', { name: 'Post', exact: true }).last().click()
    await b.goto('/teams')
    const post = b.getByTestId('team-post').filter({ hasText: 'Rover Hack' })
    await expect(post).toContainText('needs 1 teammate')
    await expect(post).toContainText('ui design')
    await expect(post).toContainText('Online, this weekend')
  })
})
