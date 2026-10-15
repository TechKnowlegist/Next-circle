import { useEffect, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import { createServer, getOrCreateDMThread, joinServerByInviteCode, listMyDMThreads, listMyServers } from '../chatApi.js'
import { useHeartbeat } from '../useHeartbeat.js'
import ServerRail from '../components/ServerRail.jsx'
import ServerSidebar from '../components/ServerSidebar.jsx'
import DMSidebar from '../components/DMSidebar.jsx'
import MessageView from '../components/MessageView.jsx'
import CreateServerModal from '../components/CreateServerModal.jsx'
import JoinServerModal from '../components/JoinServerModal.jsx'

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

  useHeartbeat(user.id)

  useEffect(() => {
    refreshLists()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  function selectServer(serverId) {
    setView('server')
    setSelectedServerId(serverId)
    setSelectedChannel(null)
  }

  function selectDMs() {
    setView('dms')
    setSelectedThread(null)
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
      />

      {view === 'server' && selectedServer && (
        <ServerSidebar
          server={selectedServer}
          selectedChannelId={selectedChannel?.id}
          onSelectChannel={(id, name) => setSelectedChannel({ id, name })}
          onDMMember={handleDMMember}
          onServerRenamed={handleServerRenamed}
          onServerDeleted={handleServerDeleted}
        />
      )}

      {view === 'dms' && (
        <DMSidebar
          threads={dmThreads}
          selectedThreadId={selectedThread?.id}
          onSelectThread={(id, name) => setSelectedThread({ id, name })}
          myUserId={user.id}
        />
      )}

      <div className="nc-main">
        <div className="nc-topbar">
          <span className="nc-whoami">Signed in as {user.name}</span>
          <button type="button" className="nc-btn nc-btn-text" onClick={logout}>Sign Out</button>
        </div>

        {view === 'server' && !selectedServer && !loadingLists && (
          <div className="nc-empty-state">
            <p>Pick a server from the left, or create/join one.</p>
          </div>
        )}
        {view === 'server' && selectedServer && selectedChannel && (
          <MessageView conversationId={selectedChannel.id} title={`# ${selectedChannel.name}`} />
        )}
        {view === 'server' && selectedServer && !selectedChannel && (
          <div className="nc-empty-state">
            <p>This server has no channels yet — create one on the left.</p>
          </div>
        )}
        {view === 'dms' && selectedThread && (
          <MessageView conversationId={selectedThread.id} title={`@ ${selectedThread.name}`} />
        )}
        {view === 'dms' && !selectedThread && (
          <div className="nc-empty-state">
            <p>Pick a conversation, or DM someone from inside a server.</p>
          </div>
        )}
      </div>

      {showCreate && <CreateServerModal onCreate={handleCreateServer} onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinServerModal onJoin={handleJoinServer} onClose={() => setShowJoin(false)} />}
    </div>
  )
}
