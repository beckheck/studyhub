import type { Item } from '@/items/models'
import type { ExamGrade } from '@/types'
import type { SyncItemContext, GoogleCalendarSyncResult } from '@/lib/google-calendar-sync'
import { uid } from '@/lib/utils'
import { cascadeExamDelete } from '@/lib/item-cascades'

const SYNCABLE_KEYS = new Set([
  'title',
  'notes',
  'courseId',
  'projectId',
  'dueAt',
  'priority',
  'startsAt',
  'endsAt',
  'isAllDay',
  'recurrence',
  'location',
  'weight',
])

export function needsGoogleSync(patch: Partial<Item>): boolean {
  return Object.keys(patch).some(key => SYNCABLE_KEYS.has(key))
}

export interface ItemSync {
  syncItem(item: Item, ctx: SyncItemContext): Promise<GoogleCalendarSyncResult>
  deleteItem(item: Item, ctx: SyncItemContext): Promise<GoogleCalendarSyncResult>
}

export type ItemWriteResult = {
  items: Item[]
  item: Item
  result: GoogleCalendarSyncResult | null
}

export async function saveItem(
  items: Item[],
  draft: Omit<Item, 'id' | 'createdAt' | 'updatedAt'>,
  sync: ItemSync,
  ctx: SyncItemContext,
): Promise<ItemWriteResult> {
  const now = new Date()
  const item: Item = {
    ...draft,
    id: uid(),
    createdAt: now,
    updatedAt: now,
  } as Item

  const result = await sync.syncItem(item, ctx)

  if (result.success && result.googleEventId) {
    ;(item as Item & { googleCalendarEventId?: string }).googleCalendarEventId = result.googleEventId
  }

  return { items: [item, ...items], item, result }
}

export type UpdateItemFieldsResult = {
  items: Item[]
  item: Item | null
  result: GoogleCalendarSyncResult | null
}

export async function updateItemFields(
  items: Item[],
  id: string,
  patch: Partial<Item>,
  sync: ItemSync,
  ctx: SyncItemContext,
): Promise<UpdateItemFieldsResult> {
  const index = items.findIndex(item => item.id === id)
  if (index === -1) {
    return { items, item: null, result: null }
  }

  const current = items[index]
  const updated: Item = { ...current, ...patch, updatedAt: new Date() } as Item

  if (!needsGoogleSync(patch)) {
    return { items: replaceAt(items, index, updated), item: updated, result: null }
  }

  const result = await sync.syncItem(updated, ctx)
  if (result.success && result.googleEventId) {
    ;(updated as Item & { googleCalendarEventId?: string }).googleCalendarEventId = result.googleEventId
  }

  return { items: replaceAt(items, index, updated), item: updated, result }
}

function replaceAt(items: Item[], index: number, next: Item): Item[] {
  return items.map((item, i) => (i === index ? next : item))
}

export type DeleteItemResult = {
  items: Item[]
  examGrades: ExamGrade[]
  result: GoogleCalendarSyncResult
}

export async function deleteItem(
  items: Item[],
  examGrades: ExamGrade[],
  item: Item,
  sync: ItemSync,
  ctx: SyncItemContext,
): Promise<DeleteItemResult> {
  let result: GoogleCalendarSyncResult = { success: false, skipped: true }

  if (item.type !== 'timetable' && (item as { googleCalendarEventId?: string }).googleCalendarEventId) {
    try {
      result = await sync.deleteItem(item, ctx)
    } catch (error) {
      console.error('Error deleting from Google Calendar:', error)
      result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  if (item.type === 'exam') {
    const cascaded = cascadeExamDelete(items, examGrades, item.id)
    return { ...cascaded, result }
  }

  return {
    items: items.filter(i => i.id !== item.id),
    examGrades,
    result,
  }
}
