import React from 'react'
import { createRoot } from 'react-dom/client'
import { AppContainer } from '../../AppContainer'
import '../../index.css'
import '../../extension.css'
import '../../i18n/config'

// Function to initialize the app
function initializeApp() {
  const rootElement = document.getElementById('root')
  if (rootElement) {
    const root = createRoot(rootElement)
    root.render(
      <React.StrictMode>
        <AppContainer mode="sidepanel" />
      </React.StrictMode>,
    )
  }
}

// Wait for DOM to be fully loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  // DOM is already loaded
  initializeApp()
}
