import { useCallback } from 'react'
import {
  GoogleCalendarSyncCoordinator,
  createGoogleCalendarSyncStorePort,
  type GoogleCalendarSyncContext,
} from '@/lib/google-calendar-sync-coordinator'
import type { GoogleCalendarSyncResult } from '@/lib/google-calendar-sync'
import { googleOAuthManager } from '@/lib/google-oauth'
import { store } from '@/stores/app'
import { Item } from '@/items/models'

export type { GoogleCalendarSyncContext }

/**
 * Silently refresh the Google token via GIS and persist the new token to the
 * store. Web mode has a DOM, so it can refresh. The background cannot.
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

async function getValidAccessToken(): Promise<string> {
  const token = store.googleCalendar.accessToken
  const expiresAt = store.googleCalendar.tokenExpiresAt ?? 0

  if (!token) {
    return ''
  }

  if (googleOAuthManager.isTokenExpired(expiresAt)) {
    const refreshed = await googleOAuthManager.refreshAccessToken()
    store.googleCalendar.accessToken = refreshed.accessToken
    store.googleCalendar.tokenExpiresAt = refreshed.expiresAt
    return refreshed.accessToken
  }

  return token
}

/**
 * One coordinator for all UI surfaces. The background worker owns a separate
 * instance in its own JS context. Per-hook useRef instances would split queue
 * drain and real-time sync across different objects and break queue invariants.
 */
const uiGoogleCalendarSyncCoordinator = new GoogleCalendarSyncCoordinator({
  store: createGoogleCalendarSyncStorePort(store),
  getValidAccessToken,
  onTokenExpired: () => {
    void refreshGoogleCalendarToken()
  },
  retryDelays: [1000, 2000, 4000],
})

export function useGoogleCalendarSyncCoordinator() {
  const coordinator = uiGoogleCalendarSyncCoordinator

  const syncItem = useCallback(
    (item: Item, ctx: GoogleCalendarSyncContext): Promise<GoogleCalendarSyncResult> => coordinator.syncItem(item, ctx),
    [coordinator],
  )

  const deleteItem = useCallback(
    (item: Item, ctx: GoogleCalendarSyncContext): Promise<GoogleCalendarSyncResult> =>
      coordinator.deleteItem(item, ctx),
    [coordinator],
  )

  const bulkSyncItems = useCallback(
    (items: Item[], ctx: GoogleCalendarSyncContext, onProgress?: (current: number, total: number) => void) =>
      coordinator.bulkSyncItems(items, ctx, onProgress),
    [coordinator],
  )

  const fetchCalendars = useCallback(
    (tokenOverride?: string) => coordinator.fetchCalendars(tokenOverride),
    [coordinator],
  )

  const fetchEventsFromCalendar = useCallback(
    (calendarId: string, timeMin?: Date, tokenOverride?: string) =>
      coordinator.fetchEventsFromCalendar(calendarId, timeMin, tokenOverride),
    [coordinator],
  )

  const drainQueue = useCallback((options?: { force?: boolean }) => coordinator.drainQueue(options), [coordinator])

  return {
    syncItem,
    deleteItem,
    bulkSyncItems,
    fetchCalendars,
    fetchEventsFromCalendar,
    drainQueue,
  }
}
