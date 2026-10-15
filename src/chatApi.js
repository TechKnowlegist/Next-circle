// Talks to the Chat* models on Nextlayer3D's shared AppSync API (see
// ChatServer/ChatServerMember/ChatChannel/ChatMessage/ChatDMThread in
// amplify/data/resource.ts over in the Tasker/Nextlayer3D repo, and
// amplifyConfig.js here for the endpoint). Same approach as Nextplayer's
// arcadeApi.js: plain JS with no generated Schema type, so this hand-writes
// the GraphQL Amplify would otherwise generate, via generateClient()'s raw
// `.graphql()` escape hatch instead of the typed `client.models.X` API.
//
// Every read here fetches a generous page and filters/sorts client-side
// rather than leaning on secondary indexes or array-filter operators —
// same reasoning as arcadeApi.js: these tables won't be huge, and it keeps
// every query to the one `eq`-filter shape that's actually proven to work
// against this schema already.
import { generateClient } from 'aws-amplify/api'

const client = generateClient()

function randomInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — easy to read aloud
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

// ---- Servers ----

const LIST_MY_MEMBERSHIPS = /* GraphQL */ `
  query ListMyMemberships($filter: ModelChatServerMemberFilterInput) {
    listChatServerMembers(filter: $filter, limit: 500) {
      items { id serverId userId userName lastSeenAt createdAt }
    }
  }
`

const GET_SERVER = /* GraphQL */ `
  query GetChatServer($id: ID!) {
    getChatServer(id: $id) { id name ownerId ownerName inviteCode iconEmoji createdAt }
  }
`

const LIST_SERVERS_BY_INVITE = /* GraphQL */ `
  query ListServersByInvite($filter: ModelChatServerFilterInput) {
    listChatServers(filter: $filter, limit: 1) {
      items { id name ownerId ownerName inviteCode iconEmoji createdAt }
    }
  }
`

const CREATE_SERVER = /* GraphQL */ `
  mutation CreateChatServer($input: CreateChatServerInput!) {
    createChatServer(input: $input) { id name ownerId ownerName inviteCode iconEmoji createdAt }
  }
`

const CREATE_MEMBERSHIP = /* GraphQL */ `
  mutation CreateChatServerMember($input: CreateChatServerMemberInput!) {
    createChatServerMember(input: $input) { id serverId userId userName createdAt }
  }
`

const LIST_SERVER_MEMBERS = /* GraphQL */ `
  query ListServerMembers($filter: ModelChatServerMemberFilterInput) {
    listChatServerMembers(filter: $filter, limit: 500) {
      items { id serverId userId userName lastSeenAt createdAt }
    }
  }
`

const UPDATE_SERVER = /* GraphQL */ `
  mutation UpdateChatServer($input: UpdateChatServerInput!) {
    updateChatServer(input: $input) { id name ownerId ownerName inviteCode iconEmoji createdAt }
  }
`

const DELETE_SERVER = /* GraphQL */ `
  mutation DeleteChatServer($input: DeleteChatServerInput!) {
    deleteChatServer(input: $input) { id }
  }
`

const DELETE_MEMBERSHIP = /* GraphQL */ `
  mutation DeleteChatServerMember($input: DeleteChatServerMemberInput!) {
    deleteChatServerMember(input: $input) { id }
  }
`

const UPDATE_MEMBERSHIP_HEARTBEAT = /* GraphQL */ `
  mutation UpdateChatServerMemberHeartbeat($input: UpdateChatServerMemberInput!) {
    updateChatServerMember(input: $input) { id lastSeenAt }
  }
`

const DELETE_CHANNEL = /* GraphQL */ `
  mutation DeleteChatChannel($input: DeleteChatChannelInput!) {
    deleteChatChannel(input: $input) { id }
  }
`

