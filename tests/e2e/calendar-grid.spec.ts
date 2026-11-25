import { expect, test } from '@playwright/test'
import { choose, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

/** Monday of a week well in the future, so nothing else is scheduled there. */
function futureMonday(): string {
  const d = new Date(Date.now() + 21 * 86_400_000)
  const back = (d.getUTCDay() + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back))
    .toISOString()
    .slice(0, 10)
}
const plusDays = (d: string, n: number) =>
  new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)

test.describe('calendar grid, repeats and clashes', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('create from a slot, drag to move, repeat weekly, skip a date, warn on overlap', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'drag journey runs on desktop')
    const user = await createTestUser('Cal')
    const page = await (await browser.newContext({ timezoneId: 'Asia/Kolkata' })).newPage()
    await onboardWithInvite(page, user, 'Grid Crew')
    await page.getByRole('button', { name: 'Go to my dashboard' }).click()
    const monday = futureMonday()
    const tuesday = plusDays(monday, 1)
    await page.goto(`/calendar?view=week&date=${monday}`)
    await expect(page.getByTestId('calendar-timegrid')).toBeVisible()

    // Click Tuesday 14:00 (48 px per hour) to create an event there.
    const tue = page.locator(`[data-day="${tuesday}"]`)
    await tue.scrollIntoViewIfNeeded()
    const box = (await tue.boundingBox())!
    await page.mouse.click(box.x + box.width / 2, box.y + 14 * 48 + 10)
    await expect(page.getByLabel('Starts')).toHaveValue(`${tuesday}T14:00`)
    await page.getByLabel('Title').fill('Mentor call')
    await page.getByRole('button', { name: 'Add event' }).click()
    const block = page.getByRole('button', { name: 'Mentor call, 14:00, drag to move' })
    await expect(block).toBeVisible()

    // Drag it down one hour.
    const b = (await block.boundingBox())!
    await page.mouse.move(b.x + b.width / 2, b.y + 8)
    await page.mouse.down()
    await page.mouse.move(b.x + b.width / 2, b.y + 8 + 24, { steps: 4 })
    await page.mouse.move(b.x + b.width / 2, b.y + 8 + 48, { steps: 4 })
    await page.mouse.up()
    await expect(page.getByText('Moved "Mentor call"')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Mentor call, 15:00, drag to move' }),
    ).toBeVisible()

    // The dialog warns while choosing a time that overlaps another event.
    await page.getByRole('button', { name: 'New event' }).click()
    await page.getByLabel('Starts').fill(`${tuesday}T15:30`)
    await expect(page.getByTestId('overlap-warning')).toContainText('Mentor call')
    await page.getByRole('button', { name: 'Cancel' }).click()

    // A weekly event on Mondays and Tuesdays at 15:00 overlaps the moved call.
    await page.getByRole('button', { name: 'New event' }).click()
    await page.getByLabel('Title').fill('Standup')
    await page.getByLabel('Starts').fill(`${monday}T15:00`)
    await choose(page, 'Repeat', 'WEEKLY')
    await page.getByRole('button', { name: 'Tuesday' }).click()
    await page.getByRole('button', { name: 'Add event' }).click()
    await expect(page.getByRole('button', { name: /^Standup, 15:00/ })).toHaveCount(2)
    await expect(page.getByTestId('clash-banner')).toContainText('1 clash')

    // Skip Tuesday's occurrence: the clash goes away.
    await page
      .locator(`[data-day="${tuesday}"]`)
      .getByRole('button', { name: /^Standup, 15:00/ })
      .click()
    await page.getByRole('button', { name: 'Skip this date' }).click()
    await expect(page.getByRole('button', { name: /^Standup, 15:00/ })).toHaveCount(1)
    await expect(page.getByTestId('clash-banner')).toHaveCount(0)

    // Next week it repeats on both days again.
    await page.getByRole('button', { name: 'Next' }).click()
    await expect(page.getByRole('button', { name: /^Standup, 15:00/ })).toHaveCount(2)

    // Home shows today and the next 7 days from the same calendar.
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Today and the next 7 days' })).toBeVisible()
  })
})
