import { browserRuntime, isExtension } from '@/lib/browser-runtime-stub'
import { BrowserStorageAdapter, HybridStorage, LocalStorageAdapter } from '@/lib/hybrid-storage'
import { showNotification, requestNotificationPermission } from '@/lib/notifications'
import { createRepository } from '@/lib/repository'
import { enactSiteBlockingStrategy } from '@/lib/site-blocking'
import { getNextPhase, shouldTransitionPhase, getTechniqueConfig } from '@/lib/technique-utils'
import { getNotificationTranslationAsync } from '@/lib/translation-utils'
import { uid } from '@/lib/utils'
import { BackgroundMessage_Timer, BackgroundTimerState, FocusTimerConfig, StudySession } from '@/types'
import { AudioKey, playAudio } from './audio'

const STORAGE_KEY = 'sp:studySessionTimerState'

const timerStorage = new HybridStorage([BrowserStorageAdapter, LocalStorageAdapter])

const timerRepo = createRepository<BackgroundTimerState>({
  storage: timerStorage,
  storageKey: STORAGE_KEY,
  serialize: (state: BackgroundTimerState) => state,
  deserialize: (data: any) => data as BackgroundTimerState,
  migrations: [],
})

export class StudySessionTimerManager {
  private timerState: BackgroundTimerState = {
    running: false,
    elapsed: 0,
    technique: 'pomodoro-25-5',
    moodStart: 3,
    moodEnd: 3,
    note: '',
    startTs: undefined,
    courseId: '',
    phase: 'focus',
    phaseElapsed: 0,
    phaseStartTs: undefined,
    studyPhasesCompleted: 0,
  }

  private timerInterval: NodeJS.Timeout | null = null

  constructor(
    private readonly deps: {
      getFocusTimerSettings: () => FocusTimerConfig
      onStateChange?: (state: BackgroundTimerState) => void
      onNotificationPermissionDenied?: () => void
    },
  ) {
    this.initializeTimerState().catch(console.error)
  }

  private getFocusTimerSettings(): FocusTimerConfig {
    return this.deps.getFocusTimerSettings()
  }

  private setStorageValue(newValue: any) {
    if (newValue) {
      this.timerState = { ...this.timerState, ...newValue }

      if (this.timerState.running && this.timerState.startTs) {
        this.startTimerInterval()
      }
    }
  }

  // Load timer state from storage on startup
  private async initializeTimerState() {
    try {
      const result = await timerRepo.load(() => this.timerState)
      this.setStorageValue(result)

      if (this.getFocusTimerSettings().notificationsEnabled) {
        await this.requestNotificationPermissionIfNeeded()
      }

      timerRepo.subscribe(state => {
        try {
          this.setStorageValue(state)
          this.broadcastTimerState()
        } catch (error) {
          console.error('Failed to handle storage change:', error)
        }
      })
    } catch (error) {
      console.error('Failed to load timer state:', error)
    }
  }

