import { useEffect, useMemo, useRef, useState } from 'react'
import { useEscapeToClose } from '../useEscapeToClose.js'

// Ctrl+K (⌘K on Mac) jumps here from anywhere in the app — see the
// keydown listener in ChatHome.jsx. Searches servers and DM threads by
// name in one flat list, arrow keys + Enter to jump, same idea as
// Discord/Slack/VS Code's own quick-open.
export default function QuickSwitcher({ servers, dmThreads, myUserId, onSelectServer, onSelectThread, onClose }) {
  useEscapeToClose(onClose)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const items = useMemo(() => {
    const serverItems = servers.map((s) => ({
      kind: 'server',
      id: s.id,
      label: s.name,
      icon: s.iconEmoji || s.name.slice(0, 1).toUpperCase(),
    }))
    const dmItems = dmThreads.map((t) => {
      const otherIndex = t.participantIds.findIndex((id) => id !== myUserId)
      const name = t.participantNames[otherIndex] || 'Unknown'
      return { kind: 'dm', id: t.id, label: name, icon: '@' }
    })
    const all = [...serverItems, ...dmItems]
    const q = query.trim().toLowerCase()
    if (!q) return all
    return all.filter((i) => i.label.toLowerCase().includes(q))
  }, [servers, dmThreads, myUserId, query])

  function select(item) {
    if (!item) return
    if (item.kind === 'server') onSelectServer(item.id)
    else onSelectThread(item.id, item.label)
    onClose()
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted((h) => Math.min(h + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      select(items[highlighted])
    }
  }

  return (
    <div className="nc-modal-overlay" onClick={onClose}>
      <div className="nc-modal nc-quick-switcher" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          className="nc-quick-switcher-input"
          placeholder="Jump to a server or DM…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setHighlighted(0)
          }}
          onKeyDown={handleKeyDown}
        />
        <div className="nc-quick-switcher-list">
          {items.length === 0 && <p className="nc-sidebar-hint">No matches.</p>}
          {items.map((item, i) => (
            <button
              key={`${item.kind}-${item.id}`}
              type="button"
              className={i === highlighted ? 'nc-quick-switcher-item active' : 'nc-quick-switcher-item'}
              onMouseEnter={() => setHighlighted(i)}
              onClick={() => select(item)}
            >
              <span className="nc-quick-switcher-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
