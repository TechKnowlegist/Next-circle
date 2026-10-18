// Turns a plain-text message into React nodes with light Discord/Slack-style
// formatting: **bold**, *italic*, `inline code`, bare URLs auto-linked, and
// @word highlighted as a mention. Mentions are NOT validated against the
// conversation's actual members (MessageView doesn't have that list for
// every conversation type) — any @word gets the mention treatment, same
// honest simplification as the rest of this feature set.
const TOKEN_RE = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s]+|@\w+)/g

export function renderMessageContent(content) {
  if (!content) return null
  const parts = content.split(TOKEN_RE)
  return parts.map((part, i) => {
    if (!part) return null
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return <code key={i} className="nc-inline-code">{part.slice(1, -1)}</code>
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    if (part.startsWith('http://') || part.startsWith('https://')) {
      return (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="nc-message-link">
          {part}
        </a>
      )
    }
    if (part.startsWith('@') && part.length > 1) {
      return <span key={i} className="nc-mention">{part}</span>
    }
    return part
  })
}