  private startTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
    }

    this.timerInterval = setInterval(() => {
      if (this.timerState.running && this.timerState.startTs && this.timerState.phaseStartTs) {
        const now = Date.now()
        this.timerState.elapsed = Math.floor((now - this.timerState.startTs) / 1000)
        this.timerState.phaseElapsed = Math.floor((now - this.timerState.phaseStartTs) / 1000)

        // Check if we need to transition to the next phase
        if (shouldTransitionPhase(this.timerState.technique, this.timerState.phase, this.timerState.phaseElapsed)) {
          this.transitionToNextPhase().catch(console.error)
        } else {
          this.saveTimerState().catch(console.error)
        }
      }
    }, 1000)
  }

  private stopTimerInterval() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  private async transitionToNextPhase() {
    const currentPhase = this.timerState.phase
    const nextPhase = getNextPhase(currentPhase, this.timerState.technique, this.timerState.studyPhasesCompleted)
    const now = Date.now()
    const focusTimerSettings = this.getFocusTimerSettings()

    // Increment study phases counter when completing a focus phase
    if (currentPhase === 'focus') {
      this.timerState.studyPhasesCompleted++
    }

    // Handle site blocking/unblocking based on phase transition
    if (isExtension) {
      if (nextPhase === 'focus' && (currentPhase === 'break' || currentPhase === 'longBreak')) {
        // Transitioning from break back to focus - block sites
        await enactSiteBlockingStrategy('blockSite', focusTimerSettings.sites, focusTimerSettings.blockingStrategy)
      } else if ((nextPhase === 'break' || nextPhase === 'longBreak') && currentPhase === 'focus') {
        // Transitioning from focus to break - unblock sites
        await enactSiteBlockingStrategy('unblockSite', focusTimerSettings.sites, focusTimerSettings.blockingStrategy)
      }
    }

    // Play sound when transitioning phases
    if (focusTimerSettings.audioEnabled) {
      if (nextPhase === 'break' || nextPhase === 'longBreak') {
        await playNotificationSound('break', focusTimerSettings.audioVolume)
      } else if (nextPhase === 'focus') {
        await playNotificationSound('start', focusTimerSettings.audioVolume)
      }
    }

    // Show OS notification when transitioning phases
    await this.showPhaseTransitionNotification(currentPhase, nextPhase)

    // Update phase
    this.timerState.phase = nextPhase
    this.timerState.phaseElapsed = 0
    this.timerState.phaseStartTs = now

    await this.saveTimerState()
  }

  private async showPhaseTransitionNotification(currentPhase: string, nextPhase: string) {
    const focusTimerSettings = this.getFocusTimerSettings()

    // Don't show notifications if disabled
    if (!focusTimerSettings.notificationsEnabled) {
      return
    }

    try {
      let title: string
      let message: string

      if (nextPhase === 'break') {
        const config = getTechniqueConfig(this.timerState.technique)
        title = await getNotificationTranslationAsync('timer.break')
        message = await getNotificationTranslationAsync('timer.breakMessage', { duration: config.breakMinutes })
      } else if (nextPhase === 'longBreak') {
        const config = getTechniqueConfig(this.timerState.technique)
        const longBreakDuration = config.longBreakMinutes || config.breakMinutes
        title = await getNotificationTranslationAsync('timer.longBreak')
        message = await getNotificationTranslationAsync('timer.longBreakMessage', { duration: longBreakDuration })
      } else if (nextPhase === 'focus') {
        if (currentPhase === 'break' || currentPhase === 'longBreak') {
          title = await getNotificationTranslationAsync('timer.backToFocus')
          message = await getNotificationTranslationAsync('timer.backToFocusMessage')
        } else {
          title = await getNotificationTranslationAsync('timer.sessionStart')
          message = await getNotificationTranslationAsync('timer.sessionStartMessage')
        }
      } else {
        // Fallback for any other phase transitions
        title = await getNotificationTranslationAsync('timer.timerUpdate')
        message = await getNotificationTranslationAsync('timer.phaseTransition', {
          currentPhase,
          nextPhase,
        })
      }

      await showNotification({
        title,
        message,
        icon: '/hearticon.png',
        requireInteraction: false,
        silent: focusTimerSettings.audioEnabled,
      })
    } catch (error) {
      console.error('Failed to show phase transition notification:', error)
    }
  }

  private async saveTimerState() {
    await timerRepo.save(this.timerState)
    this.broadcastTimerState()
  }

  private broadcastTimerState() {
    this.deps.onStateChange?.(this.timerState)

    // Send message to other extension contexts (popup, sidepanel, etc.)
    sendBackgroundMessage({
      type: 'timer.broadcastState',
      state: this.timerState,
    })
  }

  public async startTimer(courseId: string) {
    try {
      const now = Date.now()
      const focusTimerSettings = this.getFocusTimerSettings()

      this.timerState.running = true
      this.timerState.elapsed = 0
      this.timerState.startTs = now
      this.timerState.courseId = courseId
      this.timerState.phase = 'focus'
      this.timerState.phaseElapsed = 0
      this.timerState.phaseStartTs = now

      // Block sites if we're in extension environment and starting a study phase
      if (isExtension) {
        await enactSiteBlockingStrategy('blockSite', focusTimerSettings.sites, focusTimerSettings.blockingStrategy)
      }

      // Play start sound if audio is enabled
      if (focusTimerSettings.audioEnabled) {
        await playNotificationSound('start', focusTimerSettings.audioVolume)
      }

      // Show start notification if enabled (permissions should already be handled)
      if (focusTimerSettings.notificationsEnabled) {
        await showNotification({
          title: await getNotificationTranslationAsync('timer.started'),
          message: await getNotificationTranslationAsync('timer.startedMessage'),
          icon: '/hearticon.png',
          requireInteraction: false,
          silent: focusTimerSettings.audioEnabled,
        })
      }

      this.startTimerInterval()
      await this.saveTimerState()
    } catch (error) {
      console.error('[Timer] Failed to start timer:', error)
      // Reset timer state if startup failed
      this.timerState.running = false
      this.timerState.startTs = undefined
      this.timerState.phaseStartTs = undefined
      await this.saveTimerState()
      throw error
    }
  }

  public async stopTimer(): Promise<{ session: any } | null> {
    if (!this.timerState.running || !this.timerState.startTs) {
      return null
    }

    const endTs = Date.now()
    const durationMin = Math.max(1, Math.round(this.timerState.elapsed / 60))
    const focusTimerSettings = this.getFocusTimerSettings()

    // Unblock all sites when stopping the timer
    if (isExtension) {
      await enactSiteBlockingStrategy('unblockSite', focusTimerSettings.sites, focusTimerSettings.blockingStrategy)
    }

    // No completion sound when manually stopping - only play break sound during phase transitions

    const session: StudySession = {
      id: uid(),
      courseId: this.timerState.courseId,
      startTs: this.timerState.startTs,
      endTs,
      durationMin,
      technique: this.timerState.technique,
      note: this.timerState.note,
      moodStart: this.timerState.moodStart,
      moodEnd: this.timerState.moodEnd,
    }

    // Reset timer state
    this.timerState.running = false
    this.timerState.elapsed = 0
    this.timerState.startTs = undefined
    this.timerState.note = ''
    this.timerState.phase = 'focus'
    this.timerState.phaseElapsed = 0
    this.timerState.phaseStartTs = undefined
    this.timerState.studyPhasesCompleted = 0
    this.timerState.moodStart = 3
    this.timerState.moodEnd = 3

    this.stopTimerInterval()
    await this.saveTimerState()

    return { session }
  }

  public async resetTimer() {
    const now = Date.now()
    this.timerState.elapsed = 0
    this.timerState.phaseElapsed = 0
    this.timerState.phase = 'focus'
    this.timerState.studyPhasesCompleted = 0

    if (this.timerState.running && this.timerState.startTs) {
      this.timerState.startTs = now
      this.timerState.phaseStartTs = now
    }
    await this.saveTimerState()
  }

  public updateTimerSettings(settings: Partial<BackgroundTimerState>) {
    this.timerState = { ...this.timerState, ...settings }

    // If notifications were just enabled in the passed settings, request permission immediately
    if (this.getFocusTimerSettings().notificationsEnabled === true) {
      void this.requestNotificationPermissionIfNeeded()
    }

    void this.saveTimerState()
  }

  private async requestNotificationPermissionIfNeeded() {
    try {
      const permission = await requestNotificationPermission()
      if (permission === 'denied') {
        console.warn('Notification permissions denied - disabling notifications')
        this.deps.onNotificationPermissionDenied?.()
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error)
    }
  }

  public getTimerState(): BackgroundTimerState {
    return { ...this.timerState }
  }

  // Handle timer-related messages from background script
  public handleMessage(message: BackgroundMessage_Timer, sendResponse: (response: any) => void) {
    switch (message.type) {
      case 'timer.start':
        this.startTimer(message.courseId)
          .then(() => {
            sendResponse({ success: true, state: this.getTimerState() })
          })
          .catch(error => {
            console.error('[TimerManager] Start timer failed:', error)
            sendResponse({
              success: false,
              error: error.message || 'Failed to start timer',
              state: this.getTimerState(),
            })
          })
        break

      case 'timer.stop':
        this.stopTimer()
          .then(result => {
            sendResponse({ success: true, state: this.getTimerState(), session: result?.session })
          })
          .catch(error => {
            console.error('[TimerManager] Stop timer failed:', error)
            sendResponse({
              success: false,
              error: error.message || 'Failed to stop timer',
              state: this.getTimerState(),
            })
          })
        break

      case 'timer.reset':
        this.resetTimer()
          .then(() => {
            sendResponse({ success: true, state: this.getTimerState() })
          })
          .catch(error => {
            console.error('[TimerManager] Reset timer failed:', error)
            sendResponse({
              success: false,
              error: error.message || 'Failed to reset timer',
              state: this.getTimerState(),
            })
          })
        break

      case 'timer.getState':
        sendResponse({ success: true, state: this.getTimerState() })
        break

      case 'timer.updateState':
        const { technique, note, moodStart, moodEnd, courseId } = message
        this.updateTimerSettings({
          ...(courseId !== undefined && { courseId }),
          ...(technique && { technique }),
          ...(note !== undefined && { note }),
          ...(moodStart !== undefined && { moodStart }),
          ...(moodEnd !== undefined && { moodEnd }),
        })
        sendResponse({ success: true, state: this.getTimerState() })
        break

      default:
        // Not a timer message, return false to indicate it wasn't handled
        return false
    }

    // Return true to indicate the message was handled
    return true
  }
}

/**
 * Play audio notification - works in both extension and web contexts
 */
async function playNotificationSound(soundType: AudioKey, volume: number = 0.6): Promise<void> {
  try {
    await playAudio(soundType, volume)
  } catch (error) {
    console.error(`[Audio] Failed to play ${soundType}:`, error)
  }
}

/**
 * Helper function to safely broadcast messages, ignoring errors when no listeners are active
 */
function sendBackgroundMessage(message: BackgroundMessage_Timer): void {
  try {
    browserRuntime.sendMessage(message).catch(() => {
      // Ignore errors if no listeners are active
    })
  } catch {
    // Runtime not available, ignore
  }
}
