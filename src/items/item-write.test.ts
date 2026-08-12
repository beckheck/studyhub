import { describe, it, expect, vi } from 'vite-plus/test'
import { needsGoogleSync, saveItem, updateItemFields, deleteItem, type ItemSync } from './item-write'
import type { Item } from '@/items/models'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemEvent } from '@/items/event/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ExamGrade } from '@/types'
import type { SyncItemContext, GoogleCalendarSyncResult } from '@/lib/google-calendar-sync'

const CTX: SyncItemContext = {
  accessToken: 'token-1',
  calendarId: 'cal-1',
  syncEnabled: true,
  courses: { 'course-1': 'Calculus' },
  projects: { 'project-1': 'Robotics' },
}

type SyncFn = (item: Item, ctx: SyncItemContext) => Promise<GoogleCalendarSyncResult>

function okSync(): ReturnType<typeof vi.fn> {
  return vi.fn(async (): Promise<GoogleCalendarSyncResult> => ({ success: true, googleEventId: 'gcal-new' }))
}

function okDelete(): ReturnType<typeof vi.fn> {
  return vi.fn(async (): Promise<GoogleCalendarSyncResult> => ({ success: true }))
}

function syncWith(syncItem: ReturnType<typeof vi.fn>, deleteItem: ReturnType<typeof vi.fn> = okDelete()): ItemSync {
  return { syncItem: syncItem as unknown as SyncFn, deleteItem: deleteItem as unknown as SyncFn }
}

function makeTaskDraft(overrides: Partial<ItemTask> = {}): Omit<ItemTask, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: 'task',
    title: 'Test Task',
    courseId: 'course-1',
    isDeleted: false,
    dueAt: new Date('2024-01-10T23:59:00.000Z'),
    priority: 'medium',
    isCompleted: false,
    ...overrides,
  } as Omit<ItemTask, 'id' | 'createdAt' | 'updatedAt'>
}

function makeEventDraft(overrides: Partial<ItemEvent> = {}): Omit<ItemEvent, 'id' | 'createdAt' | 'updatedAt'> {
  return {
    type: 'event',
    title: 'Test Event',
    courseId: 'course-1',
    isDeleted: false,
    startsAt: new Date('2024-01-10T14:00:00.000Z'),
    endsAt: new Date('2024-01-10T15:00:00.000Z'),
    isAllDay: false,
    ...overrides,
  } as Omit<ItemEvent, 'id' | 'createdAt' | 'updatedAt'>
}

function makeTask(overrides: Partial<ItemTask> = {}): ItemTask {
  return {
    id: 'task-1',
    type: 'task',
    title: 'Test Task',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    dueAt: new Date('2024-01-10T23:59:00.000Z'),
    priority: 'medium',
    isCompleted: false,
    ...overrides,
  } as ItemTask
}

function makeEvent(overrides: Partial<ItemEvent> = {}): ItemEvent {
  return {
    id: 'evt-1',
    type: 'event',
    title: 'Test Event',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    startsAt: new Date('2024-01-10T14:00:00.000Z'),
    endsAt: new Date('2024-01-10T15:00:00.000Z'),
    isAllDay: false,
    ...overrides,
  } as ItemEvent
}

function makeExam(overrides: Partial<ItemExam> = {}): ItemExam {
  return {
    id: 'exam-1',
    type: 'exam',
    title: 'Test Exam',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    startsAt: new Date('2024-01-10T09:00:00.000Z'),
    weight: 30,
    isCompleted: false,
    ...overrides,
  } as ItemExam
}

function makeGrade(examId: string, grade: number): ExamGrade {
  return { examId, grade }
}

describe('needsGoogleSync', () => {
  it('returns true for a patch touching startsAt', () => {
    const patch = { startsAt: new Date('2024-02-01T10:00:00.000Z') } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(true)
  })

  it('returns true for a patch touching dueAt', () => {
    const patch = { dueAt: new Date('2024-02-01T23:59:00.000Z') } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(true)
  })

  it('returns true for a patch touching notes', () => {
    const patch = { notes: 'updated notes' } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(true)
  })

  it('returns true for a patch touching title', () => {
    const patch = { title: 'New title' } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(true)
  })

  it('returns true for a patch touching endsAt', () => {
    const patch = { endsAt: new Date('2024-02-01T11:00:00.000Z') } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(true)
  })

  it('returns false for a patch touching only isCompleted', () => {
    const patch = { isCompleted: true } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(false)
  })

  it('returns false for a patch touching only googleCalendarEventId (the stamp)', () => {
    const patch = { googleCalendarEventId: 'gcal-123' } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(false)
  })

  it('returns false for a patch touching only color', () => {
    const patch = { color: '#ff0000' } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(false)
  })

  it('returns false for an empty patch', () => {
    expect(needsGoogleSync({})).toBe(false)
  })

  it('returns true when a syncable key sits alongside excluded keys', () => {
    const patch = { isCompleted: true, notes: 'changed' } as Partial<Item>
    expect(needsGoogleSync(patch)).toBe(true)
  })
})

