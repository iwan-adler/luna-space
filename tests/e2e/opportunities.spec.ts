import { expect, test, type Browser, type Page } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

/** Two members in one workspace; B's browser runs in Los Angeles to test date-only display (AC-18). */
async function pair(browser: Browser): Promise<{ a: Page; b: Page }> {
  const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
  const a = await (await browser.newContext({ timezoneId: 'Asia/Kolkata' })).newPage()
  const url = await onboardWithInvite(a, ua, 'Opp Crew')
  await a.getByRole('button', { name: 'Go to my dashboard' }).click()
  const b = await (await browser.newContext({ timezoneId: 'America/Los_Angeles' })).newPage()
  await acceptInvite(b, url, ub)
  await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()
  return { a, b }
}

test.describe('opportunities core (Phase 2)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('add manually, keep date-only deadlines stable, change status, see history, respect privacy', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const { a, b } = await pair(browser)

    // A adds a shared hackathon with a date-only registration deadline and a timed submission.
    await a.goto('/opportunities')
    await expect(a.getByRole('heading', { name: 'No opportunities yet' })).toBeVisible()
    await a.getByRole('link', { name: 'Add your first opportunity' }).click()
    await a.getByRole('link', { name: 'Enter details manually' }).click()
    await a.getByLabel('Name').fill('Moonshot Hack 2027')
    await a.getByLabel('Organizer').fill('Moon Labs')
    await a.getByLabel('Official website').fill('https://moonlabs.example/hack')
    await a.getByLabel('Registration deadline date').fill('2027-01-15')
    await a.getByLabel('Submission deadline date').fill('2027-01-20')
    await a.getByRole('group', { name: 'Submission deadline' }).getByLabel('Specific time').check()
    await a.getByLabel('Submission deadline time', { exact: true }).fill('23:59')
    await a.getByLabel('Submission deadline time zone').selectOption('Asia/Kolkata')
    await a.getByLabel('Minimum team size').fill('2')
    await a.getByLabel('Maximum team size').fill('4')
    await a.getByRole('button', { name: 'Save opportunity' }).click()

    await expect(a.getByRole('heading', { name: 'Moonshot Hack 2027' })).toBeVisible()
    await expect(a.getByTestId('missing-info')).toContainText('eligibility')
    await a.getByRole('tab', { name: 'Dates' }).click()
    await expect(a.getByTestId('dates-list')).toContainText('15 Jan 2027')
    await expect(a.getByTestId('dates-list')).toContainText('20 Jan 2027, 23:59')

    // A adds a private scholarship.
    await a.goto('/opportunities/new/manual')
    await a.getByLabel('Type').selectOption('scholarship')
    await a.getByLabel('Name').fill('Quiet Scholarship')
    await a.getByLabel('Visibility').selectOption('private')
    await a.getByRole('button', { name: 'Save opportunity' }).click()
    await expect(a.getByRole('heading', { name: /Quiet Scholarship/ })).toBeVisible()

    // B sets a Los Angeles time zone; date-only values must still show the same calendar date.
    await b.goto('/settings/profile')
    await b.getByLabel('Time zone').selectOption('America/Los_Angeles')
    await b.getByRole('button', { name: 'Save profile' }).click()
    await expect(b.getByRole('status').filter({ hasText: 'Profile saved' })).toBeVisible()

    // B sees the shared one with the same calendar date, and not the private one.
    await b.goto('/opportunities')
    await expect(b.getByRole('link', { name: 'Moonshot Hack 2027' })).toBeVisible()
    await expect(b.getByRole('link', { name: 'Quiet Scholarship' })).toHaveCount(0)
    await b.getByRole('link', { name: 'Moonshot Hack 2027' }).click()
    await b.getByRole('tab', { name: 'Dates' }).click()
    await expect(b.getByTestId('dates-list')).toContainText('15 Jan 2027')
    await expect(b.getByTestId('dates-list')).toContainText('your time')

    // B moves it to Interested; A sees the change in history.
    await b.getByLabel('Status').selectOption('interested')
    await expect(b.getByRole('status').filter({ hasText: 'Status: Interested' })).toBeVisible()

    await a.goto('/opportunities?view=pipeline')
    await expect(a.getByRole('region', { name: 'Discover' })).toContainText('Moonshot Hack 2027')
    await a.getByRole('link', { name: 'Moonshot Hack 2027' }).click()
    await a.getByRole('tab', { name: 'Sources & history' }).click()
    await expect(a.getByTestId('history-list')).toContainText('saved → interested')
    await expect(a.getByTestId('history-list')).toContainText('Ben')
    await expect(a.getByText('moonlabs.example')).toBeVisible()

    // Edit: move the registration deadline; history records old → new.
    await a.getByRole('link', { name: 'Edit' }).click()
    await a.getByLabel('Registration deadline date').fill('2027-01-18')
    await a.getByRole('button', { name: 'Save changes' }).click()
    await a.getByRole('tab', { name: 'Sources & history' }).click()
    await expect(a.getByTestId('history-list')).toContainText('15 Jan 2027 → 18 Jan 2027')

    // Recycle bin: A moves it away; B no longer sees it in the list.
    await a.getByRole('button', { name: 'Move to recycle bin' }).click()
    await a.getByRole('dialog').getByRole('button', { name: 'Move to recycle bin' }).click()
    await expect(a.getByRole('heading', { name: 'Opportunities', exact: true })).toBeVisible()
    await b.goto('/opportunities')
    await expect(b.getByRole('link', { name: 'Moonshot Hack 2027' })).toHaveCount(0)
  })
})
