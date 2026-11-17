import { beforeEach, describe, expect, it } from 'vitest'
import { peekPendingRoute, savePendingRoute, takePendingRoute } from './pendingRoute'

describe('pendingRoute', () => {
  beforeEach(() => sessionStorage.clear())

  it('stores and consumes an internal path once', () => {
    savePendingRoute('/invite/abc')
    expect(peekPendingRoute()).toBe('/invite/abc')
    expect(takePendingRoute()).toBe('/invite/abc')
    expect(takePendingRoute()).toBeNull()
  })

  it('refuses external and protocol-relative URLs (open-redirect protection)', () => {
    savePendingRoute('https://evil.example')
    savePendingRoute('//evil.example')
    expect(takePendingRoute()).toBeNull()
  })
})
