import { expect, type Page } from '@playwright/test'
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
  await page.getByRole('button', { name: 'Create invitation link' }).click()
  return page.getByTestId('invite-link').inputValue()
}

export async function acceptInvite(page: Page, inviteUrl: string, user: TestUser) {
  await page.goto(inviteUrl)
  await page.getByRole('button', { name: 'Sign in to accept' }).click()
  await signIn(page, user)
  await page.getByRole('button', { name: 'Join workspace' }).click()
}
