import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { useEscapeToClose } from '../useEscapeToClose.js'
import { listFriendRequests, acceptFriendRequest, removeFriendRequest } from '../chatApi.js'
import UserAvatar from './UserAvatar.jsx'

// A simple three-tab view over the one ChatFriendRequest table (see
// chatApi.js) — "Friends" is just the accepted rows, "Pending" the ones
// sent TO me, "Sent" the ones I sent that are still waiting. Opened from
// the new 👥 rail icon; onStartDM lets a friend row jump straight into a
// DM with them (reuses the same getOrCreateDMThread ChatHome already
// calls when DMing someone from a server's member list).
export default function FriendsPanel({ onClose, onStartDM }) {
  useEscapeToClose(onClose)
  const { user } = useAuth()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('friends')

  useEffect(() => {
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function refresh() {
    setLoading(true)
    listFriendRequests(user.id)
      .then(setRequests)
      .catch((err) => console.log('Next Circle — failed to load friends:', err))
      .finally(() => setLoading(false))
  }

  async function handleAccept(id) {
    await acceptFriendRequest(id)
    refresh()
  }

  async function handleRemove(id) {
    await removeFriendRequest(id)
    refresh()
  }

  const friends = requests
    .filter((r) => r.status === 'accepted')
    .map((r) => (r.fromUserId === user.id ? { id: r.id, userId: r.toUserId, name: r.toUserName } : { id: r.id, userId: r.fromUserId, name: r.fromUserName }))
  const pending = requests.filter((r) => r.status === 'pending' && r.toUserId === user.id)
  const sent = requests.filter((r) => r.status === 'pending' && r.fromUserId === user.id)

  const counts = { friends: friends.length, pending: pending.length, sent: sent.length }

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal nc-friends-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Friends</h2>
        <div className="nc-mode-row">
          {['friends', 'pending', 'sent'].map((t) => (
            <button
              key={t}
              type="button"
              className={tab === t ? 'nc-mode-btn active' : 'nc-mode-btn'}
              onClick={() => setTab(t)}
            >
              {t === 'friends' ? 'Friends' : t === 'pending' ? 'Pending' : 'Sent'} ({counts[t]})
            </button>
          ))}
        </div>

        <div className="nc-friends-list">
          {loading && <p className="nc-sidebar-hint">Loading…</p>}

          {!loading && tab === 'friends' && friends.length === 0 && (
            <p className="nc-sidebar-hint">No friends yet — add someone from their profile.</p>
          )}
          {!loading && tab === 'friends' && friends.map((f) => (
            <div key={f.id} className="nc-friend-row">
              <UserAvatar userId={f.userId} name={f.name} size={28} />
              <span className="nc-friend-name">{f.name}</span>
              <button type="button" className="nc-btn nc-btn-text" onClick={() => onStartDM(f.userId, f.name)}>Message</button>
              <button type="button" className="nc-btn nc-btn-text nc-danger" onClick={() => handleRemove(f.id)}>Remove</button>
            </div>
          ))}

          {!loading && tab === 'pending' && pending.length === 0 && (
            <p className="nc-sidebar-hint">No pending requests.</p>
          )}
          {!loading && tab === 'pending' && pending.map((r) => (
            <div key={r.id} className="nc-friend-row">
              <UserAvatar userId={r.fromUserId} name={r.fromUserName} size={28} />
              <span className="nc-friend-name">{r.fromUserName}</span>
              <button type="button" className="nc-btn nc-btn-primary" onClick={() => handleAccept(r.id)}>Accept</button>
              <button type="button" className="nc-btn nc-btn-text nc-danger" onClick={() => handleRemove(r.id)}>Decline</button>
            </div>
          ))}

          {!loading && tab === 'sent' && sent.length === 0 && (
            <p className="nc-sidebar-hint">No outgoing requests.</p>
          )}
          {!loading && tab === 'sent' && sent.map((r) => (
            <div key={r.id} className="nc-friend-row">
              <UserAvatar userId={r.toUserId} name={r.toUserName} size={28} />
              <span className="nc-friend-name">{r.toUserName}</span>
              <button type="button" className="nc-btn nc-btn-text nc-danger" onClick={() => handleRemove(r.id)}>Cancel</button>
            </div>
          ))}
        </div>

        <div className="nc-modal-actions">
          <button type="button" className="nc-btn nc-btn-text" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
