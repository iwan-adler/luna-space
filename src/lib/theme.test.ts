import { beforeEach, describe, expect, it } from 'vitest'
import { readPalette, readThemePreference, savePalette, saveThemePreference } from './theme'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    document.documentElement.removeAttribute('data-palette')
  })

  it('defaults to the dark "Soft night" theme', () => {
    expect(readThemePreference()).toBe('dark')
  })

  it('defaults to the "blue-moon" lunar palette', () => {
    expect(readPalette()).toBe('blue-moon')
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

  it('persists and applies palette choices', () => {
    savePalette('rose-moon')
    expect(readPalette()).toBe('rose-moon')
    expect(document.documentElement.dataset.palette).toBe('rose-moon')
    savePalette('lunar-red')
    expect(readPalette()).toBe('lunar-red')
    expect(document.documentElement.dataset.palette).toBe('lunar-red')
    savePalette('gold')
    expect(readPalette()).toBe('gold')
    expect(document.documentElement.dataset.palette).toBe('gold')
  })
})
