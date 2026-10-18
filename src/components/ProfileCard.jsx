import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { useEscapeToClose } from '../useEscapeToClose.js'
import InitialsAvatar from './InitialsAvatar.jsx'
import { getProfile, urlForKey, STATUS_OPTIONS } from '../profileApi.js'
import {
  listFriendRequests, sendFriendRequest, acceptFriendRequest, removeFriendRequest,
  listBlocked, blockUser, unblockUser,
} from '../chatApi.js'

function statusInfo(status) {
  return STATUS_OPTIONS.find((s) => s.value === status) || STATUS_OPTIONS[0]
}

// A read-only profile view — banner, avatar, display name — for whoever
// was clicked (a message author, a member-list entry, the DM sidebar, or
// your own avatar in the top bar). Avatar/banner come from ChatUserProfile
// (see its comment in amplify/data/resource.ts for why that table exists
// at all); the display name is passed in as-is rather than looked up,
// since it's already known from wherever the click happened (a message's
// authorName, a membership's userName, or your own signed-in user.name).
export default function ProfileCard({ userId, displayName, isSelf, onClose, onEdit }) {
  useEscapeToClose(onClose)
  const { user: me } = useAuth()
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [bannerUrl, setBannerUrl] = useState(null)
  const [status, setStatus] = useState(null)
  const [statusMessage, setStatusMessage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [friendRequest, setFriendRequest] = useState(null) // the row between me and them, if any
  const [blockRow, setBlockRow] = useState(null)
  const [busy, setBusy] = useState(false)

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
      setStatus(profile?.status || 'online')
      setStatusMessage(profile?.statusMessage || null)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [userId])

  useEffect(() => {
    if (isSelf) return
    let cancelled = false
    Promise.all([listFriendRequests(me.id), listBlocked(me.id)])
      .then(([requests, blocked]) => {
        if (cancelled) return
        const withThem = requests.find(
          (r) => (r.fromUserId === me.id && r.toUserId === userId) || (r.toUserId === me.id && r.fromUserId === userId)
        )
        setFriendRequest(withThem || null)
        setBlockRow(blocked.find((b) => b.blockedId === userId) || null)
      })
      .catch((err) => console.log('Next Circle — failed to load friend/block state:', err))
    return () => {
      cancelled = true
    }
  }, [userId, me?.id, isSelf])

  async function handleFriendAction() {
    setBusy(true)
    try {
      if (!friendRequest) {
        const created = await sendFriendRequest(me.id, me.name, userId, displayName)
        setFriendRequest(created)
      } else if (friendRequest.status === 'pending' && friendRequest.toUserId === me.id) {
        const updated = await acceptFriendRequest(friendRequest.id)
        setFriendRequest(updated ? { ...friendRequest, status: 'accepted' } : friendRequest)
      } else {
        await removeFriendRequest(friendRequest.id)
        setFriendRequest(null)
      }
    } catch (err) {
      console.log('Next Circle — friend action failed:', err)
    } finally {
      setBusy(false)
    }
  }

  async function handleBlockToggle() {
    setBusy(true)
    try {
      if (blockRow) {
        await unblockUser(blockRow.id)
        setBlockRow(null)
      } else {
        const created = await blockUser(me.id, userId, displayName)
        setBlockRow(created)
      }
    } catch (err) {
      console.log('Next Circle — block action failed:', err)
    } finally {
      setBusy(false)
    }
  }

  function friendButtonLabel() {
    if (!friendRequest) return 'Add Friend'
    if (friendRequest.status === 'accepted') return 'Remove Friend'
    if (friendRequest.toUserId === me.id) return 'Accept Friend Request'
    return 'Request Sent'
  }

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
          {!loading && (
            <p className="nc-profile-status">
              <span className="nc-status-dot" style={{ background: statusInfo(status).color }} />
              {statusInfo(status).label}
              {statusMessage && <span className="nc-profile-status-message"> — {statusMessage}</span>}
            </p>
          )}
          {!loading && !avatarUrl && !bannerUrl && (
            <p className="nc-call-sub">{isSelf ? "You haven't set a picture yet" : 'No profile picture set'}</p>
          )}
          {isSelf && (
            <button type="button" className="nc-btn nc-btn-primary nc-profile-edit-btn" onClick={onEdit}>
              Edit Profile
            </button>
          )}
          {!isSelf && (
            <div className="nc-profile-social-actions">
              <button type="button" className="nc-btn" disabled={busy} onClick={handleFriendAction}>
                {friendButtonLabel()}
              </button>
              <button type="button" className="nc-btn nc-danger-btn" disabled={busy} onClick={handleBlockToggle}>
                {blockRow ? 'Unblock' : 'Block'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
