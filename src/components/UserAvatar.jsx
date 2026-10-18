import { useEffect, useState } from 'react'
import InitialsAvatar from './InitialsAvatar.jsx'
import { getProfile, urlForKey } from '../profileApi.js'

// Small inline avatars (a message, a member-list row, the top bar) need
// the SAME picture ProfileCard shows in its big popup, but there can be a
// lot of them on screen for the same few users (every message from the
// same author) — so this caches the resolved URL per userId in memory
// instead of every instance independently querying ChatUserProfile + S3.
const avatarCache = new Map() // userId -> resolved url (or null — no avatar set)
const inflight = new Map() // userId -> in-progress Promise<url>

// Call after a successful avatar save so every UserAvatar for that user
// (which may already be mounted and cached) picks up the new picture
// without needing a full page reload.
export function invalidateAvatarCache(userId) {
  avatarCache.delete(userId)
  inflight.delete(userId)
}

function resolveAvatarUrl(userId) {
  if (avatarCache.has(userId)) return Promise.resolve(avatarCache.get(userId))
  if (inflight.has(userId)) return inflight.get(userId)
  const promise = getProfile(userId)
    .then((profile) => urlForKey(profile?.avatarKey))
    .then((url) => {
      avatarCache.set(userId, url)
      inflight.delete(userId)
      return url
    })
  inflight.set(userId, promise)
  return promise
}

export default function UserAvatar({ userId, name, size = 30 }) {
  const [url, setUrl] = useState(() => avatarCache.get(userId) ?? null)

  useEffect(() => {
    let cancelled = false
    resolveAvatarUrl(userId).then((resolved) => {
      if (!cancelled) setUrl(resolved)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  if (url) {
    return <img className="nc-avatar-img" src={url} alt={name} style={{ width: size, height: size }} />
  }
  return <InitialsAvatar name={name} size={size} />
}
