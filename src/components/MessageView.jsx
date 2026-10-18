import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import {
  deleteMessage, listMessages, postMessage, subscribeToMessages, updateMessage,
  listReactions, addReaction, removeReaction, groupReactions,
  setMessagePinned,
} from '../chatApi.js'
import { uploadChatAttachment } from '../attachmentApi.js'
import { urlForKey } from '../profileApi.js'
import { renderMessageContent } from '../messageFormat.jsx'
import { useTypingSignal } from '../useTypingSignal.js'
import UserAvatar from './UserAvatar.jsx'
import ProfileCard from './ProfileCard.jsx'
import SettingsScreen from './SettingsScreen.jsx'

const QUICK_EMOJIS = ['👍', '❤️', '😂', '🎉', '😮', '😢']

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function Attachment({ attachmentKey, attachmentType, attachmentName }) {
  const [url, setUrl] = useState(null)

  useEffect(() => {
    let cancelled = false
    urlForKey(attachmentKey).then((resolved) => !cancelled && setUrl(resolved))
    return () => {
      cancelled = true
    }
  }, [attachmentKey])

  if (!url) return <p className="nc-attachment-loading">Loading attachment…</p>
  if (attachmentType === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="nc-attachment-image-link">
        <img className="nc-attachment-image" src={url} alt={attachmentName || 'attachment'} />
      </a>
    )
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="nc-attachment-file">
      📎 {attachmentName || 'attachment'}
    </a>
  )
}

function ReactionBar({ reactions, onToggle }) {
  const entries = Object.entries(reactions || {}).filter(([, info]) => info.count > 0)
  if (entries.length === 0) return null
  return (
    <div className="nc-message-reactions">
      {entries.map(([emoji, info]) => (
        <button
          key={emoji}
          type="button"
          className={info.reactedByMe ? 'nc-reaction-pill active' : 'nc-reaction-pill'}
          onClick={() => onToggle(emoji)}
        >
          {emoji} {info.count}
        </button>
      ))}
    </div>
  )
}

// Channels show every message the same way, left-aligned, like a normal
// chat log (Discord/Slack-style) — only DMs get the iMessage-style
// left/right bubble split, since that's what actually helps there with
// just two people. Without this, a channel where you're the only one
// who's posted so far has every message pinned to the right edge, which
// reads as broken rather than as a two-person conversation.
function Message({ message, isOwn, bubbleStyle, reactions, blocked, canModerate, onSaveEdit, onDelete, onOpenProfile, onToggleReaction, onTogglePin }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(message.content)
  const [showPicker, setShowPicker] = useState(false)
  const rightAlign = isOwn && bubbleStyle

  if (blocked) {
    return (
      <div className="nc-message">
        <div className="nc-message-body">
          <p className="nc-message-blocked">Message from a blocked user — hidden.</p>
        </div>
      </div>
    )
  }

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

  function pickEmoji(emoji) {
    setShowPicker(false)
    onToggleReaction(message.id, emoji)
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
          {message.pinned && <span className="nc-message-pinned-tag">📌 Pinned</span>}
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
          <>
            {message.content && <div className="nc-message-content">{renderMessageContent(message.content)}</div>}
            {message.attachmentKey && (
              <Attachment
                attachmentKey={message.attachmentKey}
                attachmentType={message.attachmentType}
                attachmentName={message.attachmentName}
              />
            )}
          </>
        )}
        <ReactionBar reactions={reactions} onToggle={(emoji) => onToggleReaction(message.id, emoji)} />
        {!editing && (
          <div className="nc-message-actions">
            <div className="nc-reaction-picker-wrap">
              <button type="button" onClick={() => setShowPicker((v) => !v)}>React</button>
              {showPicker && (
                <div className="nc-reaction-picker">
                  {QUICK_EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => pickEmoji(emoji)}>{emoji}</button>
                  ))}
                </div>
              )}
            </div>
            <button type="button" onClick={() => onTogglePin(message.id, !message.pinned)}>
              {message.pinned ? 'Unpin' : 'Pin'}
            </button>
            {isOwn && <button type="button" onClick={startEdit}>Edit</button>}
            {(isOwn || canModerate) && <button type="button" onClick={() => onDelete(message.id)}>Delete</button>}
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

function typingLabel(users) {
  const names = users.map((u) => u.userName)
  if (names.length === 0) return null
  if (names.length === 1) return `${names[0]} is typing…`
  if (names.length === 2) return `${names[0]} and ${names[1]} are typing…`
  return 'Several people are typing…'
}

