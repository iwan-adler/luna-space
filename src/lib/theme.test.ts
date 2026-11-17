import { beforeEach, describe, expect, it } from 'vitest'
import { readThemePreference, saveThemePreference } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to following the system', () => {
    expect(readThemePreference()).toBe('system')
  })

  it('persists and applies an explicit choice', () => {
    saveThemePreference('dark')
    expect(readThemePreference()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    saveThemePreference('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