// Every server the given user belongs to, newest-joined first.
export async function listMyServers(userId) {
  const membershipRes = await client.graphql({
    query: LIST_MY_MEMBERSHIPS,
    variables: { filter: { userId: { eq: userId } } },
  })
  const memberships = membershipRes.data?.listChatServerMembers?.items || []
  const servers = await Promise.all(
    memberships.map(async (m) => {
      const res = await client.graphql({ query: GET_SERVER, variables: { id: m.serverId } })
      return res.data?.getChatServer
    })
  )
  return servers
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function createServer(name, ownerId, ownerName, iconEmoji) {
  const inviteCode = randomInviteCode()
  const serverRes = await client.graphql({
    query: CREATE_SERVER,
    variables: { input: { name, ownerId, ownerName, inviteCode, iconEmoji } },
  })
  const server = serverRes.data?.createChatServer
  if (!server) throw new Error('Could not create server')
  await client.graphql({
    query: CREATE_MEMBERSHIP,
    variables: { input: { serverId: server.id, userId: ownerId, userName: ownerName } },
  })
  return server
}

// Looks up a server by its invite code and joins the given user to it.
// Throws if the code doesn't match any server.
export async function joinServerByInviteCode(code, userId, userName) {
  const res = await client.graphql({
    query: LIST_SERVERS_BY_INVITE,
    variables: { filter: { inviteCode: { eq: code.trim().toUpperCase() } } },
  })
  const server = res.data?.listChatServers?.items?.[0]
  if (!server) throw new Error("That invite code doesn't match any server.")
  await client.graphql({
    query: CREATE_MEMBERSHIP,
    variables: { input: { serverId: server.id, userId, userName } },
  })
  return server
}

export async function listServerMembers(serverId) {
  const res = await client.graphql({
    query: LIST_SERVER_MEMBERS,
    variables: { filter: { serverId: { eq: serverId } } },
  })
  return res.data?.listChatServerMembers?.items || []
}

export async function renameServer(id, name) {
  const res = await client.graphql({ query: UPDATE_SERVER, variables: { input: { id, name } } })
  return res.data?.updateChatServer
}

// Removes one membership row — used for both "kick" (server owner acting
// on someone else's row) and "leave" (a member acting on their own); the
// API doesn't distinguish the two, see the authorization note on
// ChatServerMember in amplify/data/resource.ts.
export async function removeMembership(membershipId) {
  await client.graphql({ query: DELETE_MEMBERSHIP, variables: { input: { id: membershipId } } })
}

// Deletes a server along with its channels and memberships. Message rows
// in those channels are deliberately left behind (orphaned, never shown
// again since the channel is gone) rather than walked and deleted one by
// one — same accepted tradeoff as the rest of this schema's "won't be
// huge, don't over-engineer" posture.
export async function deleteServerCascade(serverId) {
  const [channels, members] = await Promise.all([listChannels(serverId), listServerMembers(serverId)])
  await Promise.all(channels.map((c) => client.graphql({ query: DELETE_CHANNEL, variables: { input: { id: c.id } } })))
  await Promise.all(members.map((m) => removeMembership(m.id)))
  await client.graphql({ query: DELETE_SERVER, variables: { input: { id: serverId } } })
}

// Touches lastSeenAt on every server membership the user has, so they
// show as online in each of those servers' member lists. Call this on an
// interval (see useHeartbeat.js) while the app is open and focused.
export async function heartbeatPresence(userId) {
  const res = await client.graphql({
    query: LIST_MY_MEMBERSHIPS,
    variables: { filter: { userId: { eq: userId } } },
  })
  const memberships = res.data?.listChatServerMembers?.items || []
  const now = new Date().toISOString()
  await Promise.all(
    memberships.map((m) =>
      client.graphql({ query: UPDATE_MEMBERSHIP_HEARTBEAT, variables: { input: { id: m.id, lastSeenAt: now } } })
    )
  )
}

// "Online" is approximate — true if a heartbeat landed in the last 60s.
// A just-closed tab reads as online for up to that window since there's
// no reliable sign-off on tab close.
export function isOnline(member) {
  if (!member?.lastSeenAt) return false
  return Date.now() - new Date(member.lastSeenAt).getTime() < 60_000
}

// ---- Channels ----

const LIST_CHANNELS = /* GraphQL */ `
  query ListChatChannels($filter: ModelChatChannelFilterInput) {
    listChatChannels(filter: $filter, limit: 200) {
      items { id serverId name position createdAt }
    }
  }
`

const CREATE_CHANNEL = /* GraphQL */ `
  mutation CreateChatChannel($input: CreateChatChannelInput!) {
    createChatChannel(input: $input) { id serverId name position createdAt }
  }
`

export async function listChannels(serverId) {
  const res = await client.graphql({
    query: LIST_CHANNELS,
    variables: { filter: { serverId: { eq: serverId } } },
  })
  const items = res.data?.listChatChannels?.items || []
  return items.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
}

export async function createChannel(serverId, name, position = 0) {
  const res = await client.graphql({
    query: CREATE_CHANNEL,
    variables: { input: { serverId, name, position } },
  })
  return res.data?.createChatChannel
}

// ---- Messages ----

const LIST_MESSAGES = /* GraphQL */ `
  query ListChatMessages($filter: ModelChatMessageFilterInput) {
    listChatMessages(filter: $filter, limit: 200) {
      items { id conversationId authorId authorName content edited createdAt }
    }
  }
`

const CREATE_MESSAGE = /* GraphQL */ `
  mutation CreateChatMessage($input: CreateChatMessageInput!) {
    createChatMessage(input: $input) {
      id conversationId authorId authorName content edited createdAt
    }
  }
`

const UPDATE_MESSAGE = /* GraphQL */ `
  mutation UpdateChatMessage($input: UpdateChatMessageInput!) {
    updateChatMessage(input: $input) {
      id conversationId authorId authorName content edited createdAt
    }
  }
`

const DELETE_MESSAGE = /* GraphQL */ `
  mutation DeleteChatMessage($input: DeleteChatMessageInput!) {
    deleteChatMessage(input: $input) { id }
  }
`

const ON_CREATE_MESSAGE = /* GraphQL */ `
  subscription OnCreateChatMessage {
    onCreateChatMessage {
      id conversationId authorId authorName content edited createdAt
    }
  }
`

export async function listMessages(conversationId, limit = 100) {
  const res = await client.graphql({
    query: LIST_MESSAGES,
    variables: { filter: { conversationId: { eq: conversationId } } },
  })
  const items = res.data?.listChatMessages?.items || []
  return items.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).slice(-limit)
}