describe('saveItem', () => {
  it('prepends the new item and calls sync', async () => {
    const syncItem = okSync()
    const draft = makeTaskDraft()

    const { items, item } = await saveItem([], draft, syncWith(syncItem), CTX)

    expect(items).toHaveLength(1)
    expect(items[0]).toBe(item)
    expect(item.id).toBe('test-uuid-123')
    expect(item.title).toBe('Test Task')
    expect(syncItem).toHaveBeenCalledTimes(1)
    expect(syncItem).toHaveBeenCalledWith(item, CTX)
  })

  it('stamps googleCalendarEventId on success', async () => {
    const { item } = await saveItem([], makeEventDraft(), syncWith(okSync()), CTX)

    expect((item as ItemEvent).googleCalendarEventId).toBe('gcal-new')
  })

  it('does not stamp when sync returns skipped', async () => {
    const syncItem = vi.fn(async (): Promise<GoogleCalendarSyncResult> => ({ success: false, skipped: true }))
    const { item } = await saveItem([], makeEventDraft(), syncWith(syncItem), CTX)

    expect((item as ItemEvent).googleCalendarEventId).toBeUndefined()
  })

  it('keeps the item saved and surfaces the error when sync fails, no stamp', async () => {
    const syncItem = vi.fn(async (): Promise<GoogleCalendarSyncResult> => ({ success: false, error: 'boom' }))
    const { items, item, result } = await saveItem([], makeTaskDraft(), syncWith(syncItem), CTX)

    expect(items).toHaveLength(1)
    expect((item as ItemTask).googleCalendarEventId).toBeUndefined()
    expect(result?.error).toBe('boom')
  })

  it('does not mutate the input items array', async () => {
    const items: Item[] = []
    await saveItem(items, makeTaskDraft(), syncWith(okSync()), CTX)
    expect(items).toHaveLength(0)
  })
})

