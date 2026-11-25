/** Light is the default; dark and "match device" are available in profile settings. */
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

let systemMediaQuery: MediaQueryList | null = null

function handleSystemThemeChange() {
  if (readThemePreference() === 'system') {
    applyTheme('system')
  }
}

/** Applies the preference to <html data-theme>; tokens.css reads it. */
export function applyTheme(pref: ThemePreference) {
  document.documentElement.setAttribute('data-theme', pref)

  if (typeof window !== 'undefined') {
    if (!systemMediaQuery && window.matchMedia) {
      systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      systemMediaQuery.addEventListener('change', handleSystemThemeChange)
    }

    const isDark = pref === 'dark' || (pref === 'system' && (systemMediaQuery?.matches ?? true))

    if (isDark) {
      document.documentElement.classList.add('dark')
      document.documentElement.classList.remove('light')
    } else {
      document.documentElement.classList.add('light')
      document.documentElement.classList.remove('dark')
    }

    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'

    const metaTheme = document.querySelector('meta[name="theme-color"]:not([media])')
    if (metaTheme) {
      metaTheme.setAttribute('content', isDark ? '#000000' : '#f5f5f7')
    }
  }
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

/** Lunar accent palettes: Blue Moon (iOS Blue default), Moonlight Gold, Golden Pink, Lunar Red. */
export type Palette = 'gold' | 'rose-moon' | 'lunar-red' | 'blue-moon'
const PALETTE_KEY = 'luna.palette'

export function readPalette(): Palette {
  try {
    const value = localStorage.getItem(PALETTE_KEY) as Palette | null
    if (
      value === 'gold' ||
      value === 'rose-moon' ||
      value === 'lunar-red' ||
      value === 'blue-moon'
    ) {
      return value
    }
    return 'blue-moon'
  } catch {
    return 'blue-moon'
  }
}

export function applyPalette(palette: Palette) {
  document.documentElement.setAttribute('data-palette', palette)
}

export function savePalette(palette: Palette) {
  try {
    localStorage.setItem(PALETTE_KEY, palette)
  } catch {
    // storage unavailable: the choice still applies for this page view
  }
  applyPalette(palette)
}
