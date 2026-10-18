import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { deleteMessage, listMessages, postMessage, subscribeToMessages, updateMessage } from '../chatApi.js'
import UserAvatar from './UserAvatar.jsx'
import ProfileCard from './ProfileCard.jsx'
import SettingsScreen from './SettingsScreen.jsx'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// Channels show every message the same way, left-aligned, like a normal
// chat log (Discord/Slack-style) — only DMs get the iMessage-style
// left/right bubble split, since that's what actually helps there with
// just two people. Without this, a channel where you're the only one
// who's posted so far has every message pinned to the right edge, which
// reads as broken rather than as a two-person conversation.
function Message({ message, isOwn, bubbleStyle, onSaveEdit, onDelete, onOpenProfile }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const rightAlign = isOwn && bubbleStyle

  function startEdit() {
    setDraft(message.content)
    setEditing(true)
  }

  function save() {
    const content = draft.trim()
    setEditing(false)
    if (!content || content === message.content) return
    onSaveEdit(message.id, content)
  }

  function openProfile() {
    onOpenProfile(message.authorId, message.authorName)
  }

  return (
    <div className={rightAlign ? 'nc-message nc-message-own' : 'nc-message'}>
      {!rightAlign && (
        <button type="button" className="nc-avatar-btn" onClick={openProfile}>
          <UserAvatar userId={message.authorId} name={message.authorName} size={30} />
        </button>
      )}
      <div className="nc-message-body">
        <div className="nc-message-meta">
          <button type="button" className="nc-message-author" onClick={openProfile}>
            {message.authorName}
          </button>
          <span className="nc-message-time">{formatTime(message.createdAt)}</span>
          {message.edited && <span className="nc-message-edited">(edited)</span>}
        </div>
        {editing ? (
          <input
            className="nc-message-edit-input"
            value={draft}
            autoFocus
            maxLength={2000}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditing(false)
            }}
          />
        ) : (
          <div className="nc-message-content">{message.content}</div>
        )}
        {isOwn && !editing && (
          <div className="nc-message-actions">
            <button type="button" onClick={startEdit}>Edit</button>
            <button type="button" onClick={() => onDelete(message.id)}>Delete</button>
          </div>
        )}
      </div>
      {rightAlign && (
        <button type="button" className="nc-avatar-btn" onClick={openProfile}>
          <UserAvatar userId={message.authorId} name={message.authorName} size={30} />
        </button>
      )}
    </div>
  )
}

// The message list + composer for whichever conversation is selected
// (a channel or a DM thread). Loads history once per conversationId, then
// stays live via a single site-wide subscription filtered client-side to
// this conversation — see the comment on subscribeToMessages in
// chatApi.js for why it's site-wide rather than per-conversation. Edits
// sync live the same way; deletes only remove from the deleter's own view
// (see deleteMessage's comment in chatApi.js).
//
// isDM switches on the bubble (left/right) layout — see the comment on
// Message above for why that's DM-only.
export default function MessageView({ conversationId, title, isDM = false }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [profileTarget, setProfileTarget] = useState(null) // { userId, name }
  const [settingsSection, setSettingsSection] = useState(null)
  const bottomRef = useRef(null)
  const seenIds = useRef(new Set())

  function openProfile(userId, name) {
    setProfileTarget({ userId, name })
  }

  useEffect(() => {
    let cancelled = false
    seenIds.current = new Set()
    setLoading(true)
    listMessages(conversationId)
      .then((items) => {
        if (cancelled) return
        items.forEach((m) => seenIds.current.add(m.id))
        setMessages(items)
      })
      .catch((err) => console.log('Next Circle — failed to load messages:', err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [conversationId])

  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      if (message.conversationId !== conversationId) return
      if (seenIds.current.has(message.id)) return // our own optimistic add/edit already has it
      seenIds.current.add(message.id)
      setMessages((prev) => [...prev, message])
    })
    return unsubscribe
  }, [conversationId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || sending) return
    setSending(true)
    setDraft('')
    try {
      const sent = await postMessage(conversationId, user.id, user.name, content)
      if (sent) {
        seenIds.current.add(sent.id)
        setMessages((prev) => [...prev, sent])
      }
    } catch (err) {
      console.log('Next Circle — failed to send message:', err)
      setDraft(content) // give it back so it isn't just lost
    } finally {
      setSending(false)
    }
  }

  async function handleSaveEdit(id, content) {
    const updated = await updateMessage(id, content)
    if (updated) setMessages((prev) => prev.map((m) => (m.id === id ? updated : m)))
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this message?')) return
    await deleteMessage(id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div className="nc-message-view">
      <div className="nc-message-header">
        <h2>{title}</h2>
      </div>

      <div className="nc-message-list">
        {loading && <p className="nc-message-hint">Loading messages…</p>}
        {!loading && messages.length === 0 && (
          <p className="nc-message-hint">No messages yet — say something.</p>
        )}
        {messages.map((m) => (
          <Message
            key={m.id}
            message={m}
            isOwn={m.authorId === user.id}
            bubbleStyle={isDM}
            onSaveEdit={handleSaveEdit}
            onDelete={handleDelete}
            onOpenProfile={openProfile}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      <form className="nc-composer" onSubmit={handleSend}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={`Message ${title}`}
          maxLength={2000}
        />
        <button type="submit" className="nc-btn nc-btn-primary" disabled={!draft.trim() || sending}>
          Send
        </button>
      </form>

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
