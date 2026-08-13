import type { Item } from '@/items/models'
import type { GoogleCalendarSync, SyncItemContext } from '@/lib/google-calendar-sync'
import { googleOAuthManager } from '@/lib/google-oauth'
import { queueDepth } from '@/lib/sync-queue'
import type { PendingDeleteSync } from '@/types'

export interface PeriodicSyncDeps {
  syncEnabled: boolean
  accessToken: string
  tokenExpiresAt?: number
  calendarId: string
  dirtyItemIds: readonly string[]
  pendingDeleteSync: readonly PendingDeleteSync[]
  items: Item[]
  courses: Record<string, string>
  projects: Record<string, string>
  sync: GoogleCalendarSync
  onDirtyCleared: (itemId: string) => void
  onDirtyReadded: (itemId: string) => void
  onTombstoneCleared: (itemId: string) => void
  onLastSyncedAt: (ts: number) => void
  onTokenExpired: () => void
}

/**
 * Periodic sync backstop. Runs when the browser alarm fires (extension) or
 * the web-mode interval ticks (web). The background has no DOM, so it cannot
 * refresh the Google token: when the token is expired it skips sync and
 * notifies the UI to refresh.
 *
 * Failed items stay in their queue and the next cycle retries. Each item id
 * is cleared from the dirty list before its API call and re-added on failure.
 * Timetable items never sync, so the periodic loop drops them without
 * re-adding.
 *
 * Pass `force: true` (the "Sync now" button) to run even with an empty queue
 * and stamp lastSyncedAt as a completed check. Force never masks failures:
 * pending work still requires at least one successful API call to stamp.
 */
export interface SyncStatusPayload {
  success: true
  syncEnabled: boolean
  queueDepth: number
  lastSyncedAt: number
}

/**
 * Build the sync.getStatus response payload from the current store state.
 * The background reads its own synced store; the settings UI writes the
 * returned lastSyncedAt into its store for an immediate label refresh.
 */
export function buildSyncStatus(state: {
  googleCalendar: { syncEnabled: boolean; lastSyncedAt: number }
  dirtyItemIds: readonly string[]
  pendingDeleteSync: readonly PendingDeleteSync[]
}): SyncStatusPayload {
  return {
    success: true,
    syncEnabled: state.googleCalendar.syncEnabled,
    queueDepth: queueDepth(state.dirtyItemIds, state.pendingDeleteSync),
    lastSyncedAt: state.googleCalendar.lastSyncedAt,
  }
}

export async function runPeriodicSync(deps: PeriodicSyncDeps, options: { force?: boolean } = {}): Promise<void> {
  if (!deps.syncEnabled) {
    return
  }

  const hasWork = deps.dirtyItemIds.length > 0 || deps.pendingDeleteSync.length > 0
  if (!hasWork && !options.force) {
    return
  }

  if (googleOAuthManager.isTokenExpired(deps.tokenExpiresAt ?? 0)) {
    deps.onTokenExpired()
    return
  }

  const ctx: SyncItemContext = {
    accessToken: deps.accessToken,
    calendarId: deps.calendarId,
    syncEnabled: deps.syncEnabled,
    courses: deps.courses,
    projects: deps.projects,
  }

  let anySuccess = false

  for (const itemId of deps.dirtyItemIds) {
    deps.onDirtyCleared(itemId)
    const item = deps.items.find(i => i.id === itemId)

    if (!item) {
      continue
    }

    const result = await deps.sync.syncItem(item, ctx)

    if (result.success) {
      anySuccess = true
    } else if (item.type !== 'timetable') {
      // Re-add failed and skipped (e.g. missing access token or calendar)
      // items so the next cycle retries them. Timetable items never sync.
      console.error('Periodic sync failed for item:', itemId, result)
      deps.onDirtyReadded(itemId)
    }
  }

  for (const tombstone of deps.pendingDeleteSync) {
    const result = await deps.sync.deleteEvent(tombstone.googleCalendarEventId, deps.accessToken, deps.calendarId)

    if (result.success) {
      anySuccess = true
      deps.onTombstoneCleared(tombstone.itemId)
    } else {
      console.error('Periodic sync delete failed for item:', tombstone.itemId, result.error)
    }
  }

  if (anySuccess || (options.force && !hasWork)) {
    deps.onLastSyncedAt(Date.now())
  }
}
