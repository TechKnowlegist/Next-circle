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
      items { id serverId userId userName lastSeenAt role createdAt }
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
    createChatServerMember(input: $input) { id serverId userId userName role createdAt }
  }
`

const LIST_SERVER_MEMBERS = /* GraphQL */ `
  query ListServerMembers($filter: ModelChatServerMemberFilterInput) {
    listChatServerMembers(filter: $filter, limit: 500) {
      items { id serverId userId userName lastSeenAt role createdAt }
    }
  }
`

const SET_MEMBER_ROLE = /* GraphQL */ `
  mutation SetChatServerMemberRole($input: UpdateChatServerMemberInput!) {
    updateChatServerMember(input: $input) { id role }
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
    variables: { input: { serverId: server.id, userId: ownerId, userName: ownerName, role: 'owner' } },
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
    variables: { input: { serverId: server.id, userId, userName, role: 'member' } },
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

// 'owner' | 'admin' | 'member' — UI only ever calls this for the server
// owner promoting/demoting someone else (never themselves, never touching
// the actual 'owner' row), same posture as the authorization note on
// ChatServerMember.role in the schema.
export async function setMemberRole(membershipId, role) {
  const res = await client.graphql({ query: SET_MEMBER_ROLE, variables: { input: { id: membershipId, role } } })
  return res.data?.updateChatServerMember
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

const MESSAGE_FIELDS = `
  id conversationId authorId authorName content edited pinned
  attachmentKey attachmentType attachmentName createdAt
`

const LIST_MESSAGES = /* GraphQL */ `
  query ListChatMessages($filter: ModelChatMessageFilterInput) {
    listChatMessages(filter: $filter, limit: 200) {
      items { ${MESSAGE_FIELDS} }
    }
  }
`

const CREATE_MESSAGE = /* GraphQL */ `
  mutation CreateChatMessage($input: CreateChatMessageInput!) {
    createChatMessage(input: $input) { ${MESSAGE_FIELDS} }
  }
`

const UPDATE_MESSAGE = /* GraphQL */ `
  mutation UpdateChatMessage($input: UpdateChatMessageInput!) {
    updateChatMessage(input: $input) { ${MESSAGE_FIELDS} }
  }
`

const SET_MESSAGE_PINNED = /* GraphQL */ `
  mutation SetChatMessagePinned($input: UpdateChatMessageInput!) {
    updateChatMessage(input: $input) { id pinned }
  }
`

const DELETE_MESSAGE = /* GraphQL */ `
  mutation DeleteChatMessage($input: DeleteChatMessageInput!) {
    deleteChatMessage(input: $input) { id }
  }
`

const ON_CREATE_MESSAGE = /* GraphQL */ `
  subscription OnCreateChatMessage {
    onCreateChatMessage { ${MESSAGE_FIELDS} }
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

// `attachment`, if given, is { key, type, name } from uploadChatAttachment
// below — all three are written once at send time and never touched again.
export async function postMessage(conversationId, authorId, authorName, content, attachment) {
  const input = { conversationId, authorId, authorName, content }
  if (attachment) {
    input.attachmentKey = attachment.key
    input.attachmentType = attachment.type
    input.attachmentName = attachment.name
  }
  const res = await client.graphql({ query: CREATE_MESSAGE, variables: { input } })
  return res.data?.createChatMessage
}

export async function updateMessage(id, content) {
  const res = await client.graphql({
    query: UPDATE_MESSAGE,
    variables: { input: { id, content, edited: true } },
  })
  return res.data?.updateChatMessage
}

// Any member can pin/unpin (see the field-level authorization note on
// ChatMessage.pinned in the schema) — doesn't touch `edited`, so pinning
// never adds an "(edited)" tag to someone else's message.
export async function setMessagePinned(id, pinned) {
  const res = await client.graphql({ query: SET_MESSAGE_PINNED, variables: { input: { id, pinned } } })
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

// ---- Reactions ----

const LIST_REACTIONS = /* GraphQL */ `
  query ListChatMessageReactions($filter: ModelChatMessageReactionFilterInput) {
    listChatMessageReactions(filter: $filter, limit: 1000) {
      items { id conversationId messageId userId userName emoji createdAt }
    }
  }
`

const CREATE_REACTION = /* GraphQL */ `
  mutation CreateChatMessageReaction($input: CreateChatMessageReactionInput!) {
    createChatMessageReaction(input: $input) { id conversationId messageId userId userName emoji createdAt }
  }
`

const DELETE_REACTION = /* GraphQL */ `
  mutation DeleteChatMessageReaction($input: DeleteChatMessageReactionInput!) {
    deleteChatMessageReaction(input: $input) { id }
  }
`

// Every reaction on every message in a conversation, one query — the
// caller groups these by messageId+emoji itself (see groupReactions
// below) rather than this fetching per-message.
export async function listReactions(conversationId) {
  const res = await client.graphql({
    query: LIST_REACTIONS,
    variables: { filter: { conversationId: { eq: conversationId } } },
  })
  return res.data?.listChatMessageReactions?.items || []
}

export async function addReaction(conversationId, messageId, userId, userName, emoji) {
  const res = await client.graphql({
    query: CREATE_REACTION,
    variables: { input: { conversationId, messageId, userId, userName, emoji } },
  })
  return res.data?.createChatMessageReaction
}

export async function removeReaction(reactionId) {
  await client.graphql({ query: DELETE_REACTION, variables: { input: { id: reactionId } } })
}

// Turns a flat reaction list into { [messageId]: { [emoji]: { count, reactedByMe, reactionId } } }
// — reactionId is only set when it's the current user's own reaction on
// that emoji, since that's the one toggling off calls removeReaction with.
export function groupReactions(reactions, myUserId) {
  const byMessage = {}
  for (const r of reactions) {
    const forMessage = byMessage[r.messageId] || (byMessage[r.messageId] = {})
    const forEmoji = forMessage[r.emoji] || (forMessage[r.emoji] = { count: 0, reactedByMe: false, reactionId: null })
    forEmoji.count += 1
    if (r.userId === myUserId) {
      forEmoji.reactedByMe = true
      forEmoji.reactionId = r.id
    }
  }
  return byMessage
}

// ---- Typing indicator ----

const LIST_TYPING = /* GraphQL */ `
  query ListChatTypingSignals($filter: ModelChatTypingSignalFilterInput) {
    listChatTypingSignals(filter: $filter, limit: 50) {
      items { id conversationId userId userName updatedAt }
    }
  }
`

const CREATE_TYPING = /* GraphQL */ `
  mutation CreateChatTypingSignal($input: CreateChatTypingSignalInput!) {
    createChatTypingSignal(input: $input) { id conversationId userId userName updatedAt }
  }
`

const UPDATE_TYPING = /* GraphQL */ `
  mutation UpdateChatTypingSignal($input: UpdateChatTypingSignalInput!) {
    updateChatTypingSignal(input: $input) { id conversationId userId userName updatedAt }
  }
`

const DELETE_TYPING = /* GraphQL */ `
  mutation DeleteChatTypingSignal($input: DeleteChatTypingSignalInput!) {
    deleteChatTypingSignal(input: $input) { id }
  }
`

const TYPING_STALE_MS = 4_000

// Other people currently typing in this conversation — rows older than
// TYPING_STALE_MS are treated as abandoned (tab closed mid-type, etc.)
// and filtered out rather than ever being deleted server-side.
export async function listTypingUsers(conversationId, myUserId) {
  const res = await client.graphql({
    query: LIST_TYPING,
    variables: { filter: { conversationId: { eq: conversationId } } },
  })
  const items = res.data?.listChatTypingSignals?.items || []
  const cutoff = Date.now() - TYPING_STALE_MS
  return items.filter((t) => t.userId !== myUserId && new Date(t.updatedAt).getTime() > cutoff)
}

// Upserts this user's typing row for the conversation — call on a
// debounced input handler (see useTypingSignal.js) while they have
// unsent text. Finds-then-updates rather than a single upsert mutation
// since this schema has no such primitive, same pattern as
// heartbeatPresence elsewhere in this file.
export async function touchTyping(conversationId, userId, userName) {
  const res = await client.graphql({
    query: LIST_TYPING,
    variables: { filter: { conversationId: { eq: conversationId }, userId: { eq: userId } } },
  })
  const existing = res.data?.listChatTypingSignals?.items?.[0]
  if (existing) {
    await client.graphql({ query: UPDATE_TYPING, variables: { input: { id: existing.id } } })
    return
  }
  await client.graphql({ query: CREATE_TYPING, variables: { input: { conversationId, userId, userName } } })
}

// Call on blur/send so the "X is typing…" line disappears immediately
// instead of waiting out TYPING_STALE_MS.
export async function clearTyping(conversationId, userId) {
  const res = await client.graphql({
    query: LIST_TYPING,
    variables: { filter: { conversationId: { eq: conversationId }, userId: { eq: userId } } },
  })
  const existing = res.data?.listChatTypingSignals?.items || []
  await Promise.all(
    existing.map((t) => client.graphql({ query: DELETE_TYPING, variables: { input: { id: t.id } } }))
  )
}

// ---- Friends ----

const LIST_FRIEND_REQUESTS_FROM = /* GraphQL */ `
  query ListFriendRequestsFrom($filter: ModelChatFriendRequestFilterInput) {
    listChatFriendRequests(filter: $filter, limit: 500) {
      items { id fromUserId fromUserName toUserId toUserName status createdAt }
    }
  }
`

const CREATE_FRIEND_REQUEST = /* GraphQL */ `
  mutation CreateChatFriendRequest($input: CreateChatFriendRequestInput!) {
    createChatFriendRequest(input: $input) { id fromUserId fromUserName toUserId toUserName status createdAt }
  }
`

const ACCEPT_FRIEND_REQUEST = /* GraphQL */ `
  mutation AcceptChatFriendRequest($input: UpdateChatFriendRequestInput!) {
    updateChatFriendRequest(input: $input) { id status }
  }
`

const DELETE_FRIEND_REQUEST = /* GraphQL */ `
  mutation DeleteChatFriendRequest($input: DeleteChatFriendRequestInput!) {
    deleteChatFriendRequest(input: $input) { id }
  }
`

// Every friend request/friendship involving this user, either direction
// — the caller (see FriendsPanel.jsx) splits these into "pending
// incoming", "pending outgoing", and "friends" itself.
export async function listFriendRequests(userId) {
  const [sent, received] = await Promise.all([
    client.graphql({ query: LIST_FRIEND_REQUESTS_FROM, variables: { filter: { fromUserId: { eq: userId } } } }),
    client.graphql({ query: LIST_FRIEND_REQUESTS_FROM, variables: { filter: { toUserId: { eq: userId } } } }),
  ])
  const items = [
    ...(sent.data?.listChatFriendRequests?.items || []),
    ...(received.data?.listChatFriendRequests?.items || []),
  ]
  return items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function sendFriendRequest(fromUserId, fromUserName, toUserId, toUserName) {
  const res = await client.graphql({
    query: CREATE_FRIEND_REQUEST,
    variables: { input: { fromUserId, fromUserName, toUserId, toUserName, status: 'pending' } },
  })
  return res.data?.createChatFriendRequest
}

export async function acceptFriendRequest(id) {
  const res = await client.graphql({
    query: ACCEPT_FRIEND_REQUEST,
    variables: { input: { id, status: 'accepted' } },
  })
  return res.data?.updateChatFriendRequest
}

// Same mutation for declining a pending request and unfriending an
// accepted one — both are just "this row shouldn't exist anymore".
export async function removeFriendRequest(id) {
  await client.graphql({ query: DELETE_FRIEND_REQUEST, variables: { input: { id } } })
}

// ---- Blocking ----

const LIST_BLOCKS = /* GraphQL */ `
  query ListChatBlocks($filter: ModelChatBlockFilterInput) {
    listChatBlocks(filter: $filter, limit: 500) {
      items { id blockerId blockedId blockedName createdAt }
    }
  }
`

const CREATE_BLOCK = /* GraphQL */ `
  mutation CreateChatBlock($input: CreateChatBlockInput!) {
    createChatBlock(input: $input) { id blockerId blockedId blockedName createdAt }
  }
`

const DELETE_BLOCK = /* GraphQL */ `
  mutation DeleteChatBlock($input: DeleteChatBlockInput!) {
    deleteChatBlock(input: $input) { id }
  }
`

// Who this user has blocked — one-sided, see the schema note on
// ChatBlock. Used to filter messages/DMs client-side everywhere a message
// list or thread list is rendered.
export async function listBlocked(userId) {
  const res = await client.graphql({
    query: LIST_BLOCKS,
    variables: { filter: { blockerId: { eq: userId } } },
  })
  return res.data?.listChatBlocks?.items || []
}

export async function blockUser(blockerId, blockedId, blockedName) {
  const res = await client.graphql({
    query: CREATE_BLOCK,
    variables: { input: { blockerId, blockedId, blockedName } },
  })
  return res.data?.createChatBlock
}

export async function unblockUser(blockId) {
  await client.graphql({ query: DELETE_BLOCK, variables: { input: { id: blockId } } })
}
