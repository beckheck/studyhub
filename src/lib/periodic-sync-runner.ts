import { snapshot } from 'valtio'
import { GoogleCalendarSync } from '@/lib/google-calendar-sync'
import { googleOAuthManager } from '@/lib/google-oauth'
import { runPeriodicSync } from '@/lib/periodic-sync'
import { addToDirty, removeFromDirty, removeTombstone } from '@/lib/sync-queue'
import { store } from '@/stores/app'

export interface PeriodicSyncRunnerOptions {
  sync: GoogleCalendarSync
  onTokenExpired: () => void
  /** Run even with an empty queue so lastSyncedAt updates ("Sync now"). */
  force?: boolean
}

/** Shared GoogleCalendarSync instance (retry backoff once per process). */
export function createPeriodicSync(): GoogleCalendarSync {
  return new GoogleCalendarSync([1000, 2000, 4000])
}

/**
 * Silently refresh the Google token via GIS and persist the new token to the
 * store. Web mode has a DOM, so it can refresh; the background cannot.
 * Returns true when a new token was stored.
 */
export async function refreshGoogleCalendarToken(): Promise<boolean> {
  try {
    const refreshed = await googleOAuthManager.refreshAccessToken()
    store.googleCalendar.accessToken = refreshed.accessToken
    store.googleCalendar.tokenExpiresAt = refreshed.expiresAt
    return true
  } catch (error) {
    console.error('Google Calendar token refresh failed:', error)
    return false
  }
}

/**
 * Run the periodic sync backstop against the synced store. Mutations go
 * through the store, which persists and propagates cross-context. Shared by
 * the background alarm, the web-mode interval, and the "Sync now" button.
 */
export async function runPeriodicSyncFromStore(options: PeriodicSyncRunnerOptions): Promise<void> {
  const state = snapshot(store)

  await runPeriodicSync(
    {
      syncEnabled: state.googleCalendar.syncEnabled,
      accessToken: state.googleCalendar.accessToken ?? '',
      tokenExpiresAt: state.googleCalendar.tokenExpiresAt,
      calendarId: state.googleCalendar.calendarId ?? '',
      dirtyItemIds: state.dirtyItemIds,
      pendingDeleteSync: state.pendingDeleteSync,
      items: state.items as any[],
      courses: Object.fromEntries(state.courses.map(c => [c.id, c.title])),
      projects: Object.fromEntries(state.projects.map(p => [p.id, p.title])),
      sync: options.sync,
      onDirtyCleared: itemId => {
        store.dirtyItemIds = removeFromDirty(store.dirtyItemIds, itemId)
      },
      onDirtyReadded: itemId => {
        store.dirtyItemIds = addToDirty(store.dirtyItemIds, itemId)
      },
      onTombstoneCleared: itemId => {
        store.pendingDeleteSync = removeTombstone(store.pendingDeleteSync, itemId)
      },
      onLastSyncedAt: ts => {
        store.googleCalendar.lastSyncedAt = ts
      },
      onTokenExpired: options.onTokenExpired,
    },
    { force: options.force },
  )
}
