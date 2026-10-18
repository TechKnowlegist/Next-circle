// Avatar/banner storage + the ChatUserProfile row that makes someone
// else's picture visible to other users (Cognito attributes are only
// readable for the signed-in user themselves — see the comment on
// ChatUserProfile in amplify/data/resource.ts over in Tasker/Nextlayer3D).
// Same hand-written-GraphQL approach as chatApi.js.
import { generateClient } from 'aws-amplify/api'
import { uploadData, getUrl, remove } from 'aws-amplify/storage'

const client = generateClient()

const PROFILE_FIELDS = 'id avatarKey bannerKey status statusMessage'

const GET_PROFILE = /* GraphQL */ `
  query GetChatUserProfile($id: ID!) {
    getChatUserProfile(id: $id) { ${PROFILE_FIELDS} }
  }
`

const CREATE_PROFILE = /* GraphQL */ `
  mutation CreateChatUserProfile($input: CreateChatUserProfileInput!) {
    createChatUserProfile(input: $input) { ${PROFILE_FIELDS} }
  }
`

const UPDATE_PROFILE = /* GraphQL */ `
  mutation UpdateChatUserProfile($input: UpdateChatUserProfileInput!) {
    updateChatUserProfile(input: $input) { ${PROFILE_FIELDS} }
  }
`

export async function getProfile(userId) {
  try {
    const res = await client.graphql({ query: GET_PROFILE, variables: { id: userId } })
    return res.data?.getChatUserProfile || null
  } catch (err) {
    console.log('Next Circle — failed to load profile:', err)
    return null
  }
}

// Upserts avatarKey/bannerKey/status/statusMessage (whichever are passed)
// for the given user. `fields` is a partial — only the keys present get
// written, so uploading just a new avatar doesn't touch anything else.
export async function upsertProfile(userId, fields) {
  const existing = await getProfile(userId)
  if (existing) {
    const res = await client.graphql({
      query: UPDATE_PROFILE,
      variables: { input: { id: userId, ...fields } },
    })
    return res.data?.updateChatUserProfile
  }
  const res = await client.graphql({
    query: CREATE_PROFILE,
    variables: { input: { id: userId, ...fields } },
  })
  return res.data?.createChatUserProfile
}

function extensionFor(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName.length <= 5) return fromName.toLowerCase()
  return (file.type?.split('/')[1] || 'jpg').toLowerCase()
}

async function uploadImage(prefix, userId, file) {
  const key = `${prefix}/${userId}-${Date.now()}.${extensionFor(file)}`
  await uploadData({ path: key, data: file, options: { contentType: file.type } }).result
  return key
}

export function uploadAvatar(userId, file) {
  return uploadImage('profile-avatars', userId, file)
}

export function uploadBanner(userId, file) {
  return uploadImage('profile-banners', userId, file)
}

// Best-effort cleanup of the previous image so uploads don't pile up in
// the bucket — failures here aren't worth surfacing to the user, the new
// image is already live either way.
export function deleteImageKey(key) {
  if (!key) return
  remove({ path: key }).catch((err) => console.log('Next Circle — old image cleanup failed:', err))
}

export async function urlForKey(key) {
  if (!key) return null
  try {
    const { url } = await getUrl({ path: key })
    return url.toString()
  } catch (err) {
    console.log('Next Circle — failed to resolve image url:', err)
    return null
  }
}

// 'online' is the implicit default — nobody ever actually writes a row
// that says "offline" (that's still computed from heartbeat silence, see
// isOnline() in chatApi.js); it's just what an unset/missing status reads
// as everywhere in the UI.
export const STATUS_OPTIONS = [
  { value: 'online', label: 'Online', color: '#22c55e' },
  { value: 'away', label: 'Away', color: '#facc15' },
  { value: 'busy', label: 'Busy', color: '#f97316' },
  { value: 'dnd', label: 'Do Not Disturb', color: '#ef4444' },
]

export function statusColor(status) {
  return STATUS_OPTIONS.find((s) => s.value === status)?.color || STATUS_OPTIONS[0].color
}

export function setStatus(userId, status, statusMessage) {
  return upsertProfile(userId, { status, statusMessage: statusMessage || null })
}
