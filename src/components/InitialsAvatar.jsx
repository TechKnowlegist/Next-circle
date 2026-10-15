// Colored circle with a first initial — same pattern as Nextlayer3D's own
// InitialsAvatar.jsx. No upload flow for v1, just a deterministic color
// from the name/id itself so a given person always gets the same color
// instead of a new one every render.
function nameToHue(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash) % 360
}

export default function InitialsAvatar({ name, size = 32 }) {
  const safeName = (name || '?').trim()
  const initial = safeName.charAt(0).toUpperCase() || '?'
  const hue = nameToHue(safeName)

  return (
    <span
      className="nc-avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.45,
        background: `hsl(${hue}, 62%, 42%)`,
      }}
    >
      {initial}
    </span>
  )
}
