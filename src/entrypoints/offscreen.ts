/**
 * Offscreen document for playing audio in Chrome extension background context
 */

import { playAudioNow } from '@/lib/audio'
import { browser } from 'wxt/browser'

declare function defineUnlistedScript(fn: () => void): any

export default defineUnlistedScript(() => {
  // Listen for messages from the background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PLAY_AUDIO') {
      const { soundType, volume } = message

      playAudioNow(soundType, volume)
        .then(() => {
          sendResponse({ success: true })
        })
        .catch(error => {
          console.error(`Offscreen: Audio ${soundType} failed:`, error)
          sendResponse({ success: false, error: error.message })
        })

      // Return true to indicate we'll send response asynchronously
      return true
    }

    return false
  })
})
