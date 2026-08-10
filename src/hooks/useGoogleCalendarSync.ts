import { useRef } from 'react'
import { useGoogleCalendar } from './useStore'
import { GoogleCalendarSync, type SyncItemContext, type GoogleCalendarSyncResult } from '@/lib/google-calendar-sync'
import { googleOAuthManager } from '@/lib/google-oauth'
import { Item } from '@/items/models'
import type { GoogleCalendarConfig } from '../types'

type SyncCtxWithoutToken = Omit<SyncItemContext, 'accessToken'>

export function useGoogleCalendarSync() {
  const { googleCalendar, setAccessToken } = useGoogleCalendar()

  const configRef = useRef<Pick<GoogleCalendarConfig, 'accessToken' | 'tokenExpiresAt'>>({
    accessToken: googleCalendar.accessToken,
    tokenExpiresAt: googleCalendar.tokenExpiresAt,
  })
  configRef.current = {
    accessToken: googleCalendar.accessToken,
    tokenExpiresAt: googleCalendar.tokenExpiresAt,
  }

  const syncRef = useRef<GoogleCalendarSync | null>(null)
  if (!syncRef.current) {
    const getValidAccessToken = async (): Promise<string> => {
      const config = configRef.current
      const token = config.accessToken
      const expiresAt = config.tokenExpiresAt ?? 0

      if (!token) {
        throw new Error('Not connected to Google Calendar.')
      }

      if (googleOAuthManager.isTokenExpired(expiresAt)) {
        const refreshed = await googleOAuthManager.refreshAccessToken()
        setAccessToken(refreshed.accessToken, refreshed.expiresAt)
        return refreshed.accessToken
      }

      return token
    }

    syncRef.current = new GoogleCalendarSync([1000, 2000, 4000], getValidAccessToken)
  }

  const buildCtx = (ctx: SyncCtxWithoutToken): SyncItemContext => ({
    ...ctx,
    accessToken: googleCalendar.accessToken ?? '',
  })

  const syncItem = (item: Item, ctx: SyncCtxWithoutToken): Promise<GoogleCalendarSyncResult> =>
    syncRef.current!.syncItem(item, buildCtx(ctx))

  const deleteItem = (item: Item, ctx: SyncCtxWithoutToken): Promise<GoogleCalendarSyncResult> =>
    syncRef.current!.deleteItem(item, buildCtx(ctx))

  const bulkSyncItems = (
    items: Item[],
    ctx: SyncCtxWithoutToken,
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ success: number; failed: number; errors: string[] }> =>
    syncRef.current!.bulkSyncItems(items, buildCtx(ctx), onProgress)

  const fetchCalendars = (): Promise<Array<{ id: string; summary: string }> | null> =>
    syncRef.current!.fetchCalendars(googleCalendar.accessToken ?? '')

  const fetchEventsFromCalendar = (calendarId: string, timeMin?: Date): Promise<any[]> =>
    syncRef.current!.fetchEventsFromCalendar(googleCalendar.accessToken ?? '', calendarId, timeMin)

  return {
    syncItem,
    deleteItem,
    bulkSyncItems,
    fetchCalendars,
    fetchEventsFromCalendar,
  }
}
