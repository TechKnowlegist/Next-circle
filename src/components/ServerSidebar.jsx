import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import {
  createChannel,
  deleteServerCascade,
  isOnline,
  listChannels,
  listServerMembers,
  removeMembership,
  renameServer,
  setMemberRole,
} from '../chatApi.js'
import UserAvatar from './UserAvatar.jsx'
import ProfileCard from './ProfileCard.jsx'
import SettingsScreen from './SettingsScreen.jsx'

const MEMBER_REFRESH_MS = 20_000

// Channel list + member list for whichever server is selected. Creating a
// channel is exposed to every member in v1 (not just the server owner) —
// see the authorization note on ChatChannel in amplify/data/resource.ts;
// the API itself doesn't enforce owner-only yet. Rename/delete and
// promoting/demoting admins are owner-only in the UI; kicking is owner-
// OR-admin in the UI. None of this is enforced server-side (same note on
// ChatServerMember) — the API itself would currently let any member do
// any of it.
export default function ServerSidebar({ server, selectedChannelId, onSelectChannel, onDMMember, onServerRenamed, onServerDeleted, unreadCounts }) {
  const { user } = useAuth()
  const isOwner = server.ownerId === user.id

  const [channels, setChannels] = useState([])
  const [members, setMembers] = useState([])
  const [newChannelName, setNewChannelName] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(server.name)
  const [busy, setBusy] = useState(false)
  const [profileTarget, setProfileTarget] = useState(null) // { userId, name }
  const [settingsSection, setSettingsSection] = useState(null)

  useEffect(() => {
    setNameDraft(server.name)
  }, [server.name])

  useEffect(() => {
    let cancelled = false
    listChannels(server.id)
      .then((items) => {
        if (cancelled) return
        setChannels(items)
        if (items.length && !selectedChannelId) onSelectChannel(items[0].id, items[0].name)
      })
      .catch((err) => console.log('Next Circle — failed to load channels:', err))
    function refreshMembers() {
      listServerMembers(server.id)
        .then((items) => !cancelled && setMembers(items))
        .catch((err) => console.log('Next Circle — failed to load members:', err))
    }
    refreshMembers()
    const interval = setInterval(refreshMembers, MEMBER_REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server.id])

  async function handleCreateChannel(e) {
    e.preventDefault()
    const name = newChannelName.trim()
    if (!name) return
    setNewChannelName('')
    const channel = await createChannel(server.id, name, channels.length)
    if (channel) {
      setChannels((prev) => [...prev, channel])
      onSelectChannel(channel.id, channel.name)
    }
  }

  function copyInvite() {
    navigator.clipboard?.writeText(server.inviteCode).catch(() => {})
    setInviteCopied(true)
    setTimeout(() => setInviteCopied(false), 1500)
  }

  async function saveRename() {
    const name = nameDraft.trim()
    setRenaming(false)
    if (!name || name === server.name) {
      setNameDraft(server.name)
      return
    }
    const updated = await renameServer(server.id, name)
    if (updated) onServerRenamed(updated)
  }

  async function handleDeleteServer() {
    if (!window.confirm(`Delete "${server.name}" for everyone? This can't be undone.`)) return
    setBusy(true)
    try {
      await deleteServerCascade(server.id)
      onServerDeleted(server.id)
    } finally {
      setBusy(false)
    }
  }

  async function handleLeaveServer() {
    const mine = members.find((m) => m.userId === user.id)
    if (!mine) return
    if (!window.confirm(`Leave "${server.name}"?`)) return
    setBusy(true)
    try {
      await removeMembership(mine.id)
      onServerDeleted(server.id) // same effect from this user's point of view
    } finally {
      setBusy(false)
    }
  }

  async function handleKick(member) {
    if (!window.confirm(`Remove ${member.userName} from "${server.name}"?`)) return
    await removeMembership(member.id)
    setMembers((prev) => prev.filter((m) => m.id !== member.id))
  }

  async function handleSetRole(member, role) {
    const updated = await setMemberRole(member.id, role)
    if (updated) setMembers((prev) => prev.map((m) => (m.id === member.id ? { ...m, role: updated.role } : m)))
  }

  const myMembership = members.find((m) => m.userId === user.id)
  // Admins get the same kick button as the owner (see the schema note on
  // ChatServerMember.role — nothing server-side actually checks this,
  // it's UI-only, same posture as the rest of this model); promoting/
  // demoting someone, and the owner's own badge, stay owner-only.
  const canModerate = isOwner || myMembership?.role === 'admin'

  return (
    <div className="nc-sidebar">
      <div className="nc-sidebar-header">
        {renaming ? (
          <input
            className="nc-rename-input"
            value={nameDraft}
            autoFocus
            maxLength={60}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={saveRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') {
                setNameDraft(server.name)
                setRenaming(false)
              }
            }}
          />
        ) : (
          <h2 onClick={() => isOwner && setRenaming(true)} className={isOwner ? 'nc-renamable' : ''} title={isOwner ? 'Click to rename' : undefined}>
            {server.name}
          </h2>
        )}
        <button type="button" className="nc-invite-btn" onClick={copyInvite}>
          {inviteCopied ? 'Copied!' : `Invite: ${server.inviteCode}`}
        </button>
        {isOwner ? (
          <button type="button" className="nc-btn nc-btn-text nc-danger" onClick={handleDeleteServer} disabled={busy}>
            Delete Server
          </button>
        ) : (
          <button type="button" className="nc-btn nc-btn-text nc-danger" onClick={handleLeaveServer} disabled={busy}>
            Leave Server
          </button>
        )}
      </div>

      <p className="nc-sidebar-label">Channels</p>
      <div className="nc-channel-list">
        {channels.map((c) => (
          <button
            key={c.id}
            type="button"
            className={selectedChannelId === c.id ? 'nc-channel active' : 'nc-channel'}
            onClick={() => onSelectChannel(c.id, c.name)}
          >
            # {c.name}
            {unreadCounts?.[c.id] > 0 && <span className="nc-unread-badge">{unreadCounts[c.id]}</span>}
          </button>
        ))}
      </div>
      <form className="nc-new-channel" onSubmit={handleCreateChannel}>
        <input
          type="text"
          placeholder="+ new channel"
          value={newChannelName}
          onChange={(e) => setNewChannelName(e.target.value)}
          maxLength={40}
        />
      </form>

      <p className="nc-sidebar-label">Members — {members.length}</p>
      <div className="nc-member-list">
        {members.map((m) => (
          <div key={m.id} className="nc-member-row">
            <button
              type="button"
              className="nc-avatar-btn"
              onClick={() => setProfileTarget({ userId: m.userId, name: m.userName })}
              title={`View ${m.userName}'s profile`}
            >
              <UserAvatar userId={m.userId} name={m.userName} size={22} />
            </button>
            <button
              type="button"
              className="nc-member"
              disabled={m.userId === user.id}
              onClick={() => onDMMember(m.userId, m.userName)}
              title={m.userId === user.id ? 'This is you' : `Message ${m.userName}`}
            >
              <span className={isOnline(m) ? 'nc-member-dot online' : 'nc-member-dot'} />
              {m.userName}
              {m.role === 'owner' && <span className="nc-role-badge nc-role-owner">Owner</span>}
              {m.role === 'admin' && <span className="nc-role-badge nc-role-admin">Admin</span>}
            </button>
            {isOwner && m.userId !== user.id && m.role !== 'owner' && (
              <button
                type="button"
                className="nc-kick-btn"
                onClick={() => handleSetRole(m, m.role === 'admin' ? 'member' : 'admin')}
                title={m.role === 'admin' ? `Demote ${m.userName}` : `Make ${m.userName} an admin`}
              >
                {m.role === 'admin' ? '▼' : '▲'}
              </button>
            )}
            {canModerate && m.userId !== user.id && m.role !== 'owner' && (
              <button type="button" className="nc-kick-btn" onClick={() => handleKick(m)} title={`Remove ${m.userName}`}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {profileTarget && !settingsSection && (
        <ProfileCard
          userId={profileTarget.userId}
          displayName={profileTarget.name}
          isSelf={profileTarget.userId === user.id}
          onClose={() => setProfileTarget(null)}
          onEdit={() => setSettingsSection('profile')}
        />
      )}
      {settingsSection && (
        <SettingsScreen
          initialSection={settingsSection}
          onClose={() => {
            setSettingsSection(null)
            setProfileTarget(null)
          }}
        />
      )}
    </div>
  )
}
