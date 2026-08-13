import { listenLanguageChangeInExtensionBackground } from '@/i18n/config'
import { enactSiteBlockingStrategyInTab } from '@/lib/site-blocking'
import { StudySessionTimerManager } from '@/lib/study-session-timer-manager'
import { getPhaseDurationSeconds, getPhaseEmoji } from '@/lib/technique-utils'
import {
  buildGoogleCalendarSyncStatus,
  createGoogleCalendarSyncStorePort,
  GoogleCalendarSyncCoordinator,
} from '@/lib/google-calendar-sync-coordinator'
import { normalizeSyncIntervalMin } from '@/lib/sync-cadence'
import { BackgroundMessage, BackgroundTimerState, TimerPhase } from '@/types'
import { browser } from 'wxt/browser'
import { store } from '@/stores/app'
import { snapshot } from 'valtio'

const GCAL_SYNC_ALARM = 'gcal-periodic-sync'
const gcalSyncCoordinator = new GoogleCalendarSyncCoordinator({
  store: createGoogleCalendarSyncStorePort(store),
  onTokenExpired: () => {
    sendSyncMessage({ type: 'sync.tokenExpired' })
  },
  retryDelays: [1000, 2000, 4000],
})

declare function defineBackground(fn: () => void): any

export default defineBackground(() => {
  const timerManager = new StudySessionTimerManager({
    onStateChange: updateBadgeFromTimerState,
    getFocusTimerSettings: () => snapshot(store).focusTimer,
    onNotificationPermissionDenied: () => {
      store.focusTimer.notificationsEnabled = false
    },
  })

  void listenLanguageChangeInExtensionBackground()

  // Check if we're in the extension environment
  if (browser.runtime.onInstalled) {
    // Handle extension installation
    browser.runtime.onInstalled.addListener(() => {
      // Create context menus
      browser.contextMenus.create({
        id: 'saveToStudyPortal',
        title: 'Save to StudyHub ✨',
        contexts: ['selection'],
      })

      browser.contextMenus.create({
        id: 'openStudyPortal',
        title: 'Open StudyHub ✨',
        contexts: ['all'],
      })

      browser.contextMenus.create({
        id: 'openStudyPortalSidePanel',
        title: 'Open StudyHub ✨ in Side Panel',
        contexts: ['all'],
      })

      browser.contextMenus.create({
        id: 'openStudyPortalTab',
        title: 'Open StudyHub ✨ in New Tab',
        contexts: ['all'],
      })

      // Always-running periodic sync heartbeat. The alarm ticks at the finest
      // cadence (1 minute) and the handler gates execution on the configured
      // syncIntervalMin, so changing the setting takes effect without
      // recreating the alarm.
      void browser.alarms.create(GCAL_SYNC_ALARM, { periodInMinutes: 1 })
    })

    // Periodic Google Calendar sync backstop. Wakes the background service
    // worker when the worker is dormant (same liveness model as the timer).
    browser.alarms.onAlarm.addListener(alarm => {
      if (alarm.name === GCAL_SYNC_ALARM) {
        void runPeriodicSyncIfDue()
      }
    })

    // Handle context menu clicks
    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'saveToStudyPortal') {
        // Send selected text to content script
        if (tab?.id && info.selectionText) {
          sendCaptureSelectionMessage(tab.id, info.selectionText)
        }
      } else if (info.menuItemId === 'openStudyPortal') {
        openStudyPortalPopup()
      } else if (info.menuItemId === 'openStudyPortalSidePanel' && tab?.id) {
        openStudyPortalSidePanel(tab.id)
      } else if (info.menuItemId === 'openStudyPortalTab') {
        openStudyPortalTab()
      }
    })

    // Handle messages from content script and popup/sidepanel
    browser.runtime.onMessage.addListener((message: BackgroundMessage, sender, sendResponse) => {
      if (message.type === 'textSelected') {
        saveSelectedText(message.text, message.url, message.title, message.timestamp)
        sendResponse({ success: true })
        return false // Synchronous response
      } else if (message.type === 'openStudyPortalTab') {
        openStudyPortalTab(message.activeTab)
        sendResponse({ success: true })
        return false // Synchronous response
      } else if (message.type === 'sync.getStatus') {
        sendResponse(buildGoogleCalendarSyncStatus(snapshot(store)))
        return false // Synchronous response
      } else if (message.type === 'sync.triggerNow') {
        // Resolve only after the sync completes so the caller's follow-up
        // sync.getStatus reads the updated lastSyncedAt, not a stale value.
        // Forced so an empty queue still stamps lastSyncedAt.
        runPeriodicSyncFromBackground({ force: true })
          .then(() => {
            sendResponse({ success: true })
          })
          .catch(error => {
            console.error('Periodic sync failed:', error)
            sendResponse({ success: true })
          })
        return true // Asynchronous response
      } else if (message.type === 'sync.tokenExpired') {
        // The background never receives this broadcast (Chrome and Firefox
        // skip the sender's own onMessage listener). The branch exists to
        // exhaust the message union so the timer fallback below narrows to
        // BackgroundMessage_Timer.
        return false
      } else {
        // Timer messages are handled asynchronously
        const result = timerManager.handleMessage(message, sendResponse)
        return result // Return true for async messages, false for unhandled messages
      }
    })

    // Handle keyboard shortcuts (if defined in manifest)
    if (browser.commands) {
      browser.commands.onCommand.addListener((command: string) => {
        if (command === 'toggle-study-portal') {
          // Toggle side panel or popup
          toggleOverlay()
        } else if (command === 'open-in-tab') {
          // Open in new tab
          openStudyPortalTab()
        }
      })
    }

    // Handle tab navigation during study sessions
    browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tab.url) {
        const timerState = timerManager.getTimerState()
        if (timerState.running && timerState.phase === 'focus') {
          const storeSnapshot = snapshot(store)
          const focusTimerSettings = storeSnapshot.focusTimer
          // Block the tab if it matches our blocked sites based on blocking strategy
          enactSiteBlockingStrategyInTab(
            'blockSite',
            tab,
            focusTimerSettings.sites,
            focusTimerSettings.blockingStrategy,
          ).catch(error => {
            console.log('Could not block newly navigated tab:', error.message)
          })
        }
      }
    })
  } else {
    console.error('Browser APIs not available - running in build/test environment')
  }
})

