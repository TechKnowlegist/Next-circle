import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import { amplifyConfig } from './amplifyConfig.js'
import { loadSavedTheme, loadSavedMode, loadSavedBackground } from './theme.js'
import App from './App.jsx'
import './index.css'

Amplify.configure(amplifyConfig)
loadSavedTheme()
loadSavedMode()
loadSavedBackground()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
