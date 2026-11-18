import { expect, test } from '@playwright/test'
import { onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('calendar sync link', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('create a private link, read it as a calendar app would, turn it off', async ({
    browser,
    request,
    isMobile,
  }) => {
    test.skip(isMobile, 'runs once on desktop')
    const user = await createTestUser('Syd')
    const page = await (await browser.newContext()).newPage()
    await onboardWithInvite(page, user, 'Sync Crew')
    await page.getByRole('button', { name: 'Go to my dashboard' }).click()

    const day = new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10)
    await page.goto(`/calendar?view=agenda&date=${day}`)
    await page.getByRole('button', { name: 'New event' }).click()
    await page.getByLabel('Title').fill('Demo day')
    await page.getByLabel('All day').check()
    await page.getByLabel('Date', { exact: true }).fill(day)
    await page.getByRole('button', { name: 'Add event' }).click()
    await expect(page.getByText('Event added')).toBeVisible()

    await page.getByRole('button', { name: 'Sync' }).click()
    await page.getByRole('button', { name: 'Create sync link' }).click()
    const link = await page.getByTestId('sync-link').inputValue()
    expect(link).toMatch(/\/functions\/v1\/calendar-ics\?token=[\w-]{40,}$/)

    // A freshly started function can answer 503 while it boots; calendar apps simply retry.
    await expect.poll(async () => (await request.get(link)).status(), { timeout: 60_000 }).toBe(200)
    const res = await request.get(link)
    expect(res.headers()['content-type']).toContain('text/calendar')
    const ics = await res.text()
    expect(ics).toContain('BEGIN:VCALENDAR')
    expect(ics).toContain('SUMMARY:Demo day')
    expect(ics).toContain(`DTSTART;VALUE=DATE:${day.replace(/-/g, '')}`)

    await page.getByRole('button', { name: 'Turn off sync' }).click()
    await expect(page.getByText('Sync turned off')).toBeVisible()
    expect((await request.get(link)).status()).toBe(404)
  })
})
