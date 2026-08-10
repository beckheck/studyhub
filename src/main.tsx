import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppContainer } from './AppContainer'
import './index.css'
import './i18n/config'
import './i18n/types'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppContainer mode="web" />
  </StrictMode>,
)
