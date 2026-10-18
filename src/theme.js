// Applies a chosen accent-color pair app-wide by overriding the CSS custom
// properties index.css's :root defines — buttons, highlights, online dots,
// and heading gradients all already read from these, so setting them here
// is all "tint the whole app" takes. Also handles the light/dark mode
// attribute and a custom background image. Everything here is a
// per-browser display preference persisted to localStorage, not account
// data — no backend model for any of it.
const THEME_KEY = 'nc-theme'
const MODE_KEY = 'nc-theme-mode' // 'dark' | 'light'
const BACKGROUND_KEY = 'nc-background' // data URL, or a CSS gradient string

export function applyTheme(accent1, accent2) {
  const root = document.documentElement.style
  root.setProperty('--accent-1', accent1)
  root.setProperty('--accent-2', accent2)
  root.setProperty('--heading-1', accent1)
  root.setProperty('--heading-2', accent2)
}

export function saveTheme(accent1, accent2) {
  try {
    localStorage.setItem(THEME_KEY, JSON.stringify({ accent1, accent2 }))
  } catch {
    // private browsing / storage blocked — theme just won't persist, fine
  }
}

export function loadSavedTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY)
    if (!raw) return null
    const { accent1, accent2 } = JSON.parse(raw)
    if (accent1 && accent2) applyTheme(accent1, accent2)
    return { accent1, accent2 }
  } catch {
    return null
  }
}

// Mode (light/dark) — sets data-theme on <html>, which index.css's
// :root[data-theme='light'] block reads.
export function applyMode(mode) {
  if (mode === 'light') {
    document.documentElement.setAttribute('data-theme', 'light')
  } else {
    document.documentElement.removeAttribute('data-theme')
  }
}

export function saveMode(mode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // ignore
  }
}

export function loadSavedMode() {
  try {
    const mode = localStorage.getItem(MODE_KEY)
    if (mode) applyMode(mode)
    return mode
  } catch {
    return null
  }
}

// Background — shows through the main chat pane (the topbar/message-list
// area has no background of its own, by design, all the way down to
// <body>) while the server rail and sidebars stay opaque, same idea as
// Discord's own custom background. `value` is either a data: URL (an
// uploaded image) or a CSS gradient string (a preset).
export function applyBackground(value) {
  if (value) {
    // `background` (the shorthand), not `background-image` — some presets
    // pair a gradient with a trailing solid-color fallback
    // (e.g. "radial-gradient(...), #0a0f1c"), which background-image
    // rejects outright since a plain color isn't a valid <image>.
    document.body.style.background = value
    document.body.style.backgroundSize = 'cover'
    document.body.style.backgroundPosition = 'center'
    document.body.style.backgroundAttachment = 'fixed'
  } else {
    document.body.style.background = ''
  }
}

export function saveBackground(value) {
  try {
    if (value) localStorage.setItem(BACKGROUND_KEY, value)
    else localStorage.removeItem(BACKGROUND_KEY)
  } catch {
    // image too big for localStorage's quota (a few MB) — background just
    // won't persist across reloads, not worth surfacing as an error
  }
}

export function loadSavedBackground() {
  try {
    const value = localStorage.getItem(BACKGROUND_KEY)
    if (value) applyBackground(value)
    return value
  } catch {
    return null
  }
}

// A few built-in gradient backgrounds — no upload needed, no localStorage
// size concerns.
export const BACKGROUND_PRESETS = [
  { name: 'None', value: null },
  { name: 'Midnight', value: 'radial-gradient(ellipse 1200px 700px at 15% -10%, rgba(99, 102, 241, 0.25), transparent 60%), #0a0f1c' },
  { name: 'Sunset', value: 'linear-gradient(160deg, #1f0f1a 0%, #2b0f2e 45%, #0a0f1c 100%)' },
  { name: 'Forest', value: 'radial-gradient(ellipse 1000px 600px at 85% 110%, rgba(34, 197, 94, 0.18), transparent 60%), #06110c' },
  { name: 'Deep Sea', value: 'linear-gradient(200deg, #04141f 0%, #071c2c 50%, #020a12 100%)' },
]

// Resizes/compresses an uploaded image client-side before stuffing it in
// localStorage (which caps out around 5-10MB per origin) — a straight-off-
// a-phone-camera photo would blow that instantly otherwise.
export function resizeImageToDataUrl(file, maxDim = 1600, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => reject(new Error('Could not read that image'))
    img.src = URL.createObjectURL(file)
  })
}
