import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { deleteMessage, listMessages, postMessage, subscribeToMessages, updateMessage } from '../chatApi.js'
import InitialsAvatar from './InitialsAvatar.jsx'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function Message({ message, isOwn, onSaveEdit, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)

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

  return (
    <div className={isOwn ? 'nc-message nc-message-own' : 'nc-message'}>
      {!isOwn && <InitialsAvatar name={message.authorName} size={30} />}
      <div className="nc-message-body">
        <div className="nc-message-meta">
          <span className="nc-message-author">{message.authorName}</span>
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
      {isOwn && <InitialsAvatar name={message.authorName} size={30} />}
    </div>
  )
}

// The message list + composer for whichever conversation is selected
// (a channel or a DM thread — the caller just passes a conversationId,
// this component doesn't care which kind it is). Loads history once per
// conversationId, then stays live via a single site-wide subscription
// filtered client-side to this conversation — see the comment on
// subscribeToMessages in chatApi.js for why it's site-wide rather than
// per-conversation. Edits sync live the same way; deletes only remove
// from the deleter's own view (see deleteMessage's comment in chatApi.js).
export default function MessageView({ conversationId, title }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const seenIds = useRef(new Set())

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
            onSaveEdit={handleSaveEdit}
            onDelete={handleDelete}
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
    </div>
  )
}
