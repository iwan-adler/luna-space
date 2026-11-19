import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { onboardWithInvite } from './support/actions'
import { createTestUser, localBackend } from './support/backend'

// Accessibility audit (NFR-A11Y, ADR 0022): WCAG 2.1 A/AA rules on every main page, in the dark
// and light themes. Serious and critical findings fail the build.
const PAGES = [
  '/',
  '/opportunities',
  '/opportunities?view=timeline',
  '/projects',
  '/tasks',
  '/calendar',
  '/calendar?view=week',
  '/notes',
  '/chat',
  '/vault',
  '/teams',
  '/trophies',
  '/notifications',
  '/search?q=hack',
  '/settings/profile',
  '/settings/workspace',
  '/settings/data',
  '/trash',
]

async function audit(page: Page, label: string) {
  // Let entrances finish so colours are measured at their final opacity.
  await page.evaluate(() =>
    document.getAnimations().forEach((a) => {
      try {
        a.finish()
      } catch {
        // endless (decorative) animations cannot finish
      }
    }),
  )
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  const serious = result.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
  const report = serious.map(
    (v) =>
      `${label}: ${v.id} (${v.impact}) — ${v.help}\n    ${v.nodes
        .slice(0, 3)
        .map((n) => n.target.join(' '))
        .join('\n    ')}`,
  )
  expect(report, report.join('\n')).toEqual([])
}

test.describe('accessibility', () => {
  test.skip(!localBackend(), 'needs the local Supabase stack')

  test('sign-in page', async ({ page }) => {
    await page.goto('/auth/sign-in')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await audit(page, 'sign-in')
  })

  for (const theme of ['dark', 'light'] as const) {
    test(`main pages (${theme})`, async ({ browser, isMobile }) => {
      test.skip(isMobile, 'desktop layout; the phone layout shares the same components')
      test.setTimeout(120_000)
      const user = await createTestUser(`A11y${theme}`)
      const context = await browser.newContext({ colorScheme: theme })
      const page = await context.newPage()
      await page.addInitScript((t) => {
        try {
          localStorage.setItem('luna.theme', t === 'light' ? 'light' : 'dark')
        } catch {
          // storage unavailable
        }
      }, theme)
      await onboardWithInvite(page, user, `A11y ${theme}`)
      await page.getByRole('button', { name: 'Go to my dashboard' }).click()
      for (const path of PAGES) {
        await page.goto(path)
        await page.waitForLoadState('networkidle')
        await audit(page, `${theme} ${path}`)
      }
    })
  }
})
