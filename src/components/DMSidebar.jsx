export default function DMSidebar({ threads, selectedThreadId, onSelectThread, myUserId }) {
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
          const otherName = t.participantNames[otherIndex] || 'Unknown'
          return (
            <button
              key={t.id}
              type="button"
              className={selectedThreadId === t.id ? 'nc-channel active' : 'nc-channel'}
              onClick={() => onSelectThread(t.id, otherName)}
            >
              @ {otherName}
            </button>
          )
        })}
      </div>
    </div>
  )
}
