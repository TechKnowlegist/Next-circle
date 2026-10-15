import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { createChannel, listChannels, listServerMembers } from '../chatApi.js'

// Channel list + member list for whichever server is selected. Creating a
// channel is exposed to every member in v1 (not just the server owner) —
// see the authorization note on ChatChannel in amplify/data/resource.ts;
// the API itself doesn't enforce owner-only yet.
export default function ServerSidebar({ server, selectedChannelId, onSelectChannel, onDMMember }) {
  const { user } = useAuth()
  const [channels, setChannels] = useState([])
  const [members, setMembers] = useState([])
  const [newChannelName, setNewChannelName] = useState('')
  const [inviteCopied, setInviteCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    listChannels(server.id).then((items) => {
      if (cancelled) return
      setChannels(items)
      if (items.length && !selectedChannelId) onSelectChannel(items[0].id, items[0].name)
    })
    listServerMembers(server.id).then((items) => !cancelled && setMembers(items))
    return () => {
      cancelled = true
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

  return (
    <div className="nc-sidebar">
      <div className="nc-sidebar-header">
        <h2>{server.name}</h2>
        <button type="button" className="nc-invite-btn" onClick={copyInvite}>
          {inviteCopied ? 'Copied!' : `Invite: ${server.inviteCode}`}
        </button>
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
          <button
            key={m.id}
            type="button"
            className="nc-member"
            disabled={m.userId === user.id}
            onClick={() => onDMMember(m.userId, m.userName)}
            title={m.userId === user.id ? 'This is you' : `Message ${m.userName}`}
          >
            <span className="nc-member-dot" />
            {m.userName}
          </button>
        ))}
      </div>
    </div>
  )
}
