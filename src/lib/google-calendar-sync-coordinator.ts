import type { Item } from '@/items/models'
import { GoogleCalendarSync, type GoogleCalendarSyncResult, type SyncItemContext } from '@/lib/google-calendar-sync'
import { googleOAuthManager } from '@/lib/google-oauth'
import { addToDirty, addTombstone, removeFromDirty, removeTombstone, queueDepth } from '@/lib/sync-queue'
import type { PendingDeleteSync } from '@/types'

export type GoogleCalendarSyncContext = Omit<SyncItemContext, 'accessToken'>

export interface GoogleCalendarSyncStateSnapshot {
  syncEnabled: boolean
  accessToken: string
  tokenExpiresAt?: number
  calendarId: string
  dirtyItemIds: readonly string[]
  pendingDeleteSync: readonly PendingDeleteSync[]
  items: Item[]
  courses: Record<string, string>
  projects: Record<string, string>
}

export interface GoogleCalendarSyncStorePort {
  getGoogleCalendarSyncState(): GoogleCalendarSyncStateSnapshot
  clearDirtyItem(itemId: string): void
  readdDirtyItem(itemId: string): void
  clearDeleteTombstone(itemId: string): void
  addDeleteTombstone(entry: PendingDeleteSync): void
  setItemGoogleCalendarEventId(itemId: string, googleEventId: string): void
  setLastSyncedAt(ts: number): void
}

export interface GoogleCalendarSyncCoordinatorOptions {
  store: GoogleCalendarSyncStorePort
  getValidAccessToken?: () => Promise<string>
  onTokenExpired?: () => void
  retryDelays?: number[]
}

export interface GoogleCalendarSyncStatusPayload {
  success: true
  syncEnabled: boolean
  queueDepth: number
  lastSyncedAt: number
}

/**
 * Build the sync.getStatus response payload from the current store state.
 * The background reads its own synced store. The settings UI writes the
 * returned lastSyncedAt into its store for an immediate label refresh.
 */
export function buildGoogleCalendarSyncStatus(state: {
  googleCalendar: { syncEnabled: boolean; lastSyncedAt: number }
  dirtyItemIds: readonly string[]
  pendingDeleteSync: readonly PendingDeleteSync[]
}): GoogleCalendarSyncStatusPayload {
  return {
    success: true,
    syncEnabled: state.googleCalendar.syncEnabled,
    queueDepth: queueDepth(state.dirtyItemIds, state.pendingDeleteSync),
    lastSyncedAt: state.googleCalendar.lastSyncedAt,
  }
}

type StoreLike = {
  dirtyItemIds: string[]
  pendingDeleteSync: PendingDeleteSync[]
  googleCalendar: {
    syncEnabled: boolean
    accessToken?: string
    tokenExpiresAt?: number
    calendarId?: string
    lastSyncedAt: number
  }
  items: Item[]
  courses: Array<{ id: string; title: string }>
  projects: Array<{ id: string; title: string }>
}

/**
 * Wire a valtio store proxy into the Google Calendar Sync store port.
 * Callers pass the store instance. This factory does not import the store singleton.
 */
export function createGoogleCalendarSyncStorePort(store: StoreLike): GoogleCalendarSyncStorePort {
  return {
    getGoogleCalendarSyncState(): GoogleCalendarSyncStateSnapshot {
      return {
        syncEnabled: store.googleCalendar.syncEnabled,
        accessToken: store.googleCalendar.accessToken ?? '',
        tokenExpiresAt: store.googleCalendar.tokenExpiresAt,
        calendarId: store.googleCalendar.calendarId ?? '',
        dirtyItemIds: store.dirtyItemIds,
        pendingDeleteSync: store.pendingDeleteSync,
        items: store.items as Item[],
        courses: Object.fromEntries(store.courses.map(c => [c.id, c.title])),
        projects: Object.fromEntries(store.projects.map(p => [p.id, p.title])),
      }
    },
    clearDirtyItem(itemId: string) {
      store.dirtyItemIds = removeFromDirty(store.dirtyItemIds, itemId)
    },
    readdDirtyItem(itemId: string) {
      store.dirtyItemIds = addToDirty(store.dirtyItemIds, itemId)
    },
    clearDeleteTombstone(itemId: string) {
      store.pendingDeleteSync = removeTombstone(store.pendingDeleteSync, itemId)
    },
    addDeleteTombstone(entry: PendingDeleteSync) {
      store.pendingDeleteSync = addTombstone(store.pendingDeleteSync, entry)
    },
    setItemGoogleCalendarEventId(itemId: string, googleEventId: string) {
      const item = store.items.find(i => i.id === itemId)
      if (item) {
        ;(item as Item & { googleCalendarEventId?: string }).googleCalendarEventId = googleEventId
      }
    },
    setLastSyncedAt(ts: number) {
      store.googleCalendar.lastSyncedAt = ts
    },
  }
}

