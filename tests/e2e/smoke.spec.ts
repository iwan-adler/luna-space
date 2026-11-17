import { expect, test } from '@playwright/test'

test('home page loads with the app shell', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Luna Space')
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome to Luna Space' })).toBeVisible()
  await expect(page.getByTestId('backend-status')).toBeVisible()
})

test('client-side routing reaches the sign-in placeholder', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('link', { name: 'Placeholder' }).click()
  await expect(page).toHaveURL(/\/auth\/sign-in$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Sign in' })).toBeVisible()
})

test('page has no horizontal scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('production security headers allow the app to run without CSP violations', async ({
  page,
}) => {
  const violations: string[] = []
  page.on('console', (msg) => {
    if (/Content Security Policy|Refused to/i.test(msg.text())) violations.push(msg.text())
  })
  page.on('pageerror', (err) => violations.push(err.message))

  const response = await page.goto('/')
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'")
  await expect(page.getByRole('heading', { level: 1, name: 'Welcome to Luna Space' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(violations).toEqual([])
})