export async function postMessage(conversationId, authorId, authorName, content) {
  const res = await client.graphql({
    query: CREATE_MESSAGE,
    variables: { input: { conversationId, authorId, authorName, content } },
  })
  return res.data?.createChatMessage
}

export async function updateMessage(id, content) {
  const res = await client.graphql({
    query: UPDATE_MESSAGE,
    variables: { input: { id, content, edited: true } },
  })
  return res.data?.updateChatMessage
}

// No onDelete subscription wired up (this schema doesn't need one for
// anything else yet) — the deleter's own view removes it immediately,
// other open viewers only see it gone on their next load of that
// conversation. Good enough for v1, not real-time for everyone.
export async function deleteMessage(id) {
  await client.graphql({ query: DELETE_MESSAGE, variables: { input: { id } } })
}

// Live new-message feed, site-wide — the subscription itself has no
// server-side filter argument (AppSync subscriptions on this schema don't
// expose one), so the caller's `onMessage` gets every new chat message and
// is expected to check `message.conversationId` itself before acting on
// it. Returns an unsubscribe function.
export function subscribeToMessages(onMessage) {
  const sub = client.graphql({ query: ON_CREATE_MESSAGE }).subscribe({
    next: ({ data }) => {
      const message = data?.onCreateChatMessage
      if (message) onMessage(message)
    },
    error: (err) => console.log('Next Circle — message subscription error:', err),
  })
  return () => sub.unsubscribe()
}

// ---- DMs ----

const LIST_MY_DM_THREADS = /* GraphQL */ `
  query ListMyDMThreads {
    listChatDMThreads(limit: 500) {
      items { id participantIds participantNames createdAt }
    }
  }
`

const CREATE_DM_THREAD = /* GraphQL */ `
  mutation CreateChatDMThread($input: CreateChatDMThreadInput!) {
    createChatDMThread(input: $input) { id participantIds participantNames createdAt }
  }
`

// Every DM thread the given user is part of. No server-side filter on the
// array field (unverified against this schema) — fetches a generous page
// and filters client-side instead, same reasoning as everything else here.
export async function listMyDMThreads(userId) {
  const res = await client.graphql({ query: LIST_MY_DM_THREADS })
  const items = res.data?.listChatDMThreads?.items || []
  return items
    .filter((t) => t.participantIds.includes(userId))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

// Finds an existing thread between exactly these two users, or creates one.
export async function getOrCreateDMThread(myId, myName, otherId, otherName) {
  const existing = await listMyDMThreads(myId)
  const match = existing.find((t) => t.participantIds.includes(otherId))
  if (match) return match
  const res = await client.graphql({
    query: CREATE_DM_THREAD,
    variables: {
      input: {
        participantIds: [myId, otherId],
        participantNames: [myName, otherName],
      },
    },
  })
  return res.data?.createChatDMThread
}
