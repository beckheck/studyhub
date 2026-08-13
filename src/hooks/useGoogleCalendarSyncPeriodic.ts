import { useEffect } from 'react'
import { browserRuntime, isExtension } from '@/lib/browser-runtime-stub'
import { normalizeSyncIntervalMin } from '@/lib/sync-cadence'
import { refreshGoogleCalendarToken, useGoogleCalendarSyncCoordinator } from './useGoogleCalendarSyncCoordinator'
import { useGoogleCalendar } from './useStore'

/**
 * Periodic sync lifecycle for the UI surfaces.
 *
 * Extension mode: the background worker owns the periodic loop via the
 * gcal-sync alarm. The UI only handles the sync.tokenExpired broadcast,
 * because the background cannot refresh the Google token without a DOM.
 *
 * Web mode: there is no background, so the hook runs the periodic sync on a
 * setInterval at the configured cadence.
 */
export function useGoogleCalendarSyncPeriodic(): void {
  const { googleCalendar } = useGoogleCalendar()
  const { drainQueue } = useGoogleCalendarSyncCoordinator()

  useEffect(() => {
    if (isExtension) {
      const listener = (message: { type?: string }): void => {
        if (message?.type === 'sync.tokenExpired') {
          void refreshGoogleCalendarToken()
        }
      }
      browserRuntime.onMessage.addListener(listener)
      return () => browserRuntime.onMessage.removeListener(listener)
    }
    return undefined
  }, [])

  useEffect(() => {
    if (isExtension) {
      return undefined
    }

    const run = (): Promise<void> =>
      drainQueue({
        force: false,
      })

    const minutes = normalizeSyncIntervalMin(googleCalendar.syncIntervalMin)
    const intervalId = window.setInterval(
      () => {
        void run()
      },
      minutes * 60 * 1000,
    )

    return () => window.clearInterval(intervalId)
  }, [googleCalendar.syncIntervalMin, drainQueue])
}
