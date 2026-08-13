import { useEffect } from 'react'
import { browserRuntime, isExtension } from '@/lib/browser-runtime-stub'
import { normalizeSyncIntervalMin } from '@/lib/sync-cadence'
import { createPeriodicSync, refreshGoogleCalendarToken, runPeriodicSyncFromStore } from '@/lib/periodic-sync-runner'
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
export function usePeriodicSync(): void {
  const { googleCalendar } = useGoogleCalendar()

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

    const sync = createPeriodicSync()

    const run = (): Promise<void> =>
      runPeriodicSyncFromStore({
        sync,
        onTokenExpired: () => {
          // Web mode has a DOM, so it can refresh the token itself.
          void refreshGoogleCalendarToken()
        },
      })

    const minutes = normalizeSyncIntervalMin(googleCalendar.syncIntervalMin)
    const intervalId = window.setInterval(
      () => {
        void run()
      },
      minutes * 60 * 1000,
    )

    return () => window.clearInterval(intervalId)
  }, [googleCalendar.syncIntervalMin])
}
