export default function ServerRail({ servers, view, selectedServerId, onSelectDMs, onSelectServer, onCreate, onJoin, onFriends }) {
  return (
    <nav className="nc-rail">
      <button
        type="button"
        className={view === 'dms' ? 'nc-rail-icon active' : 'nc-rail-icon'}
        onClick={onSelectDMs}
        title="Direct Messages"
      >
        💬
      </button>
      <button type="button" className="nc-rail-icon" onClick={onFriends} title="Friends">
        👥
      </button>
      <div className="nc-rail-divider" />
      {servers.map((s) => (
        <button
          key={s.id}
          type="button"
          className={view === 'server' && selectedServerId === s.id ? 'nc-rail-icon active' : 'nc-rail-icon'}
          onClick={() => onSelectServer(s.id)}
          title={s.name}
        >
          {s.iconEmoji || s.name.slice(0, 1).toUpperCase()}
        </button>
      ))}
      <div className="nc-rail-divider" />
      <button type="button" className="nc-rail-icon nc-rail-add" onClick={onCreate} title="Create a Server">+</button>
      <button type="button" className="nc-rail-icon nc-rail-add" onClick={onJoin} title="Join a Server">⤵</button>
    </nav>
  )
}