describe('updateItemFields', () => {
  it('merges the patch and syncs when the patch touches startsAt (drag-drop regression)', async () => {
    const syncItem = okSync()
    const event = makeEvent({ googleCalendarEventId: 'gcal-existing' })
    const newStart = new Date('2024-02-10T14:00:00.000Z')
    const newEnd = new Date('2024-02-10T15:00:00.000Z')

    const { item, result } = await updateItemFields(
      [event],
      'evt-1',
      { startsAt: newStart, endsAt: newEnd },
      syncWith(syncItem),
      CTX,
    )

    expect((item as ItemEvent)?.startsAt).toEqual(newStart)
    expect((item as ItemEvent)?.endsAt).toEqual(newEnd)
    expect(syncItem).toHaveBeenCalledTimes(1)
    expect(result?.success).toBe(true)
  })

  it('syncs when the patch touches notes (tooltip edit)', async () => {
    const syncItem = okSync()
    const event = makeEvent({ googleCalendarEventId: 'gcal-existing' })

    const { result } = await updateItemFields([event], 'evt-1', { notes: 'edited' }, syncWith(syncItem), CTX)

    expect(syncItem).toHaveBeenCalledTimes(1)
    expect(result?.success).toBe(true)
  })

  it('syncs when the patch touches dueAt', async () => {
    const syncItem = okSync()
    const task = makeTask({ googleCalendarEventId: 'gcal-existing' })

    const { result } = await updateItemFields(
      [task],
      'task-1',
      { dueAt: new Date('2024-03-01T23:59:00.000Z') },
      syncWith(syncItem),
      CTX,
    )

    expect(syncItem).toHaveBeenCalledTimes(1)
    expect(result?.success).toBe(true)
  })

  it('does not sync when the patch only toggles completion', async () => {
    const syncItem = okSync()
    const task = makeTask({ googleCalendarEventId: 'gcal-existing' })

    const { item, result } = await updateItemFields([task], 'task-1', { isCompleted: true }, syncWith(syncItem), CTX)

    expect((item as ItemTask)?.isCompleted).toBe(true)
    expect(syncItem).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('does not sync when the patch only stamps googleCalendarEventId', async () => {
    const syncItem = okSync()
    const task = makeTask()

    const { result } = await updateItemFields(
      [task],
      'task-1',
      { googleCalendarEventId: 'gcal-xyz' },
      syncWith(syncItem),
      CTX,
    )

    expect(syncItem).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('stamps googleCalendarEventId on success', async () => {
    const event = makeEvent({ googleCalendarEventId: 'gcal-existing' })
    const { item } = await updateItemFields([event], 'evt-1', { notes: 'x' }, syncWith(okSync()), CTX)

    expect((item as ItemEvent)?.googleCalendarEventId).toBe('gcal-new')
  })

  it('stamps a recreated event id after a 404-recreate returns a new id', async () => {
    const syncItem = vi.fn(
      async (): Promise<GoogleCalendarSyncResult> => ({ success: true, googleEventId: 'gcal-recreated' }),
    )
    const event = makeEvent({ googleCalendarEventId: 'gcal-gone' })

    const { item } = await updateItemFields(
      [event],
      'evt-1',
      { startsAt: new Date('2024-02-10T14:00:00.000Z') },
      syncWith(syncItem),
      CTX,
    )

    expect((item as ItemEvent)?.googleCalendarEventId).toBe('gcal-recreated')
  })

  it('preserves the existing id when sync is skipped', async () => {
    const syncItem = vi.fn(async (): Promise<GoogleCalendarSyncResult> => ({ success: false, skipped: true }))
    const event = makeEvent({ googleCalendarEventId: 'gcal-existing' })

    const { item } = await updateItemFields([event], 'evt-1', { notes: 'x' }, syncWith(syncItem), CTX)

    expect((item as ItemEvent)?.googleCalendarEventId).toBe('gcal-existing')
  })

  it('returns null item when the id is not found', async () => {
    const syncItem = okSync()
    const event = makeEvent()

    const { item } = await updateItemFields([event], 'missing', { notes: 'x' }, syncWith(syncItem), CTX)

    expect(item).toBeNull()
    expect(syncItem).not.toHaveBeenCalled()
  })

  it('does not mutate the input items array', async () => {
    const event = makeEvent()
    const items: Item[] = [event]
    await updateItemFields(items, 'evt-1', { notes: 'x' }, syncWith(okSync()), CTX)
    expect(items[0].notes).toBeUndefined()
  })
})

describe('deleteItem', () => {
  it('cascades exam grades when deleting an exam', async () => {
    const exam = makeExam({ id: 'exam-1' })
    const task = makeTask({ id: 'task-1' })
    const items: Item[] = [exam, task]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6), makeGrade('exam-2', 7)]

    const { items: nextItems, examGrades: nextGrades } = await deleteItem(
      items,
      examGrades,
      exam,
      syncWith(okSync()),
      CTX,
    )

    expect(nextItems).toHaveLength(1)
    expect(nextItems[0].id).toBe('task-1')
    expect(nextGrades).toHaveLength(1)
    expect(nextGrades[0].examId).toBe('exam-2')
  })

  it('removes a task without touching exam grades', async () => {
    const task = makeTask({ id: 'task-1' })
    const items: Item[] = [task]
    const examGrades: ExamGrade[] = [makeGrade('exam-9', 5)]

    const { items: nextItems, examGrades: nextGrades } = await deleteItem(
      items,
      examGrades,
      task,
      syncWith(okSync()),
      CTX,
    )

    expect(nextItems).toHaveLength(0)
    expect(nextGrades).toBe(examGrades)
  })

  it('calls sync deleteItem when the item has a googleCalendarEventId', async () => {
    const syncDeleteItem = okDelete()
    const event = makeEvent({ googleCalendarEventId: 'gcal-existing' })

    await deleteItem([event], [], event, syncWith(okSync(), syncDeleteItem), CTX)

    expect(syncDeleteItem).toHaveBeenCalledTimes(1)
    expect(syncDeleteItem).toHaveBeenCalledWith(event, CTX)
  })

  it('skips sync when the item has no googleCalendarEventId', async () => {
    const syncDeleteItem = okDelete()
    const event = makeEvent()

    await deleteItem([event], [], event, syncWith(okSync(), syncDeleteItem), CTX)

    expect(syncDeleteItem).not.toHaveBeenCalled()
  })

  it('keeps the local deletion when sync delete fails and never throws', async () => {
    const syncDeleteItem = vi.fn(async (): Promise<GoogleCalendarSyncResult> => ({ success: false, error: 'gone' }))
    const event = makeEvent({ id: 'evt-1', googleCalendarEventId: 'gcal-existing' })
    const other = makeEvent({ id: 'evt-2', title: 'Other' })

    const { items, result } = await deleteItem([event, other], [], event, syncWith(okSync(), syncDeleteItem), CTX)

    expect(items).toHaveLength(1)
    expect(items[0].id).toBe('evt-2')
    expect(result?.error).toBe('gone')
  })

  it('does not mutate the input arrays', async () => {
    const exam = makeExam({ id: 'exam-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6)]

    await deleteItem(items, examGrades, exam, syncWith(okSync()), CTX)

    expect(items).toHaveLength(1)
    expect(examGrades).toHaveLength(1)
  })
})
