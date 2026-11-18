import { expect, test } from '@playwright/test'
import { acceptInvite, onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

test.describe('vault and search (Phase 7)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('folders, a note, a file and a link; tags; search everywhere', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'journey runs once on desktop')
    const [ua, ub] = await Promise.all([createTestUser('Ana'), createTestUser('Ben')])
    const a = await (await browser.newContext()).newPage()
    const url = await onboardWithInvite(a, ua, 'Vault Crew')
    await a.getByRole('button', { name: 'Go to my dashboard' }).click()
    const b = await (await browser.newContext()).newPage()
    await acceptInvite(b, url, ub)
    await expect(b.getByRole('heading', { level: 1, name: /, Ben/ })).toBeVisible()

    // A makes Research > Papers.
    await a.getByRole('link', { name: 'Vault' }).first().click()
    await a.getByRole('button', { name: 'New folder', exact: true }).click()
    await a.getByLabel('Name', { exact: true }).fill('Research')
    await a.getByRole('button', { name: 'Create folder' }).click()
    await a
      .getByRole('complementary', { name: 'Folders' })
      .getByRole('link', { name: 'Research' })
      .click()
    await a.getByRole('button', { name: 'New folder in Research' }).click()
    await a.getByLabel('Name', { exact: true }).fill('Papers')
    await a.getByRole('button', { name: 'Create folder' }).click()
    await a.getByRole('list', { name: 'Sub-folders' }).getByRole('link', { name: 'Papers' }).click()
    await expect(a.getByRole('navigation', { name: 'Folder path' })).toContainText('Research')

    // A link with tags, and a file, inside Papers.
    await a.getByRole('button', { name: 'Add link' }).click()
    await a.getByLabel('Web address').fill('example.org/lunar-rovers')
    await a.getByLabel('Title', { exact: true }).fill('Lunar rover survey')
    await a.getByLabel('Tags', { exact: true }).fill('Robotics, #Moon')
    await a.getByRole('button', { name: 'Save link' }).click()
    const items = a.getByTestId('vault-items')
    await expect(items).toContainText('Lunar rover survey')
    await expect(items).toContainText('#moon')
    await a.getByTestId('vault-file-input').setInputFiles({
      name: 'rover-notes.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('wheel torque figures'),
    })
    await expect(items).toContainText('rover-notes.txt', { timeout: 15_000 })

    // A note started from the folder lands in it.
    await a.getByRole('button', { name: 'New note' }).click()
    await a.getByLabel('Note title').fill('Rover hackathon ideas')
    await a.getByLabel('Note text').fill('A dashboard for lunar telemetry')
    await expect(a.getByTestId('save-status')).toContainText('Saved', { timeout: 10_000 })
    await a.goBack()
    await expect(items).toContainText('Rover hackathon ideas')

    // B sees the shared folder live and filters by tag.
    await b.goto('/vault')
    await b
      .getByRole('complementary', { name: 'Folders' })
      .getByRole('link', { name: 'Research' })
      .click()
    await b.getByRole('list', { name: 'Sub-folders' }).getByRole('link', { name: 'Papers' }).click()
    await expect(b.getByTestId('vault-items')).toContainText('Lunar rover survey')
    await b.getByRole('button', { name: '#robotics' }).first().click()
    await expect(b.getByRole('button', { name: 'Clear tag robotics' })).toBeVisible()
    await expect(b.getByTestId('vault-items')).toContainText('Lunar rover survey')
    await expect(b.getByTestId('vault-items')).not.toContainText('rover-notes.txt')

    // Vault search highlights matches.
    await b.getByPlaceholder('Search notes, files and links').fill('telemet')
    const vaultHits = b.getByTestId('vault-search-results')
    await expect(vaultHits).toContainText('Rover hackathon ideas')
    await expect(vaultHits.locator('mark').first()).toHaveText(/telemetry/i)

    // Ctrl K searches everything, including chat, and opens a result.
    await b.keyboard.press('Control+k')
    const box = b.getByRole('combobox', { name: 'Search or jump to' })
    await box.fill('rover')
    await expect(b.getByRole('option', { name: /Lunar rover survey/ })).toBeVisible()
    await b.getByRole('option', { name: /See all results/ }).click()
    await expect(b).toHaveURL(/\/search\?q=rover/)
    await expect(b.getByTestId('search-results')).toContainText('Rover hackathon ideas')
    await b.getByTestId('search-results').getByText('Rover hackathon ideas').click()
    await expect(b.getByLabel('Note title')).toHaveValue('Rover hackathon ideas')

    // Deleting Research keeps its contents: they move to the top level.
    await a.goto('/vault')
    await a
      .getByRole('complementary', { name: 'Folders' })
      .getByRole('link', { name: 'Research' })
      .click()
    await a.getByRole('button', { name: 'Delete folder' }).click()
    await a.getByRole('button', { name: 'Delete folder' }).last().click()
    await expect(a).toHaveURL(/\/vault$/)
    await expect(a.getByTestId('vault-items')).toContainText('Lunar rover survey')
  })
})