/**
 * Orchestrates Google Calendar Sync: real-time Item sync, queue transitions,
 * tombstone lifecycle, periodic drain, and bulk/fetch operations.
 */
export class GoogleCalendarSyncCoordinator {
  private api: GoogleCalendarSync
  private store: GoogleCalendarSyncStorePort
  private onTokenExpired?: () => void

  constructor(options: GoogleCalendarSyncCoordinatorOptions) {
    this.store = options.store
    this.onTokenExpired = options.onTokenExpired
    this.api = new GoogleCalendarSync(options.retryDelays ?? [1000, 2000, 4000], options.getValidAccessToken)
  }

  async syncItem(item: Item, ctx: GoogleCalendarSyncContext): Promise<GoogleCalendarSyncResult> {
    // Clear the dirty flag before the API call so the periodic alarm does
    // not double-sync this item. Re-add on failure for retry.
    this.store.clearDirtyItem(item.id)
    const result = await this.api.syncItem(item, this.buildFullContext(ctx))
    if (!result.success) {
      this.store.readdDirtyItem(item.id)
    }
    return result
  }

  async deleteItem(item: Item, ctx: GoogleCalendarSyncContext): Promise<GoogleCalendarSyncResult> {
    const googleCalendarEventId = (item as { googleCalendarEventId?: string }).googleCalendarEventId
    // Queue a tombstone before the item is removed so the background can
    // retry the Google delete if the real-time one fails.
    if (googleCalendarEventId) {
      this.store.addDeleteTombstone({ itemId: item.id, googleCalendarEventId })
    }
    const result = await this.api.deleteItem(item, this.buildFullContext(ctx))
    if (result.success) {
      this.store.clearDeleteTombstone(item.id)
    }
    return result
  }

  /**
   * Periodic sync backstop. Runs when the browser alarm fires (extension) or
   * the web-mode interval ticks (web). The background has no DOM, so it cannot
   * refresh the Google token: when the token is expired it skips sync and
   * notifies the UI to refresh.
   */
  async drainQueue(options: { force?: boolean } = {}): Promise<void> {
    const state = this.store.getGoogleCalendarSyncState()

    if (!state.syncEnabled) {
      return
    }

    const hasWork = state.dirtyItemIds.length > 0 || state.pendingDeleteSync.length > 0
    if (!hasWork && !options.force) {
      return
    }

    if (googleOAuthManager.isTokenExpired(state.tokenExpiresAt ?? 0)) {
      this.onTokenExpired?.()
      return
    }

    const ctx: SyncItemContext = {
      accessToken: state.accessToken,
      calendarId: state.calendarId,
      syncEnabled: state.syncEnabled,
      courses: state.courses,
      projects: state.projects,
    }

    let anySuccess = false

    for (const itemId of state.dirtyItemIds) {
      this.store.clearDirtyItem(itemId)
      const item = state.items.find(i => i.id === itemId)

      if (!item) {
        continue
      }

      const result = await this.api.syncItem(item, ctx)

      if (result.success) {
        anySuccess = true
        if (result.googleEventId) {
          this.store.setItemGoogleCalendarEventId(itemId, result.googleEventId)
        }
      } else if (item.type !== 'timetable') {
        console.error('Periodic sync failed for item:', itemId, result)
        this.store.readdDirtyItem(itemId)
      }
    }

    for (const tombstone of state.pendingDeleteSync) {
      const result = await this.api.deleteEvent(tombstone.googleCalendarEventId, state.accessToken, state.calendarId)

      if (result.success) {
        anySuccess = true
        this.store.clearDeleteTombstone(tombstone.itemId)
      } else {
        console.error('Periodic sync delete failed for item:', tombstone.itemId, result.error)
      }
    }

    if (anySuccess || (options.force && !hasWork)) {
      this.store.setLastSyncedAt(Date.now())
    }
  }

  bulkSyncItems(
    items: Item[],
    ctx: GoogleCalendarSyncContext,
    onProgress?: (current: number, total: number) => void,
  ): Promise<{ success: number; failed: number; errors: string[]; updatedEventIds: Map<string, string> }> {
    return this.api.bulkSyncItems(items, this.buildFullContext(ctx), onProgress)
  }

  fetchCalendars(tokenOverride?: string): Promise<Array<{ id: string; summary: string }> | null> {
    const token = tokenOverride ?? this.store.getGoogleCalendarSyncState().accessToken
    return this.api.fetchCalendars(token)
  }

  fetchEventsFromCalendar(calendarId: string, timeMin?: Date, tokenOverride?: string): Promise<any[]> {
    const token = tokenOverride ?? this.store.getGoogleCalendarSyncState().accessToken
    return this.api.fetchEventsFromCalendar(token, calendarId, timeMin)
  }

  private buildFullContext(ctx: GoogleCalendarSyncContext): SyncItemContext {
    const accessToken = this.store.getGoogleCalendarSyncState().accessToken
    return { ...ctx, accessToken }
  }
}
