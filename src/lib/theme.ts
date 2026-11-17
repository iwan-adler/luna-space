export type ThemePreference = 'system' | 'light' | 'dark'

const KEY = 'luna.theme'

export function readThemePreference(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

/** Applies the preference to <html data-theme>; "system" removes the attribute (tokens.css follows the OS). */
export function applyTheme(pref: ThemePreference) {
  const root = document.documentElement
  if (pref === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', pref)
}

export function saveThemePreference(pref: ThemePreference) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch {
    // storage unavailable (private mode): the choice still applies for this page view
  }
  applyTheme(pref)
}
