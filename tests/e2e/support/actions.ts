import { expect, type Locator, type Page } from '@playwright/test'
import type { TestUser } from './backend'

export async function signIn(page: Page, user: TestUser) {
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
}

/** Signs a fresh account in and walks onboarding up to a created workspace + invitation link. */
export async function onboardWithInvite(page: Page, user: TestUser, workspace: string) {
  await page.goto('/')
  await signIn(page, user)
  await expect(page.getByText('Step 1 of 3')).toBeVisible()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByLabel('Workspace name').fill(workspace)
  await page.getByRole('button', { name: 'Create workspace' }).click()
  await page.getByRole('button', { name: 'Create invite link' }).click()
  return page.getByTestId('invite-link').inputValue()
}

export async function acceptInvite(page: Page, inviteUrl: string, user: TestUser) {
  await page.goto(inviteUrl)
  await page.getByRole('button', { name: 'Sign in to accept' }).click()
  await signIn(page, user)
  await page.getByRole('button', { name: 'Join workspace' }).click()
}

/**
 * Picks an option in a dropdown, native <select> or the custom combobox (ADR 0023). `choice` is
 * the option's value, or `{ label }` for its visible text.
 */
export async function choose(
  scope: Page | Locator,
  name: string,
  choice: string | { label: string },
) {
  const box = scope.getByRole('combobox', { name, exact: true })
  if ((await box.evaluate((el) => el.tagName)) === 'SELECT') {
    await box.selectOption(choice)
    return
  }
  await box.click()
  const list = scope.getByRole('listbox', { name, exact: true })
  const option =
    typeof choice === 'string'
      ? list.locator(`[role="option"][data-value="${choice}"]`)
      : list.getByRole('option', { name: choice.label, exact: true })
  await option.click()
}

/** The value a dropdown currently holds. */
export function dropdown(scope: Page | Locator, name: string) {
  return scope.getByRole('combobox', { name, exact: true })
}
