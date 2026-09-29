// Theme scheme — module-singleton so TopStrip, CommandPalette, and anything
// else share one source of truth (localStorage `bellsnotes_theme` + .dark class).
import { ref } from 'vue'

type Scheme = 'light' | 'dark'
const THEME_KEY = 'bellsnotes_theme'

function initial(): Scheme {
  if (typeof window === 'undefined') return 'light'
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

const scheme = ref<Scheme>(initial())

function apply(t: Scheme): void {
  scheme.value = t
  document.documentElement.classList.toggle('dark', t === 'dark')
  localStorage.setItem(THEME_KEY, t)
}

// Sync the DOM on first use (e.g. palette mounted before TopStrip toggles).
if (typeof window !== 'undefined') apply(scheme.value)

export function useTheme() {
  function toggle(): void {
    apply(scheme.value === 'light' ? 'dark' : 'light')
  }
  return { scheme, toggle }
}
