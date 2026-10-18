import { useState } from 'react'
import { useAuth } from '../AuthContext.jsx'
import ProfileEditForm from './ProfileEditForm.jsx'
import AppearanceSection from './AppearanceSection.jsx'

// Full-screen settings, modeled on Yapper's own settings screen (left nav
// grouped into USER SETTINGS / APP SETTINGS, content pane on the right)
// rather than the small popups the Appearance/Edit-Profile buttons used
// to open separately. Only sections with something real behind them are
// here — no Voice & Audio, Keybinds, or Developer tabs, since Next Circle
// doesn't have those features to configure.
const SECTIONS = [
  { group: 'User Settings', items: [{ id: 'account', label: 'My Account' }, { id: 'profile', label: 'My Profile' }] },
  { group: 'App Settings', items: [{ id: 'appearance', label: 'Appearance' }] },
]

export default function SettingsScreen({ initialSection = 'account', onClose }) {
  const { user, logout } = useAuth()
  const [section, setSection] = useState(initialSection)

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

        {section === 'appearance' && (
          <div className="nc-settings-pane">
            <h2>Appearance</h2>
            <AppearanceSection />
          </div>
        )}
      </div>
    </div>
  )
}
