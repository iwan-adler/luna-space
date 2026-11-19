/** Dark ("Soft night") is the default; light and "match device" are opt-in (ADR 0005). */
export type ThemePreference = 'dark' | 'light' | 'system'

const KEY = 'luna.theme'

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'system' ? value : 'dark'
  } catch {
    return 'dark'
  }
}

/** Applies the preference to <html data-theme>; tokens.css reads it. */
export function applyTheme(pref: ThemePreference) {
  document.documentElement.setAttribute('data-theme', pref)
}

export function saveThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'dark') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    // storage unavailable (private mode): the choice still applies for this page view
  }
  applyTheme(pref)
}

/** Accent palettes (ADR 0020): Mauve Nocturne (default), Midnight Teal, Solar Amber. */
export type Palette = 'mauve' | 'teal' | 'amber'
const PALETTE_KEY = 'luna.palette'

export function readPalette(): Palette {
  try {
    const value = localStorage.getItem(PALETTE_KEY)
    return value === 'teal' || value === 'amber' ? value : 'mauve'
  } catch {
    return 'mauve'
  }
}

export function applyPalette(palette: Palette) {
  if (palette === 'mauve') document.documentElement.removeAttribute('data-palette')
  else document.documentElement.setAttribute('data-palette', palette)
}

export function savePalette(palette: Palette) {
  try {
    if (palette === 'mauve') localStorage.removeItem(PALETTE_KEY)
    else localStorage.setItem(PALETTE_KEY, palette)
  } catch {
    // storage unavailable: the choice still applies for this page view
  }
  applyPalette(palette)
}
