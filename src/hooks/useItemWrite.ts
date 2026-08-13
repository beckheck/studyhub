import { useAppState, useGoogleCalendar } from './useStore'
import { useGoogleCalendarSync } from './useGoogleCalendarSync'
import {
  saveItem as saveItemCore,
  updateItemFields as updateItemFieldsCore,
  deleteItem as deleteItemCore,
  type ItemSync,
} from '@/items/item-write'
import { store } from '@/stores/app'
import { addToDirty, addTombstone, removeFromDirty, removeTombstone } from '@/lib/sync-queue'
import type { Item } from '@/items/models'
import type { ExamGrade } from '@/types'
import type { SyncItemContext, GoogleCalendarSyncResult } from '@/lib/google-calendar-sync'

type SyncCtxWithoutToken = Omit<SyncItemContext, 'accessToken'>

export function useItemWrite() {
  const { googleCalendar } = useGoogleCalendar()
  const appState = useAppState()
  const { syncItem, deleteItem: syncDeleteItem } = useGoogleCalendarSync()

  const buildCtx = (): SyncItemContext => ({
    accessToken: googleCalendar.accessToken ?? '',
    calendarId: googleCalendar.calendarId ?? '',
    syncEnabled: googleCalendar.syncEnabled,
    courses: Object.fromEntries(appState.courses.map(c => [c.id, c.title])),
    projects: Object.fromEntries(appState.projects.map(p => [p.id, p.title])),
  })

  const adapter: ItemSync = {
    syncItem: (item, ctx) => {
      // Clear the dirty flag before the API call so the periodic alarm does
      // not double-sync this item. Re-add on failure for retry.
      store.dirtyItemIds = removeFromDirty(store.dirtyItemIds, item.id)
      return syncItem(item, ctxWithoutToken(ctx)).then(result => {
        if (!result.success) {
          // Re-add on failure; also track skipped syncs (e.g. sync disabled)
          // so the periodic alarm catches up when sync is re-enabled.
          store.dirtyItemIds = addToDirty(store.dirtyItemIds, item.id)
        }
        return result
      })
    },
    deleteItem: (item, ctx) => {
      const googleCalendarEventId = (item as { googleCalendarEventId?: string }).googleCalendarEventId
      // Queue a tombstone before the item is removed so the background can
      // retry the Google delete if the real-time one fails.
      if (googleCalendarEventId) {
        store.pendingDeleteSync = addTombstone(store.pendingDeleteSync, {
          itemId: item.id,
          googleCalendarEventId,
        })
      }
      return syncDeleteItem(item, ctxWithoutToken(ctx)).then(result => {
        if (result.success) {
          store.pendingDeleteSync = removeTombstone(store.pendingDeleteSync, item.id)
        }
        return result
      })
    },
  }

  function commit(items: Item[], result: GoogleCalendarSyncResult | null) {
    store.items = items as any
    if (result && !result.success && !result.skipped) {
      console.error('Google Calendar sync failed:', result.error)
    }
  }

  async function saveItem(draft: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>) {
    const { items, item, result } = await saveItemCore([...store.items] as Item[], draft, adapter, buildCtx())
    commit(items, result)
    return item
  }

  async function updateItemFields(id: string, patch: Partial<Item>) {
    const { items, item, result } = await updateItemFieldsCore(
      [...store.items] as Item[],
      id,
      patch,
      adapter,
      buildCtx(),
    )
    commit(items, result)
    return item
  }

  async function deleteItem(item: Item) {
    const { items, examGrades, result } = await deleteItemCore(
      [...store.items] as Item[],
      [...(store.examGrades as ExamGrade[])],
      item,
      adapter,
      buildCtx(),
    )
    store.items = items as any
    store.examGrades = examGrades as any
    if (!result.success && !result.skipped) {
      console.error('Google Calendar sync failed:', result.error)
    }
  }

  return { saveItem, updateItemFields, deleteItem }
}

function ctxWithoutToken(ctx: SyncItemContext): SyncCtxWithoutToken {
  const { accessToken: _accessToken, ...rest } = ctx
  return rest
}
