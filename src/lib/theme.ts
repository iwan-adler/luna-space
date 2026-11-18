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