// The message list + composer for whichever conversation is selected
// (a channel or a DM thread). Loads history once per conversationId, then
// stays live via a single site-wide subscription filtered client-side to
// this conversation — see the comment on subscribeToMessages in
// chatApi.js for why it's site-wide rather than per-conversation. Edits
// sync live the same way; deletes only remove from the deleter's own view
// (see deleteMessage's comment in chatApi.js). Reactions and the typing
// indicator are polled rather than pushed (see useTypingSignal.js and the
// comment on listReactions in chatApi.js) — close enough to live for a v1.
//
// isDM switches on the bubble (left/right) layout — see the comment on
// Message above for why that's DM-only.
export default function MessageView({ conversationId, title, isDM = false, blockedIds, canModerate = false }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [reactions, setReactions] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [profileTarget, setProfileTarget] = useState(null) // { userId, name }
  const [settingsSection, setSettingsSection] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [attachError, setAttachError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [showPinned, setShowPinned] = useState(false)
  const bottomRef = useRef(null)
  const fileInputRef = useRef(null)
  const seenIds = useRef(new Set())
  const dragCounter = useRef(0)

  const { typingUsers, notifyTyping, stopTyping } = useTypingSignal(conversationId, user.id, user.name)

  function openProfile(userId, name) {
    setProfileTarget({ userId, name })
  }

  useEffect(() => {
    let cancelled = false
    seenIds.current = new Set()
    setLoading(true)
    setShowPinned(false)
    Promise.all([listMessages(conversationId), listReactions(conversationId)])
      .then(([items, reacts]) => {
        if (cancelled) return
        items.forEach((m) => seenIds.current.add(m.id))
        setMessages(items)
        setReactions(reacts)
      })
      .catch((err) => console.log('Next Circle — failed to load messages:', err))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [conversationId])

  // Reactions have no live subscription (see chatApi.js) — a light poll
  // catches other people's reactions without needing one.
  useEffect(() => {
    const id = setInterval(() => {
      listReactions(conversationId).then(setReactions).catch(() => {})
    }, 4_000)
    return () => clearInterval(id)
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

  function handleDraftChange(e) {
    setDraft(e.target.value)
    if (e.target.value.trim()) notifyTyping()
  }

  function pickFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) {
      setAttachError('')
      setPendingFile(file)
    }
  }

  function handleDragEnter(e) {
    e.preventDefault()
    dragCounter.current += 1
    setDragging(true)
  }

  function handleDragLeave(e) {
    e.preventDefault()
    dragCounter.current -= 1
    if (dragCounter.current <= 0) setDragging(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    dragCounter.current = 0
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      setAttachError('')
      setPendingFile(file)
    }
  }

  async function handleSend(e) {
    e.preventDefault()
    const content = draft.trim()
    if ((!content && !pendingFile) || sending) return
    setSending(true)
    setDraft('')
    stopTyping()
    const fileToSend = pendingFile
    setPendingFile(null)
    try {
      let attachment
      if (fileToSend) {
        attachment = await uploadChatAttachment(user.id, fileToSend)
      }
      const sent = await postMessage(conversationId, user.id, user.name, content, attachment)
      if (sent) {
        seenIds.current.add(sent.id)
        setMessages((prev) => [...prev, sent])
      }
    } catch (err) {
      console.log('Next Circle — failed to send message:', err)
      setDraft(content) // give it back so it isn't just lost
      if (fileToSend) {
        setPendingFile(fileToSend)
        setAttachError(err.message || 'Could not send that attachment.')
      }
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

  async function handleToggleReaction(messageId, emoji) {
    const existing = reactionsByMessage[messageId]?.[emoji]
    try {
      if (existing?.reactedByMe) {
        await removeReaction(existing.reactionId)
        setReactions((prev) => prev.filter((r) => r.id !== existing.reactionId))
      } else {
        const created = await addReaction(conversationId, messageId, user.id, user.name, emoji)
        if (created) setReactions((prev) => [...prev, created])
      }
    } catch (err) {
      console.log('Next Circle — reaction failed:', err)
    }
  }

  async function handleTogglePin(messageId, pinned) {
    try {
      const updated = await setMessagePinned(messageId, pinned)
      if (updated) setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, pinned: updated.pinned } : m)))
    } catch (err) {
      console.log('Next Circle — pin toggle failed:', err)
    }
  }

  const reactionsByMessage = groupReactions(reactions, user.id)
  const pinnedMessages = messages.filter((m) => m.pinned)
  const typingText = typingLabel(typingUsers)

  return (
    <div
      className="nc-message-view"
      onDragEnter={handleDragEnter}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="nc-message-header">
        <h2>{title}</h2>
        {pinnedMessages.length > 0 && (
          <button type="button" className="nc-pinned-toggle" onClick={() => setShowPinned((v) => !v)}>
            📌 {pinnedMessages.length} Pinned
          </button>
        )}
      </div>

      {showPinned && (
        <div className="nc-pinned-panel">
          {pinnedMessages.map((m) => (
            <div key={m.id} className="nc-pinned-row">
              <span className="nc-pinned-author">{m.authorName}:</span>
              <span className="nc-pinned-content">{m.content || '(attachment)'}</span>
              <button type="button" onClick={() => handleTogglePin(m.id, false)}>Unpin</button>
            </div>
          ))}
        </div>
      )}

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
            reactions={reactionsByMessage[m.id]}
            blocked={blockedIds?.has(m.authorId)}
            canModerate={canModerate}
            onSaveEdit={handleSaveEdit}
            onDelete={handleDelete}
            onOpenProfile={openProfile}
            onToggleReaction={handleToggleReaction}
            onTogglePin={handleTogglePin}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {dragging && (
        <div className="nc-drop-overlay">
          <p>Drop to attach</p>
        </div>
      )}

      {typingText && <p className="nc-typing-indicator">{typingText}</p>}

      {pendingFile && (
        <div className="nc-pending-attachment">
          <span>📎 {pendingFile.name}</span>
          <button type="button" onClick={() => setPendingFile(null)}>✕</button>
        </div>
      )}
      {attachError && <p className="nc-profile-edit-error">{attachError}</p>}

      <form className="nc-composer" onSubmit={handleSend}>
        <button type="button" className="nc-attach-btn" onClick={() => fileInputRef.current?.click()} title="Attach a file">
          📎
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={pickFile} />
        <input
          type="text"
          value={draft}
          onChange={handleDraftChange}
          onBlur={stopTyping}
          placeholder={`Message ${title}`}
          maxLength={2000}
        />
        <button type="submit" className="nc-btn nc-btn-primary" disabled={(!draft.trim() && !pendingFile) || sending}>
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
