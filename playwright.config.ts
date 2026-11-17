import { defineConfig, devices } from '@playwright/test'

const CI = Boolean(process.env.CI)
// Locally, reuse the installed Google Chrome so no browser download is needed.
// In CI, `npx playwright install --with-deps chromium` provides the browser.
const channel = CI ? undefined : 'chrome'

export default defineConfig({
  testDir: 'tests/e2e',
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  reporter: CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel } },
    { name: 'android', use: { ...devices['Pixel 7'], channel } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !CI,
    timeout: 180_000,
  },
})
