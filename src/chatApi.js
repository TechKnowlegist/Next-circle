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
      items { id serverId userId userName createdAt }
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
      items { id serverId userId userName createdAt }
    }
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
      items { id conversationId authorId authorName content createdAt }
    }
  }
`

const CREATE_MESSAGE = /* GraphQL */ `
  mutation CreateChatMessage($input: CreateChatMessageInput!) {
    createChatMessage(input: $input) {
      id conversationId authorId authorName content createdAt
    }
  }
`

const ON_CREATE_MESSAGE = /* GraphQL */ `
  subscription OnCreateChatMessage {
    onCreateChatMessage {
      id conversationId authorId authorName content createdAt
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
