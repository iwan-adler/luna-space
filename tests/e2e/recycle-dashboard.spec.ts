import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('recycle bin, dashboard and export (Phase 8a)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('the partner restores a deleted note; dashboard views; data export', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
    const a = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(a, ua, 'Bin Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    const b = await (await browser.newContext({ acceptDownloads: true })).newPage()
    await acceptInvite(b, url, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()

    // Ana writes a note from the dashboard's quick action, then deletes it.
    await a
      .getByRole('navigation', { name: 'Quick actions' })
      .getByRole('button', { name: 'New note' })
      .click()
    await a.getByLabel('Note title').fill('Sponsor list')
    await expect(a.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })
    await a.getByRole('button', { name: 'Delete note' }).click()
    await a.getByRole('button', { name: 'Delete note' }).last().click()
    await expect(a).toHaveURL(/\/notes$/)

    // Ben finds it in the recycle bin and restores it.
    await b.goto('/trash')
    const bin = b.getByTestId('recycle-bin')
    await expect(bin).toContainText('Sponsor list')
    await expect(bin).toContainText('deleted by Ana')
    await expect(bin).toContainText('30 days left')
    await b.getByRole('button', { name: 'Restore Sponsor list' }).click()
    await expect(b.getByText('Nothing deleted')).toBeVisible()
    await b.goto('/notes')
    await expect(b.getByTestId('note-list')).toContainText('Sponsor list')

    // Dashboard: shared activity shows Ana's note; the Me view shows only Ben's own actions.
    await b.goto('/')
    await expect(b.getByTestId('activity')).toContainText('Ana')
    await expect(b.getByTestId('activity')).toContainText('Sponsor list')
    await b.getByRole('button', { name: 'Me', exact: true }).click()
    await expect(b.getByRole('button', { name: 'Me', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(b.getByText('Nothing has happened here yet.')).toBeVisible()
    await b.reload()
    await expect(b.getByRole('button', { name: 'Me', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    // Export: one JSON file with the shared note in it.
    await b.goto('/settings/data')
    const [download] = await Promise.all([
      b.waitForEvent('download'),
      b.getByRole('button', { name: 'Download my data' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^luna-space-bin-crew-\d{4}-\d{2}-\d{2}\.json$/)
    const data = JSON.parse(await readFile((await download.path())!, 'utf8')) as {
      format: string
      tables: { notes: { title: string }[] }
    }
    expect(data.format).toBe('luna-space-export')
    expect(data.tables.notes.map((n) => n.title)).toContain('Sponsor list')
  })
})
