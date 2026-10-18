// Applies a chosen accent-color pair app-wide by overriding the CSS custom
// properties index.css's :root defines — buttons, highlights, online dots,
// and heading gradients all already read from these, so setting them here
// is all "tint the whole app" takes. Persisted to localStorage (a per-
// browser display preference, not account data — no need for a backend
// model for this).
const STORAGE_KEY = 'nc-theme'

export function applyTheme(accent1, accent2) {
  const root = document.documentElement.style
  root.setProperty('--accent-1', accent1)
  root.setProperty('--accent-2', accent2)
  root.setProperty('--heading-1', accent1)
  root.setProperty('--heading-2', accent2)
}

export function saveTheme(accent1, accent2) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ accent1, accent2 }))
  } catch {
    // private browsing / storage blocked — theme just won't persist, fine
  }
}

export function loadSavedTheme() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const { accent1, accent2 } = JSON.parse(raw)
    if (accent1 && accent2) applyTheme(accent1, accent2)
    return { accent1, accent2 }
  } catch {
    return null
  }
}
