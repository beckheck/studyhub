import type { ExchangeFormatV2 } from '@/lib/data-transfer'

/**
 * Injects the operational queues and extended Google Calendar config that the
 * periodic sync feature adds to AppState.
 *
 * The exchange format version string stays at '2'; the migration runs on
 * every load of version '2' data, injecting defaults for the new fields so
 * updateProxyFromState does not strip them.
 */
export function migrateV2SyncState(data: ExchangeFormatV2): ExchangeFormatV2 {
  const next = { ...data }

  if (!Array.isArray(next.dirtyItemIds)) {
    next.dirtyItemIds = []
  }

  if (!Array.isArray(next.pendingDeleteSync)) {
    next.pendingDeleteSync = []
  }

  const gcal = next.settings?.googleCalendar
  if (gcal) {
    next.settings = {
      ...next.settings,
      googleCalendar: {
        ...gcal,
        syncIntervalMin: gcal.syncIntervalMin ?? 5,
        lastSyncedAt: gcal.lastSyncedAt ?? 0,
      },
    }
  }

  return next
}
