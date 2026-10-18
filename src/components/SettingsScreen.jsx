import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import ProfileEditForm from './ProfileEditForm.jsx'
import AppearanceSection from './AppearanceSection.jsx'
import {
  isSoundMuted, setSoundMuted,
  isAppearOffline, setAppearOffline,
} from '../settingsPrefs.js'
import { clearAvatarCache } from './UserAvatar.jsx'
import { applyTheme, saveTheme, applyMode, saveMode, applyBackground, saveBackground } from '../theme.js'
import { THEME_PRESETS } from '../themePresets.js'

// Full-screen settings, modeled on Yapper's own settings screen (left nav
// grouped into USER SETTINGS / APP SETTINGS, content pane on the right).
// Every section here has something real behind it — no Voice & Audio or
// Keybinds tabs, since Next Circle has no device picker or rebindable
// shortcuts to configure yet.
const SECTIONS = [
  {
    group: 'User Settings',
    items: [
      { id: 'account', label: 'My Account' },
      { id: 'profile', label: 'My Profile' },
      { id: 'privacy', label: 'Privacy' },
    ],
  },
  {
    group: 'App Settings',
    items: [
      { id: 'appearance', label: 'Appearance' },
      { id: 'notifications', label: 'Notifications' },
      { id: 'advanced', label: 'Advanced' },
      { id: 'developer', label: 'Developer' },
    ],
  },
]

function Toggle({ on, onClick }) {
  return (
    <button type="button" className={on ? 'nc-toggle on' : 'nc-toggle'} onClick={onClick} role="switch" aria-checked={on} />
  )
}

export default function SettingsScreen({ initialSection = 'account', onClose }) {
  const { user, logout } = useAuth()
  const [section, setSection] = useState(initialSection)

  const [soundMuted, setSoundMutedState] = useState(isSoundMuted)
  const [appearOffline, setAppearOfflineState] = useState(isAppearOffline)
  const [cacheMsg, setCacheMsg] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [copiedDebug, setCopiedDebug] = useState(false)

  function toggleSound() {
    const next = !soundMuted
    setSoundMuted(next)
    setSoundMutedState(next)
  }

  function toggleAppearOffline() {
    const next = !appearOffline
    setAppearOffline(next)
    setAppearOfflineState(next)
  }

  function resetAppearance() {
    const def = THEME_PRESETS[0]
    applyTheme(def.accent1, def.accent2)
    saveTheme(def.accent1, def.accent2)
    applyMode('dark')
    saveMode('dark')
    applyBackground(null)
    saveBackground(null)
    setResetMsg('Appearance reset to defaults.')
    setTimeout(() => setResetMsg(''), 2500)
  }

  function handleClearAvatarCache() {
    clearAvatarCache()
    setCacheMsg('Cleared — reopen a profile or scroll messages to refetch.')
    setTimeout(() => setCacheMsg(''), 2500)
  }

  const debugInfo = [
    `User ID: ${user.id}`,
    `Display name: ${user.name}`,
    `Theme mode: ${document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'}`,
    `User agent: ${navigator.userAgent}`,
  ].join('\n')

  async function copyDebugInfo() {
    try {
      await navigator.clipboard.writeText(debugInfo)
      setCopiedDebug(true)
      setTimeout(() => setCopiedDebug(false), 2000)
    } catch (err) {
      console.log('Next Circle — could not copy debug info:', err)
    }
  }

  return (
    <div className="nc-settings-screen">
      <div className="nc-settings-nav">
        {SECTIONS.map((group) => (
          <div key={group.group} className="nc-settings-group">
            <p className="nc-settings-group-label">{group.group}</p>
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={section === item.id ? 'nc-settings-nav-item active' : 'nc-settings-nav-item'}
                onClick={() => setSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
        <div className="nc-settings-group nc-settings-group-bottom">
          <button type="button" className="nc-settings-nav-item nc-settings-logout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="nc-settings-content">
        <button type="button" className="nc-settings-close" onClick={onClose} title="Close settings">
          ✕
        </button>

        {section === 'account' && (
          <div className="nc-settings-pane">
            <h2>My Account</h2>
            <p className="nc-appearance-label">Email</p>
            <p className="nc-settings-static">{user.email}</p>
            <p className="nc-profile-edit-email">Never shown publicly — see My Profile to set a username instead.</p>
          </div>
        )}

        {section === 'profile' && (
          <div className="nc-settings-pane">
            <h2>My Profile</h2>
            <ProfileEditForm />
          </div>
        )}

        {section === 'privacy' && (
          <div className="nc-settings-pane">
            <h2>Privacy</h2>
            <div className="nc-settings-toggle-row">
              <div>
                <p className="nc-settings-toggle-title">Appear offline</p>
                <p className="nc-settings-toggle-sub">
                  Stop sending presence updates — your online dot goes gray for everyone else, same as closing the tab.
                </p>
              </div>
              <Toggle on={appearOffline} onClick={toggleAppearOffline} />
            </div>
          </div>
        )}

        {section === 'appearance' && (
          <div className="nc-settings-pane">
            <h2>Appearance</h2>
            <AppearanceSection />
          </div>
        )}

        {section === 'notifications' && (
          <div className="nc-settings-pane">
            <h2>Notifications</h2>
            <div className="nc-settings-toggle-row">
              <div>
                <p className="nc-settings-toggle-title">Message sound</p>
                <p className="nc-settings-toggle-sub">Play a chime for incoming messages while the app is open.</p>
              </div>
              <Toggle on={!soundMuted} onClick={toggleSound} />
            </div>
          </div>
        )}

        {section === 'advanced' && (
          <div className="nc-settings-pane">
            <h2>Advanced</h2>
            <p className="nc-appearance-label">Appearance</p>
            <p className="nc-settings-toggle-sub" style={{ marginBottom: 10 }}>
              Resets your color theme, light/dark mode, and background to Next Circle's defaults — only affects this browser.
            </p>
            <button type="button" className="nc-btn" onClick={resetAppearance}>
              Reset appearance to defaults
            </button>
            {resetMsg && <p className="nc-profile-edit-saved">{resetMsg}</p>}

            <p className="nc-appearance-label">Cache</p>
            <p className="nc-settings-toggle-sub" style={{ marginBottom: 10 }}>
              Clears profile pictures cached in this tab, in case someone's avatar looks out of date.
            </p>
            <button type="button" className="nc-btn" onClick={handleClearAvatarCache}>
              Clear cached avatars
            </button>
            {cacheMsg && <p className="nc-profile-edit-saved">{cacheMsg}</p>}
          </div>
        )}

        {section === 'developer' && (
          <div className="nc-settings-pane">
            <h2>Developer</h2>
            <p className="nc-settings-toggle-sub" style={{ marginBottom: 10 }}>
              Real values from this session — handy to paste into a bug report. Nothing here is sent anywhere automatically.
            </p>
            <pre className="nc-settings-debug">{debugInfo}</pre>
            <button type="button" className="nc-btn" onClick={copyDebugInfo}>
              {copiedDebug ? 'Copied!' : 'Copy debug info'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
