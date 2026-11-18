import { expect, test } from '@playwright/test'
import { onboardWithInvite } from './support/actions'
import { createTestUser, localBackend, seedExtractionRun } from './support/backend'

const dateOnly = (d: string) => ({
  all_day: true,
  on_date: d,
  at_time: null,
  source_timezone: null,
})

test.describe('URL extraction (Phase 3)', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('blocked addresses fall back to the manual form with the reason (AC-13)', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'runs once on desktop')
    const user = await createTestUser('Fay')
    const page = await (await browser.newContext()).newPage()
    await onboardWithInvite(page, user, 'Fetch Crew')
    await page.goto('/opportunities/new')
    await page
      .getByLabel('Link to the opportunity')
      .fill('http://169.254.169.254/latest/meta-data/')
    await page.getByRole('button', { name: 'Fetch details' }).click()
    await expect(page.getByTestId('fallback-reason')).toContainText('cannot be fetched', {
      timeout: 30_000,
    })
    await expect(page.getByLabel('Official website')).toHaveValue(
      'http://169.254.169.254/latest/meta-data/',
    )
  })

  test('review: statuses, resolve a conflict, check an inferred value, save with provenance (AC-08–AC-12)', async ({
    browser,
    isMobile,
  }) => {
    test.skip(isMobile, 'runs once on desktop')
    const user = await createTestUser('Gita')
    const page = await (await browser.newContext()).newPage()
    await onboardWithInvite(page, user, 'Review Crew')
    const url = `https://review-${Date.now()}.example/hack`
    const runId = await seedExtractionRun(user.id!, url, [
      {
        field_key: 'title',
        status: 'confirmed',
        value: 'Nova Hack',
        evidence: 'JSON-LD name: "Nova Hack"',
        rule_id: 'jsonld.name',
      },
      {
        field_key: 'official_url',
        status: 'confirmed',
        value: url,
        evidence: `Fetched page: ${url}`,
        rule_id: 'page.url',
      },
      {
        field_key: 'registration_deadline',
        status: 'confirmed',
        value: dateOnly('2027-02-01'),
        evidence: 'Registration closes on 1 February 2027',
        rule_id: 'label.registration_deadline',
      },
      {
        field_key: 'submission_deadline',
        candidate_no: 1,
        status: 'conflicting',
        value: dateOnly('2027-02-10'),
        evidence: 'Submissions close on 10 February 2027',
        rule_id: 'label.submission_deadline',
      },
      {
        field_key: 'submission_deadline',
        candidate_no: 2,
        status: 'conflicting',
        value: dateOnly('2027-02-12'),
        evidence: 'Final submission deadline is 12 February 2027',
        rule_id: 'label.submission_deadline',
      },
      {
        field_key: 'team_max',
        status: 'inferred',
        value: 4,
        evidence: 'Teams of up to four members',
        rule_id: 'label.team_max',
        reason: 'number written as a word',
      },
      {
        field_key: 'mode',
        status: 'confirmed',
        value: 'online',
        evidence: 'Mode: Online',
        rule_id: 'label.mode',
      },
      { field_key: 'eligibility_text', status: 'missing', value: null, evidence: null },
    ])

    await page.goto(`/opportunities/review/${runId}`)
    await expect(page.getByRole('heading', { name: 'Review extracted details' })).toBeVisible()
    const save = page.getByRole('button', { name: 'Save opportunity' })
    await expect(save).toBeDisabled()
    await expect(page.getByText('1 conflict to resolve · 1 inferred value to check')).toBeVisible()

    const sub = page.locator('[data-field="submission_deadline"]')
    await expect(sub).toContainText('Final submission deadline is 12 February 2027')
    await sub.getByRole('radio', { name: /12 Feb 2027/ }).check()
    const team = page.locator('[data-field="team_max"]')
    await expect(team).toContainText('Why inferred: number written as a word')
    await team.getByLabel('I checked this').check()
    await expect(page.locator('[data-field="eligibility_text"]')).toContainText('? Missing')
    await expect(save).toBeEnabled()
    await save.click()

    await expect(page.getByRole('heading', { name: 'Nova Hack' })).toBeVisible()
    const facts = page.getByTestId('key-facts')
    await expect(facts).toContainText('Online')
    await expect(facts).toContainText('✓ Confirmed')
    await expect(facts).toContainText('Team up to 4')
    await expect(facts).toContainText('≈ Inferred')
    await page.getByRole('tab', { name: 'Dates' }).click()
    await expect(page.getByTestId('dates-list')).toContainText('12 Feb 2027')
    await page.getByRole('tab', { name: 'Sources & history' }).click()
    await expect(page.getByTestId('history-list')).toContainText('extraction')

    // Pasting the same link again shows the existing opportunity instead of a new extraction.
    await page.goto('/opportunities/new')
    await page.getByLabel('Link to the opportunity').fill(url)
    await page.getByRole('button', { name: 'Fetch details' }).click()
    await expect(page.getByText('You already track this link as')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Nova Hack' })).toBeVisible()
  })
})
