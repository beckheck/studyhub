import { browserRuntime, isExtension } from '@/lib/browser-runtime-stub'
import { browser } from 'wxt/browser'

export type AudioKey = 'start' | 'break'

const AUDIO_FILES: Record<AudioKey, string> = {
  start: '/sounds/timer-start.wav',
  break: '/sounds/timer-break.wav',
}

// Store audio elements to reuse them
const audioElements = new Map<AudioKey, HTMLAudioElement>()

export async function playAudio(soundType: AudioKey, volume: number = 0.6): Promise<void> {
  if (isExtension) {
    // Extension context - use offscreen document
    await ensureOffscreenDocument()

    // Send message to offscreen document to play audio
    await browserRuntime.sendMessage({
      type: 'PLAY_AUDIO',
      soundType,
      volume,
    })
    return
  }
  await playAudioNow(soundType, volume)
}

export async function playAudioNow(soundType: AudioKey, volume: number = 0.6): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      let audio = audioElements.get(soundType)

      if (!audio) {
        audio = new Audio(AUDIO_FILES[soundType])
        audioElements.set(soundType, audio)
        audio.addEventListener('error', e => {
          console.error(`Offscreen: Audio ${soundType} error:`, e)
        })
      }

      audio.volume = Math.max(0, Math.min(1, volume))

      // Reset to beginning if it was played before
      audio.currentTime = 0

      // Play the audio
      const playPromise = audio.play()

      if (playPromise) {
        playPromise
          .then(() => {
            resolve()
          })
          .catch(error => {
            reject(error)
          })
      } else {
        resolve()
      }
    } catch (error) {
      reject(error)
    }
  })
}

/**
 * Ensure offscreen document exists for audio playback
 */
async function ensureOffscreenDocument(): Promise<void> {
  try {
    // Check if we have chrome.runtime.getContexts (Chrome 116+)
    if (browser.runtime.getContexts) {
      const existingContexts = await browser.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
      })

      if (existingContexts.length > 0) {
        return // Offscreen document already exists
      }
    }

    // Try to create offscreen document
    await browser.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play study timer notification sounds',
    })
  } catch (error) {
    // If document already exists, createDocument will throw an error
    if (error.message && error.message.includes('Only a single offscreen document may be created')) {
      return
    }
    console.warn('Could not create offscreen document:', error)
    throw error
  }
}
