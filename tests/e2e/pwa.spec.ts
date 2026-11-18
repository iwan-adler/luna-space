import { expect, test } from '@playwright/test'

test.describe('installable app and push plumbing (Phase 5b)', () => {
  test('manifest, icons and service worker are served', async ({ page, request }) => {
    const manifest = await request.get('/manifest.webmanifest')
    expect(manifest.ok()).toBe(true)
    const body = (await manifest.json()) as { name: string; icons: { src: string }[] }
    expect(body.name).toBe('Luna Space')
    for (const icon of body.icons) expect((await request.get(icon.src)).ok()).toBe(true)

    const sw = await request.get('/sw.js')
    expect(sw.ok()).toBe(true)
    expect(sw.headers()['content-type']).toContain('javascript')
    expect(await sw.text()).toContain("addEventListener('push'")

    await page.goto('/')
    const registered = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready
      return reg.active?.scriptURL ?? ''
    })
    expect(registered).toMatch(/\/sw\.js$/)
  })
})
