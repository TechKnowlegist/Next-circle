import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import InitialsAvatar from './InitialsAvatar.jsx'
import { deleteImageKey, getProfile, upsertProfile, uploadAvatar, uploadBanner, urlForKey, STATUS_OPTIONS } from '../profileApi.js'
import { invalidateAvatarCache } from './UserAvatar.jsx'

// Avatar + banner + username, all in one form. Username writes to the
// shared preferred_username Cognito attribute (see the comment on
// ChatUserProfile in amplify/data/resource.ts); avatar/banner write to
// ChatUserProfile + S3. Your email is shown here only to YOU, as a plain
// label — it's never written anywhere public and nothing else in Next
// Circle ever displays it (see displayNameFor in AuthContext.jsx).
//
// Just the form — no backdrop/modal chrome — embedded inline in
// SettingsScreen's "My Profile" pane. Shows a brief "Saved" flash
// instead of closing anything, since there's no modal here to close.
export default function ProfileEditForm({ onSaved }) {
  const { user, updateUsername } = useAuth()
  const [existingAvatarKey, setExistingAvatarKey] = useState(null)
  const [existingBannerKey, setExistingBannerKey] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [bannerPreview, setBannerPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [username, setUsername] = useState(user.name === 'Anonymous' ? '' : user.name)
  const [status, setStatusValue] = useState('online')
  const [statusMessage, setStatusMessage] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [savedFlash, setSavedFlash] = useState(false)

  const avatarInputRef = useRef(null)
  const bannerInputRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    getProfile(user.id).then(async (profile) => {
      if (cancelled || !profile) return
      setExistingAvatarKey(profile.avatarKey || null)
      setExistingBannerKey(profile.bannerKey || null)
      setStatusValue(profile.status || 'online')
      setStatusMessage(profile.statusMessage || '')
      const [avatar, banner] = await Promise.all([urlForKey(profile.avatarKey), urlForKey(profile.bannerKey)])
      if (cancelled) return
      if (avatar) setAvatarPreview(avatar)
      if (banner) setBannerPreview(banner)
    })
    return () => {
      cancelled = true
    }
  }, [user.id])

  function pickAvatar(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function pickBanner(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setBannerFile(file)
    setBannerPreview(URL.createObjectURL(file))
  }

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const trimmedUsername = username.trim()
      if (trimmedUsername && trimmedUsername !== (user.name === 'Anonymous' ? '' : user.name)) {
        const result = await updateUsername(trimmedUsername)
        if (!result.success) throw new Error(result.error || 'Could not update username')
      }

      const fields = { status, statusMessage: statusMessage.trim() || null }
      if (avatarFile) fields.avatarKey = await uploadAvatar(user.id, avatarFile)
      if (bannerFile) fields.bannerKey = await uploadBanner(user.id, bannerFile)
      await upsertProfile(user.id, fields)
      if (fields.avatarKey && existingAvatarKey) deleteImageKey(existingAvatarKey)
      if (fields.bannerKey && existingBannerKey) deleteImageKey(existingBannerKey)
      if (fields.avatarKey) invalidateAvatarCache(user.id)

      onSaved?.()
      setSavedFlash(true)
      setTimeout(() => setSavedFlash(false), 1800)
    } catch (err) {
      console.log('Next Circle — profile save failed:', err)
      setError(err instanceof Error ? err.message : 'Could not save profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="nc-profile-edit-form" onSubmit={handleSave}>
      <div
        className="nc-profile-edit-banner"
        style={bannerPreview ? { backgroundImage: `url(${bannerPreview})` } : undefined}
        onClick={() => bannerInputRef.current?.click()}
      >
        <span>Change banner</span>
      </div>
      <input ref={bannerInputRef} type="file" accept="image/*" hidden onChange={pickBanner} />

      <div className="nc-profile-edit-avatar-row">
        <button
          type="button"
          className="nc-profile-edit-avatar-btn"
          onClick={() => avatarInputRef.current?.click()}
          title="Change profile picture"
        >
          {avatarPreview ? (
            <img src={avatarPreview} alt="Your avatar" />
          ) : (
            <InitialsAvatar name={user.name} size={72} />
          )}
          <span className="nc-profile-edit-avatar-overlay">Change</span>
        </button>
        <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={pickAvatar} />

        <div className="nc-profile-edit-fields">
          <label htmlFor="nc-username">Username</label>
          <input
            id="nc-username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="No username set — shown as “Anonymous”"
            maxLength={32}
          />
          <p className="nc-profile-edit-email">Signed in as {user.email} (never shown publicly)</p>
        </div>
      </div>

      <div className="nc-status-picker">
        <p className="nc-appearance-label">Status</p>
        <div className="nc-status-options">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={status === opt.value ? 'nc-status-option active' : 'nc-status-option'}
              onClick={() => setStatusValue(opt.value)}
            >
              <span className="nc-status-dot" style={{ background: opt.color }} />
              {opt.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={statusMessage}
          onChange={(e) => setStatusMessage(e.target.value)}
          placeholder="Custom status message (optional)"
          maxLength={80}
        />
      </div>

      {error && <p className="nc-profile-edit-error">{error}</p>}

      <div className="nc-profile-edit-actions">
        {savedFlash && <span className="nc-profile-edit-saved">Saved</span>}
        <button type="submit" className="nc-btn nc-btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  )
}
