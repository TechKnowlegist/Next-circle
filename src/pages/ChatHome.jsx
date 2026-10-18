import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { createServer, getOrCreateDMThread, joinServerByInviteCode, listBlocked, listMyDMThreads, listMyServers, listServerMembers, subscribeToMessages } from '../chatApi.js'
import { useHeartbeat } from '../useHeartbeat.js'
import { useMessageSound } from '../useMessageSound.js'
import ServerRail from '../components/ServerRail.jsx'
import ServerSidebar from '../components/ServerSidebar.jsx'
import DMSidebar from '../components/DMSidebar.jsx'
import MessageView from '../components/MessageView.jsx'
import CreateServerModal from '../components/CreateServerModal.jsx'
import JoinServerModal from '../components/JoinServerModal.jsx'
import FriendsPanel from '../components/FriendsPanel.jsx'
import QuickSwitcher from '../components/QuickSwitcher.jsx'
import CallOverlay from '../components/CallOverlay.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import ProfileCard from '../components/ProfileCard.jsx'
import SettingsScreen from '../components/SettingsScreen.jsx'

export default function ChatHome() {
  const { user, logout } = useAuth()
  const [servers, setServers] = useState([])
  const [dmThreads, setDMThreads] = useState([])
  const [loadingLists, setLoadingLists] = useState(true)

  const [view, setView] = useState('dms') // 'dms' | 'server'
  const [selectedServerId, setSelectedServerId] = useState(null)
  const [selectedChannel, setSelectedChannel] = useState(null) // { id, name }
  const [selectedThread, setSelectedThread] = useState(null) // { id, name }

  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  // 'idle' | 'incoming' | 'active' — see CallOverlay.jsx for what each
  // phase renders. This is a UI-only mock (no real mic/camera/connection),
  // triggered here by the "Test Call" button for trying out the call
  // experience before any real calling backend exists.
  const [callStatus, setCallStatus] = useState('idle')

  const [showOwnProfile, setShowOwnProfile] = useState(false)
  const [settingsSection, setSettingsSection] = useState(null) // null | 'account' | 'profile' | 'appearance'
  const [showFriends, setShowFriends] = useState(false)
  const [showQuickSwitcher, setShowQuickSwitcher] = useState(false)
  const [blockedIds, setBlockedIds] = useState(new Set())
  const [myServerRole, setMyServerRole] = useState(null)
  const [unreadCounts, setUnreadCounts] = useState({}) // conversationId -> count

  const activeConversationIdRef = useRef(null)

  useHeartbeat(user.id)
  useMessageSound(user.id)

  useEffect(() => {
    refreshLists()
    refreshBlocked()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    activeConversationIdRef.current = view === 'server' ? selectedChannel?.id : selectedThread?.id
  }, [view, selectedChannel, selectedThread])

  // Site-wide unread tracking — a second subscription alongside the one
  // each open MessageView already holds for live messages (see its
  // comment on subscribeToMessages in chatApi.js; multiple independent
  // subscriptions to the same feed is the established pattern here, not
  // new). Only counts messages that land while their conversation isn't
  // the one currently open, and only resets to 0 when that conversation
  // IS opened (see onSelectChannel/onSelectThread below) — this is "new
  // since the app opened," not a true unread count synced from the
  // server, since nothing here persists a last-read timestamp.
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message) => {
      if (message.authorId === user.id) return
      if (message.conversationId === activeConversationIdRef.current) return
      setUnreadCounts((prev) => ({ ...prev, [message.conversationId]: (prev[message.conversationId] || 0) + 1 }))
    })
    return unsubscribe
  }, [user.id])

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setShowQuickSwitcher(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Blocking happens from ProfileCard, which can be opened from several
  // places nested well below this component — rather than threading a
  // refresh callback through all of them, this just polls, same "close
  // enough to live" tradeoff as the reaction/typing polls in
  // MessageView.jsx.
  useEffect(() => {
    const id = setInterval(refreshBlocked, 5_000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // This user's own role in the currently-selected server — drives
  // whether MessageView shows the admin "delete any message" button.
  // ServerSidebar fetches the full member list separately for its own
  // display (badges, kick); this is a smaller, dedicated lookup rather
  // than lifting that whole list up here just to read one row out of it.
  useEffect(() => {
    if (!selectedServerId) {
      setMyServerRole(null)
      return
    }
    let cancelled = false
    listServerMembers(selectedServerId)
      .then((members) => {
        if (cancelled) return
        setMyServerRole(members.find((m) => m.userId === user.id)?.role || 'member')
      })
      .catch((err) => console.log('Next Circle — failed to load my server role:', err))
    return () => {
      cancelled = true
    }
  }, [selectedServerId, user.id])

  async function refreshLists() {
    setLoadingLists(true)
    try {
      const [myServers, myThreads] = await Promise.all([
        listMyServers(user.id),
        listMyDMThreads(user.id),
      ])
      setServers(myServers)
      setDMThreads(myThreads)
    } catch (err) {
      console.log('Next Circle — failed to load servers/DMs:', err)
    } finally {
      setLoadingLists(false)
    }
  }

  // DM threads with someone this user has blocked are hidden from the
  // sidebar entirely — see the one-sided block note on ChatBlock in the
  // schema; the thread still exists, it just isn't listed for the
  // blocker. Messages from a blocked member inside a shared server are
  // handled separately, inline in MessageView.
  async function refreshBlocked() {
    try {
      const blocked = await listBlocked(user.id)
      setBlockedIds(new Set(blocked.map((b) => b.blockedId)))
    } catch (err) {
      console.log('Next Circle — failed to load blocked users:', err)
    }
  }

  function selectServer(serverId) {
    setView('server')
    setSelectedServerId(serverId)
    setSelectedChannel(null)
  }

  function selectDMs() {
    setView('dms')
    setSelectedThread(null)
  }

  function clearUnread(conversationId) {
    setUnreadCounts((prev) => {
      if (!prev[conversationId]) return prev
      const next = { ...prev }
      delete next[conversationId]
      return next
    })
  }

  function selectChannel(id, name) {
    setSelectedChannel({ id, name })
    clearUnread(id)
  }

  function selectThread(id, name) {
    setSelectedThread({ id, name })
    clearUnread(id)
  }

  function jumpToThread(id, name) {
    setView('dms')
    selectThread(id, name)
  }

  async function handleCreateServer(name, icon) {
    const server = await createServer(name, user.id, user.name, icon)
    setServers((prev) => [server, ...prev])
    selectServer(server.id)
  }

  async function handleJoinServer(code) {
    const server = await joinServerByInviteCode(code, user.id, user.name)
    setServers((prev) => (prev.some((s) => s.id === server.id) ? prev : [server, ...prev]))
    selectServer(server.id)
  }

  async function handleDMMember(otherId, otherName) {
    const thread = await getOrCreateDMThread(user.id, user.name, otherId, otherName)
    setDMThreads((prev) => (prev.some((t) => t.id === thread.id) ? prev : [thread, ...prev]))
    setView('dms')
    setSelectedThread({ id: thread.id, name: otherName })
  }

  function handleServerRenamed(updated) {
    setServers((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  function handleServerDeleted(serverId) {
    setServers((prev) => prev.filter((s) => s.id !== serverId))
    if (selectedServerId === serverId) {
      setSelectedServerId(null)
      setSelectedChannel(null)
      setView('dms')
    }
  }

  const selectedServer = servers.find((s) => s.id === selectedServerId) || null
  const visibleDMThreads = dmThreads.filter((t) => {
    const otherId = t.participantIds.find((id) => id !== user.id)
    return !blockedIds.has(otherId)
  })

  return (
    <div className="nc-app">
      <ServerRail
        servers={servers}
        view={view}
        selectedServerId={selectedServerId}
        onSelectDMs={selectDMs}
        onSelectServer={selectServer}
        onCreate={() => setShowCreate(true)}
        onJoin={() => setShowJoin(true)}
        onFriends={() => setShowFriends(true)}
      />

      {view === 'server' && selectedServer && (
        <ServerSidebar
          server={selectedServer}
          selectedChannelId={selectedChannel?.id}
          onSelectChannel={selectChannel}
          onDMMember={handleDMMember}
          onServerRenamed={handleServerRenamed}
          onServerDeleted={handleServerDeleted}
          unreadCounts={unreadCounts}
        />
      )}

      {view === 'dms' && (
        <DMSidebar
          threads={visibleDMThreads}
          selectedThreadId={selectedThread?.id}
          onSelectThread={selectThread}
          myUserId={user.id}
          unreadCounts={unreadCounts}
        />
      )}

      <div className="nc-main">
        <div className="nc-topbar">
          <span className="nc-whoami">Signed in as {user.name}</span>
          <div className="nc-topbar-actions">
            <button type="button" className="nc-profile-btn" onClick={() => setShowOwnProfile(true)} title="Your profile">
              <UserAvatar userId={user.id} name={user.name} size={26} />
            </button>
            <button type="button" className="nc-gear-btn" onClick={() => setShowQuickSwitcher(true)} title="Jump to… (Ctrl+K)">
              🔍
            </button>
            <button type="button" className="nc-gear-btn" onClick={() => setSettingsSection('account')} title="Settings">
              ⚙️
            </button>
            <button
              type="button"
              className="nc-btn nc-btn-text"
              onClick={() => setCallStatus('incoming')}
              disabled={callStatus !== 'idle'}
            >
              Test Call
            </button>
            <button type="button" className="nc-btn nc-btn-text" onClick={logout}>Sign Out</button>
          </div>
        </div>

        {view === 'server' && !selectedServer && !loadingLists && (
          <div className="nc-empty-state">
            <p>Pick a server from the left, or create/join one.</p>
          </div>
        )}
        {view === 'server' && selectedServer && selectedChannel && (
          <MessageView
            conversationId={selectedChannel.id}
            title={`# ${selectedChannel.name}`}
            blockedIds={blockedIds}
            canModerate={myServerRole === 'owner' || myServerRole === 'admin'}
          />
        )}
        {view === 'server' && selectedServer && !selectedChannel && (
          <div className="nc-empty-state">
            <p>This server has no channels yet — create one on the left.</p>
          </div>
        )}
        {view === 'dms' && selectedThread && (
          <MessageView conversationId={selectedThread.id} title={`@ ${selectedThread.name}`} isDM />
        )}
        {view === 'dms' && !selectedThread && (
          <div className="nc-empty-state">
            <p>Pick a conversation, or DM someone from inside a server.</p>
          </div>
        )}
      </div>

      {showCreate && <CreateServerModal onCreate={handleCreateServer} onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinServerModal onJoin={handleJoinServer} onClose={() => setShowJoin(false)} />}
      {showFriends && (
        <FriendsPanel
          onClose={() => setShowFriends(false)}
          onStartDM={(id, name) => {
            setShowFriends(false)
            handleDMMember(id, name)
          }}
        />
      )}
      {showQuickSwitcher && (
        <QuickSwitcher
          servers={servers}
          dmThreads={visibleDMThreads}
          myUserId={user.id}
          onSelectServer={selectServer}
          onSelectThread={jumpToThread}
          onClose={() => setShowQuickSwitcher(false)}
        />
      )}

      <CallOverlay
        status={callStatus}
        onAccept={() => setCallStatus('active')}
        onDecline={() => setCallStatus('idle')}
        onEnd={() => setCallStatus('idle')}
      />

      {showOwnProfile && !settingsSection && (
        <ProfileCard
          userId={user.id}
          displayName={user.name}
          isSelf
          onClose={() => setShowOwnProfile(false)}
          onEdit={() => setSettingsSection('profile')}
        />
      )}
      {settingsSection && (
        <SettingsScreen
          initialSection={settingsSection}
          onClose={() => {
            setSettingsSection(null)
            setShowOwnProfile(false)
          }}
        />
      )}
    </div>
  )
}
