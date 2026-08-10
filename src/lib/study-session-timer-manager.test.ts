import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { BackgroundTimerState, FocusTimerConfig } from '@/types'

const mocked = vi.hoisted(() => {
  return {
    requestNotificationPermission: vi.fn<(typeof import('@/lib/notifications'))['requestNotificationPermission']>(),
    showNotification: vi.fn<(typeof import('@/lib/notifications'))['showNotification']>(),
    enactSiteBlockingStrategy: vi.fn<(typeof import('@/lib/site-blocking'))['enactSiteBlockingStrategy']>(),
    playAudio: vi.fn<(typeof import('@/lib/audio'))['playAudio']>(),
    getNotificationTranslationAsync:
      vi.fn<(typeof import('@/lib/translation-utils'))['getNotificationTranslationAsync']>(),
  }
})

vi.mock('@/lib/browser-runtime-stub', () => ({
  browserRuntime: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  browserRuntimeStub: {
    sendMessage: vi.fn().mockResolvedValue(undefined),
    onMessage: { addListener: vi.fn(), removeListener: vi.fn() },
  },
  isExtension: true,
}))

vi.mock('@/lib/repository', () => ({
  createRepository: vi.fn(() => ({
    load: vi.fn().mockResolvedValue(null),
    save: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  })),
}))

vi.mock('@/lib/notifications', () => ({
  requestNotificationPermission: mocked.requestNotificationPermission,
  showNotification: mocked.showNotification,
}))

vi.mock('@/lib/site-blocking', () => ({
  enactSiteBlockingStrategy: mocked.enactSiteBlockingStrategy,
}))

vi.mock('@/lib/audio', () => ({
  playAudio: mocked.playAudio,
}))

vi.mock('@/lib/translation-utils', () => ({
  getNotificationTranslationAsync: mocked.getNotificationTranslationAsync,
}))

const { StudySessionTimerManager } = await import('./study-session-timer-manager')

const defaultSettings: FocusTimerConfig = {
  audioEnabled: true,
  audioVolume: 0.6,
  notificationsEnabled: true,
  showCountdown: true,
  blockingStrategy: 'blacklist',
  sites: 'example.com',
}

function makeManager(overrides: Partial<FocusTimerConfig> = {}): {
  manager: InstanceType<typeof StudySessionTimerManager>
  onStateChange: ReturnType<typeof vi.fn>
  onNotificationPermissionDenied: ReturnType<typeof vi.fn>
  settings: FocusTimerConfig
} {
  const onStateChange = vi.fn()
  const onNotificationPermissionDenied = vi.fn()
  const settings = { ...defaultSettings, ...overrides }
  const manager = new StudySessionTimerManager({
    getFocusTimerSettings: () => settings,
    onStateChange,
    onNotificationPermissionDenied,
  })
  return { manager, onStateChange, onNotificationPermissionDenied, settings }
}

function makeSendResponse(): (response: any) => void {
  return vi.fn() as unknown as (response: any) => void
}

describe('StudySessionTimerManager', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocked.requestNotificationPermission.mockResolvedValue('granted')
    mocked.showNotification.mockResolvedValue(undefined)
    mocked.enactSiteBlockingStrategy.mockResolvedValue(undefined)
    mocked.playAudio.mockResolvedValue(undefined)
    mocked.getNotificationTranslationAsync.mockImplementation(async (key: string) => key)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('phase transitions', () => {
    it('transitions from focus to break: unblocks sites, plays break sound, shows break notification, increments counter, updates state', async () => {
      const { manager, onStateChange } = makeManager()
      const sendResponse = makeSendResponse()

      manager.handleMessage({ type: 'timer.start', courseId: 'course-1' }, sendResponse)
      await vi.advanceTimersByTimeAsync(0)

      expect(mocked.enactSiteBlockingStrategy).toHaveBeenCalledWith('blockSite', 'example.com', 'blacklist')

      mocked.enactSiteBlockingStrategy.mockClear()
      mocked.playAudio.mockClear()
      mocked.showNotification.mockClear()
      onStateChange.mockClear()

      const focusDurationMs = 25 * 60 * 1000
      await vi.advanceTimersByTimeAsync(focusDurationMs)

      expect(mocked.enactSiteBlockingStrategy).toHaveBeenCalledWith('unblockSite', 'example.com', 'blacklist')
      expect(mocked.playAudio).toHaveBeenCalledWith('break', 0.6)
      expect(mocked.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'timer.break',
          icon: '/hearticon.png',
        }),
      )

      const lastState = onStateChange.mock.calls[onStateChange.mock.calls.length - 1]?.[0] as BackgroundTimerState
      expect(lastState.phase).toBe('break')
      expect(lastState.phaseElapsed).toBe(0)
      expect(lastState.studyPhasesCompleted).toBe(1)

      manager.handleMessage({ type: 'timer.stop' }, makeSendResponse())
      await vi.advanceTimersByTimeAsync(0)
    })

    it('transitions from break to focus: blocks sites, plays start sound, shows back-to-focus notification, updates state', async () => {
      const { manager, onStateChange } = makeManager()
      const sendResponse = makeSendResponse()

      manager.handleMessage({ type: 'timer.start', courseId: 'course-1' }, sendResponse)
      await vi.advanceTimersByTimeAsync(0)

      const focusDurationMs = 25 * 60 * 1000
      await vi.advanceTimersByTimeAsync(focusDurationMs)

      mocked.enactSiteBlockingStrategy.mockClear()
      mocked.playAudio.mockClear()
      mocked.showNotification.mockClear()
      onStateChange.mockClear()

      const breakDurationMs = 5 * 60 * 1000
      await vi.advanceTimersByTimeAsync(breakDurationMs)

      expect(mocked.enactSiteBlockingStrategy).toHaveBeenCalledWith('blockSite', 'example.com', 'blacklist')
      expect(mocked.playAudio).toHaveBeenCalledWith('start', 0.6)
      expect(mocked.showNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'timer.backToFocus',
          icon: '/hearticon.png',
        }),
      )

      const lastState = onStateChange.mock.calls[onStateChange.mock.calls.length - 1]?.[0] as BackgroundTimerState
      expect(lastState.phase).toBe('focus')
      expect(lastState.phaseElapsed).toBe(0)

      manager.handleMessage({ type: 'timer.stop' }, makeSendResponse())
      await vi.advanceTimersByTimeAsync(0)
    })
  })

  describe('notification permission denial', () => {
    it('calls onNotificationPermissionDenied at construction when permission is denied', async () => {
      mocked.requestNotificationPermission.mockResolvedValue('denied')

      const { onNotificationPermissionDenied } = makeManager({ notificationsEnabled: true })

      await vi.waitFor(() => {
        expect(onNotificationPermissionDenied).toHaveBeenCalledOnce()
      })
    })

    it('calls onNotificationPermissionDenied via timer.updateState when permission is denied mid-session', async () => {
      const { manager, onNotificationPermissionDenied, settings } = makeManager({ notificationsEnabled: false })
      await vi.advanceTimersByTimeAsync(0)

      mocked.requestNotificationPermission.mockResolvedValue('denied')
      settings.notificationsEnabled = true

      const sendResponse = makeSendResponse()
      manager.handleMessage({ type: 'timer.updateState', note: 'test' }, sendResponse)

      await vi.waitFor(() => {
        expect(onNotificationPermissionDenied).toHaveBeenCalledOnce()
      })
    })
  })
})
