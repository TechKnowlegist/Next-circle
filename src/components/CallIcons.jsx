// Small inline SVG icon set for the call controls — plain buttons with
// real icons instead of relying on emoji glyphs (which render differently
// across platforms/fonts). Minimal stroke style, 24x24, currentColor so
// they pick up whatever color the button itself is styled with.

const base = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }

export function MicIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
    </svg>
  )
}

export function MicOffIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 11.5 5.3" />
      <path d="M19 11a7 7 0 0 1-1.3 4.1" />
      <path d="M12 18v3" />
      <path d="M8.5 21h7" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

export function CameraIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M16 10.5l5-3v9l-5-3z" />
    </svg>
  )
}

export function CameraOffIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M3 6.5h8" />
      <path d="M3 6h7.5a2.5 2.5 0 0 1 2.5 2.5v7" />
      <path d="M16 10.5l5-3v9l-5-3z" />
      <rect x="3" y="6" width="13" height="12" rx="2.5" />
      <path d="M3 3l18 18" />
    </svg>
  )
}

export function ScreenShareIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base}>
      <rect x="2.5" y="4.5" width="19" height="13" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17.5v3.5" />
      <path d="M12 7v6" />
      <path d="M9 10l3-3 3 3" />
    </svg>
  )
}

export function PhoneEndIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 15.5c-4.5 0-8.5-1.8-8.5-4 0-1 .8-1.5 1.8-2.1 1-.6 2-1 3-1.1.5 0 .8.3 1 .7l.6 1.6c.1.4 0 .8-.3 1-.3.3-.6.6-.6 1 0 .8 1.4 1.4 3 1.4s3-.6 3-1.4c0-.4-.3-.7-.6-1-.3-.2-.4-.6-.3-1l.6-1.6c.2-.4.5-.7 1-.7 1 .1 2 .5 3 1.1 1 .6 1.8 1.1 1.8 2.1 0 2.2-4 4-8.5 4z" />
    </svg>
  )
}

export function MinimizeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} {...base}>
      <path d="M15 9l6-6" />
      <path d="M21 8V3h-5" />
      <path d="M9 15l-6 6" />
      <path d="M3 16v5h5" />
    </svg>
  )
}

export function ReactionIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...base}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8.5 10.5h.01" />
      <path d="M15.5 10.5h.01" />
      <path d="M8 14.5c1 1.2 2.4 1.8 4 1.8s3-.6 4-1.8" />
    </svg>
  )
}
