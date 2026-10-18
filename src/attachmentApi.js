// Uploads an image/file dropped into the message composer to the
// chat-attachments/ storage path (see amplify/storage/resource.ts in
// Tasker/Nextlayer3D). Resolving the uploaded key back to a viewable URL
// reuses profileApi.js's urlForKey — it's already generic over any S3 key,
// not avatar-specific, so no need to duplicate it here.
import { uploadData } from 'aws-amplify/storage'

const MAX_BYTES = 8 * 1024 * 1024 // 8MB — generous for chat, still bounded

function extensionFor(file) {
  const fromName = file.name?.split('.').pop()
  if (fromName && fromName.length <= 8) return fromName.toLowerCase()
  return (file.type?.split('/')[1] || 'bin').toLowerCase()
}

// Returns { key, type, name } ready to pass straight into chatApi.js's
// postMessage as its `attachment` argument. Throws (caller shows the
// message) if the file is too large.
export async function uploadChatAttachment(userId, file) {
  if (file.size > MAX_BYTES) {
    throw new Error('That file is too large to attach (8MB max).')
  }
  const key = `chat-attachments/${userId}-${Date.now()}.${extensionFor(file)}`
  await uploadData({ path: key, data: file, options: { contentType: file.type } }).result
  return {
    key,
    type: file.type?.startsWith('image/') ? 'image' : 'file',
    name: file.name || 'attachment',
  }
}
