import { useEffect, useState } from 'react'
import InitialsAvatar from './InitialsAvatar.jsx'
import { getProfile, urlForKey } from '../profileApi.js'

// A read-only profile view — banner, avatar, display name — for whoever
// was clicked (a message author, a member-list entry, the DM sidebar, or
// your own avatar in the top bar). Avatar/banner come from ChatUserProfile
// (see its comment in amplify/data/resource.ts for why that table exists
// at all); the display name is passed in as-is rather than looked up,
// since it's already known from wherever the click happened (a message's
// authorName, a membership's userName, or your own signed-in user.name).
export default function ProfileCard({ userId, displayName, isSelf, onClose, onEdit }) {
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [bannerUrl, setBannerUrl] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getProfile(userId).then(async (profile) => {
      if (cancelled) return
      const [avatar, banner] = await Promise.all([
        urlForKey(profile?.avatarKey),
        urlForKey(profile?.bannerKey),
      ])
      if (cancelled) return
      setAvatarUrl(avatar)
      setBannerUrl(banner)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  return (
    <div className="nc-call-backdrop" onClick={onClose}>
      <div className="nc-profile-card" onClick={(e) => e.stopPropagation()}>
        <div
          className="nc-profile-banner"
          style={bannerUrl ? { backgroundImage: `url(${bannerUrl})` } : undefined}
        />
        <button type="button" className="nc-profile-close" onClick={onClose} title="Close">
          ✕
        </button>
        <div className="nc-profile-avatar-wrap">
          {avatarUrl ? (
            <img className="nc-profile-avatar-img" src={avatarUrl} alt={displayName} />
          ) : (
            <InitialsAvatar name={displayName} size={84} />
          )}
        </div>
        <div className="nc-profile-body">
          <h2>{displayName}</h2>
          {!loading && !avatarUrl && !bannerUrl && (
            <p className="nc-call-sub">{isSelf ? "You haven't set a picture yet" : 'No profile picture set'}</p>
          )}
          {isSelf && (
            <button type="button" className="nc-btn nc-btn-primary nc-profile-edit-btn" onClick={onEdit}>
              Edit Profile
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
