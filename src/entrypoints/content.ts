import { browser } from 'wxt/browser'
import { ContentScriptMessage } from '../types'

// Import translation resources directly
import enContent from '../locales/en/content.json'
import esContent from '../locales/es/content.json'

// Translation resources for content script
const translations = {
  en: enContent,
  es: esContent,
}

// Helper function to get translations in content script context
const getTranslation = (key: string, language: string = 'en'): string => {
  try {
    const keys = key.split('.')
    const langTranslations = translations[language] || translations.en
    let value: any = langTranslations

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k]
      } else {
        value = undefined
        break
      }
    }

    return typeof value === 'string' ? value : key
  } catch {
    console.warn('Translation error for key:', key, 'language:', language)
    return key
  }
}

// Helper function to get extension URLs cross-browser
const getExtensionURL = (path: string): string => {
  const runtime = globalThis.browser?.runtime || globalThis.chrome?.runtime
  return runtime ? runtime.getURL(path) : path
}

export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    class StudyPortalContentScript {
      private overlayActive: boolean = false

      constructor() {
        this.setupEventListeners()
      }

      setupEventListeners() {
        // Keyboard shortcut: Ctrl+Shift+S to toggle overlay
        document.addEventListener('keydown', e => {
          if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault()
            this.toggleStudyOverlay()
          }
        })

        // Handle text selection for saving to StudyHub ✨
        document.addEventListener('mouseup', _e => {
          const selection = window.getSelection()?.toString().trim()
          if (selection && selection.length > 0) {
            this.handleTextSelection(selection)
          }
        })

        // Listen for messages from extension
        browser.runtime.onMessage.addListener((request: ContentScriptMessage, sender, sendResponse) => {
          if (request.action === 'captureSelection') {
            this.captureCurrentSelection()
          } else if (request.action === 'toggleOverlay') {
            this.toggleStudyOverlay()
          } else if (request.action === 'blockSite') {
            this.blockSite(request.language)
          } else if (request.action === 'unblockSite') {
            this.unblockSite()
          }
          sendResponse({ success: true })
        })
      }

      handleTextSelection(text: string) {
        // Send selected text to extension background
        browser.runtime
          .sendMessage({
            action: 'textSelected',
            text: text,
            url: window.location.href,
            title: document.title,
            timestamp: Date.now(),
          })
          .catch(console.error)
      }

      captureCurrentSelection() {
        const selection = window.getSelection()?.toString().trim()
        if (selection) {
          this.handleTextSelection(selection)
        }
      }

      toggleStudyOverlay() {
        if (this.overlayActive) {
          this.removeOverlay()
        } else {
          this.createOverlay()
        }
      }

      createOverlay() {
        // Remove existing overlay if any
        this.removeOverlay()

        const overlay = document.createElement('div')
        overlay.id = 'studyhub-overlay'

        const iframe = document.createElement('iframe')
        iframe.src = getExtensionURL('/popup.html')
        iframe.style.cssText = `
          width: 350px;
          height: 500px;
          border: none;
          border-radius: 8px;
          background: white;
        `

        overlay.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.3);
          resize: both;
          overflow: hidden;
        `

        // Add close button
        const closeButton = document.createElement('button')
        closeButton.innerHTML = '×'
        closeButton.style.cssText = `
          position: absolute;
          top: 8px;
          right: 8px;
          z-index: 10001;
          background: rgba(0,0,0,0.7);
          color: white;
          border: none;
          border-radius: 50%;
          width: 24px;
          height: 24px;
          cursor: pointer;
          font-size: 16px;
          line-height: 1;
        `

        closeButton.addEventListener('click', () => {
          this.removeOverlay()
        })

        overlay.appendChild(iframe)
        overlay.appendChild(closeButton)
        document.body.appendChild(overlay)
        this.overlayActive = true
      }

      removeOverlay() {
        const overlay = document.getElementById('studyhub-overlay')
        if (overlay) {
          overlay.remove()
          this.overlayActive = false
        }
      }

      blockSite(language: string = 'en') {
        // Check if overlay already exists
        if (document.getElementById('studyhub-block-overlay')) {
          return
        }

        const overlay = document.createElement('div')
        overlay.id = 'studyhub-block-overlay'

        // Create overlay styles
        overlay.style.cssText = `
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
          z-index: 2147483647 !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
          font-size: 16px !important;
          color: white !important;
          text-align: center !important;
          padding: 32px !important;
          box-sizing: border-box !important;
        `

        // Create content with absolute font sizes
        const content = document.createElement('div')

        // Get translated messages using the provided language
        const t = (key: string) => getTranslation(key, language)

        content.innerHTML = `
          <div style="background: rgba(255, 255, 255, 0.1) !important; backdrop-filter: blur(10px) !important; border-radius: 20px !important; padding: 48px !important; max-width: 500px !important; border: 1px solid rgba(255, 255, 255, 0.2) !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;">
            <div style="font-size: 64px !important; margin-bottom: 16px !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;">
              🎯
            </div>
            <h1 style="font-size: 40px !important; font-weight: 700 !important; margin: 0 0 16px 0 !important; line-height: 1.2 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; color: white !important;">
              ${t('siteBlocking.focusTime')}
            </h1>
            <p style="font-size: 20px !important; margin: 0 0 32px 0 !important; opacity: 0.9 !important; line-height: 1.5 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; color: white !important;">
              ${t('siteBlocking.siteBlocked')}<br/>
              ${t('siteBlocking.stayFocused')}
            </p>
            <div style="font-size: 16px !important; opacity: 0.7 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important; color: white !important;">
              ${t('siteBlocking.sessionInProgress')}
            </div>
          </div>
        `

        overlay.appendChild(content)
        document.body.appendChild(overlay)

        // Prevent scrolling on the background page
        document.body.style.overflow = 'hidden'
      }

      unblockSite() {
        const overlay = document.getElementById('studyhub-block-overlay')
        if (overlay) {
          overlay.remove()
          // Restore scrolling
          document.body.style.overflow = ''
        }
      }
    }

    // Initialize content script
    new StudyPortalContentScript()
  },
})

declare function defineContentScript(config: any): any
