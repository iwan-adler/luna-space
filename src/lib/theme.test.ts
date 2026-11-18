import { beforeEach, describe, expect, it } from 'vitest'
import { readThemePreference, saveThemePreference } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
  })

  it('defaults to the dark "Soft night" theme', () => {
    expect(readThemePreference()).toBe('dark')
  })

  it('persists and applies an explicit choice', () => {
    saveThemePreference('light')
    expect(readThemePreference()).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
    saveThemePreference('system')
    expect(document.documentElement.dataset.theme).toBe('system')
    saveThemePreference('dark')
    expect(readThemePreference()).toBe('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
