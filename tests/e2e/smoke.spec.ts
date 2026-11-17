import { expect, test } from '@playwright/test'

test('signed-out visitors land on sign-in', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle('Luna Space')
  await expect(page).toHaveURL(/\/auth\/sign-in$/)
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
})

test('sign-in validates input before calling the server', async ({ page }) => {
  await page.goto('/auth/sign-in')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByText('Enter a valid email address')).toBeVisible()
})

test('page has no horizontal scroll at phone width', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 })
  await page.goto('/auth/sign-up')
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

  const response = await page.goto('/auth/sign-in')
  expect(response?.headers()['content-security-policy']).toContain("default-src 'self'")
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  expect(violations).toEqual([])
})
