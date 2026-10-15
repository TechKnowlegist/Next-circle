import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { listMessages, postMessage, subscribeToMessages } from '../chatApi.js'

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

// The message list + composer for whichever conversation is selected
// (a channel or a DM thread — the caller just passes a conversationId,
// this component doesn't care which kind it is). Loads history once per
// conversationId, then stays live via a single site-wide subscription
// filtered client-side to this conversation — see the comment on
// subscribeToMessages in chatApi.js for why it's site-wide rather than
// per-conversation.
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
      if (seenIds.current.has(message.id)) return // our own optimistic add already has it
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
          <div key={m.id} className={m.authorId === user.id ? 'nc-message nc-message-own' : 'nc-message'}>
            <div className="nc-message-meta">
              <span className="nc-message-author">{m.authorName}</span>
              <span className="nc-message-time">{formatTime(m.createdAt)}</span>
            </div>
            <div className="nc-message-content">{m.content}</div>
          </div>
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
