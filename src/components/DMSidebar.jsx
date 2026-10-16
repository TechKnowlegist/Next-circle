import { useState } from 'react'
import InitialsAvatar from './InitialsAvatar.jsx'
import ProfileCard from './ProfileCard.jsx'
import ProfileEditModal from './ProfileEditModal.jsx'

export default function DMSidebar({ threads, selectedThreadId, onSelectThread, myUserId }) {
  const [profileTarget, setProfileTarget] = useState(null) // { userId, name }
  const [editingProfile, setEditingProfile] = useState(false)

  return (
    <div className="nc-sidebar">
      <div className="nc-sidebar-header">
        <h2>Direct Messages</h2>
      </div>
      {threads.length === 0 && (
        <p className="nc-sidebar-hint">
          No DMs yet — open a server and click a member to start one.
        </p>
      )}
      <div className="nc-channel-list">
        {threads.map((t) => {
          const otherIndex = t.participantIds.findIndex((id) => id !== myUserId)
          const otherId = t.participantIds[otherIndex]
          const otherName = t.participantNames[otherIndex] || 'Unknown'
          return (
            <div key={t.id} className="nc-member-row">
              <button
                type="button"
                className="nc-avatar-btn"
                onClick={() => setProfileTarget({ userId: otherId, name: otherName })}
                title={`View ${otherName}'s profile`}
              >
                <InitialsAvatar name={otherName} size={20} />
              </button>
              <button
                type="button"
                className={selectedThreadId === t.id ? 'nc-channel active' : 'nc-channel'}
                onClick={() => onSelectThread(t.id, otherName)}
              >
                {otherName}
              </button>
            </div>
          )
        })}
      </div>

      {profileTarget && !editingProfile && (
        <ProfileCard
          userId={profileTarget.userId}
          displayName={profileTarget.name}
          isSelf={profileTarget.userId === myUserId}
          onClose={() => setProfileTarget(null)}
          onEdit={() => setEditingProfile(true)}
        />
      )}
      {editingProfile && (
        <ProfileEditModal
          onClose={() => setEditingProfile(false)}
          onSaved={() => setProfileTarget(null)}
        />
      )}
    </div>
  )
}