// Open in new tab
const openStudyPortalTab = (activeTab?: string) => {
  const url = activeTab ? `tab.html#${activeTab}` : 'tab.html'
  void browser.tabs.create({ url })
}

// Open popup - this might not work in all contexts
const openStudyPortalPopup = () => {
  try {
    void browser.action.openPopup()
  } catch (e) {
    console.error('Could not open popup:', e)
  }
}

// Open side panel (Chrome 114+)
const openStudyPortalSidePanel = (tabId: number) => {
  try {
    void browser.sidePanel.open({ tabId })
  } catch (e) {
    console.error('Could not open side panel:', e)
  }
}

// Store selected text for the StudyHub ✨
const saveSelectedText = (text: string, url: string, title: string, timestamp: number) => {
  void browser.storage.local.set({
    lastSelection: {
      text,
      url,
      title,
      timestamp,
    },
  })
}

const sendCaptureSelectionMessage = (tabId: number, selectedText: string) => {
  void browser.tabs.sendMessage(tabId, {
    action: 'captureSelection',
    selectedText,
  })
}

// Run the periodic sync backstop against the background's synced store.
// Mutations go through the store, which persists and propagates to other
// contexts via HybridStorage.
async function runPeriodicSyncFromBackground(options: { force?: boolean } = {}) {
  await gcalSyncCoordinator.drainQueue(options)
}

// Alarm-fired wrapper that enforces the configured cadence. The alarm ticks
// every minute; the gate lets a sync run at most once per syncIntervalMin.
// The manual "Sync now" path bypasses the gate, so it always runs.
let lastSyncRunAt = 0

async function runPeriodicSyncIfDue() {
  const state = snapshot(store)
  const intervalMs = normalizeSyncIntervalMin(state.googleCalendar.syncIntervalMin) * 60 * 1000
  if (lastSyncRunAt !== 0 && Date.now() - lastSyncRunAt < intervalMs) {
    return
  }
  lastSyncRunAt = Date.now()
  await runPeriodicSyncFromBackground()
}

/**
 * Safely broadcast a sync message to UI contexts, ignoring errors when no
 * listeners are active.
 */
function sendSyncMessage(message: { type: 'sync.tokenExpired' }): void {
  try {
    browser.runtime.sendMessage(message).catch(() => {
      // Ignore errors if no listeners are active
    })
  } catch {
    // Runtime not available, ignore
  }
}

const toggleOverlay = () => {
  browser.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (tabs[0]?.id) {
      void browser.tabs.sendMessage(tabs[0].id, { action: 'toggleOverlay' })
    }
  })
}

// Badge management functions
const updateExtensionBadge = (text: string, color: string) => {
  try {
    void browser.action.setBadgeText({ text })
    void browser.action.setBadgeBackgroundColor({ color })
  } catch (error) {
    console.error('[Background] Failed to update extension badge:', error)
  }
}

const clearExtensionBadge = () => {
  try {
    void browser.action.setBadgeText({ text: '' })
  } catch (error) {
    console.error('[Background] Failed to clear extension badge:', error)
  }
}

// Update badge based on timer state
const updateBadgeFromTimerState = (timerState: BackgroundTimerState) => {
  if (timerState.running) {
    const remainingTime = getRemainingTimeForCurrentPhase(timerState)
    const badgeText = formatBadgeText(remainingTime, timerState.phase, timerState.technique)
    const badgeColor = getBadgeColor(timerState.phase)
    updateExtensionBadge(badgeText, badgeColor)
  } else {
    clearExtensionBadge()
  }
}

// Helper functions for badge formatting
const getRemainingTimeForCurrentPhase = (timerState: BackgroundTimerState): number => {
  const phaseDuration = getPhaseDurationSeconds(timerState.technique, timerState.phase)

  if (phaseDuration === Infinity) {
    // For flow technique, return elapsed time instead
    return timerState.phaseElapsed
  }

  return Math.max(0, phaseDuration - timerState.phaseElapsed)
}

const formatBadgeText = (timeInSeconds: number, phase: TimerPhase, technique: string): string => {
  const phasePrefix = getPhaseEmoji(technique, phase)

  // For flow technique, show elapsed time with "F" prefix
  if (getPhaseDurationSeconds(technique, phase) === Infinity) {
    const minutes = Math.floor(timeInSeconds / 60)
    if (minutes < 100) {
      return `${phasePrefix}${minutes}`
    } else {
      const hours = Math.floor(minutes / 60)
      return `${phasePrefix}${hours}h`
    }
  }

  // For timed techniques, show remaining time
  const minutes = Math.ceil(timeInSeconds / 60)

  if (minutes < 100) {
    return `${phasePrefix}${minutes}`
  } else {
    const hours = Math.floor(minutes / 60)
    return `${phasePrefix}${hours}h`
  }
}

const getBadgeColor = (phase: string): string => {
  switch (phase) {
    case 'focus':
      return '#FF9800'
    case 'break':
      return '#4CAF50'
    case 'longBreak':
      return '#2196F3'
    default:
      return '#757575'
  }
}
