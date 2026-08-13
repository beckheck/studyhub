import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  buildGoogleCalendarSyncStatus,
  GoogleCalendarSyncCoordinator,
  type GoogleCalendarSyncStorePort,
  type GoogleCalendarSyncStateSnapshot,
} from './google-calendar-sync-coordinator'
import type { ItemEvent } from '@/items/event/modelSchema'
import type { Item } from '@/items/models'
import type { PendingDeleteSync } from '@/types'

const NOW = 1640995200000 // 2022-01-01T00:00:00.000Z (global mock)
const TOKEN = 'token-123'
const CAL_ID = 'cal-1'

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

function okResponse(id = 'g-created'): any {
  return { ok: true, status: 200, json: async () => ({ id }) }
}

function errorResponse(message = 'API error'): any {
  return { ok: false, status: 400, json: async () => ({ error: { message } }) }
}

function makeState(overrides: Partial<GoogleCalendarSyncStateSnapshot> = {}): GoogleCalendarSyncStateSnapshot {
  return {
    syncEnabled: true,
    accessToken: TOKEN,
    tokenExpiresAt: NOW + 60 * 60 * 1000,
    calendarId: CAL_ID,
    dirtyItemIds: [],
    pendingDeleteSync: [],
    items: [],
    courses: { 'course-1': 'Calculus' },
    projects: {},
    ...overrides,
  }
}

type GoogleCalendarSyncStoreSpies = {
  clearDirtyItem: ReturnType<typeof vi.fn>
  readdDirtyItem: ReturnType<typeof vi.fn>
  clearDeleteTombstone: ReturnType<typeof vi.fn>
  addDeleteTombstone: ReturnType<typeof vi.fn>
  setItemGoogleCalendarEventId: ReturnType<typeof vi.fn>
  setLastSyncedAt: ReturnType<typeof vi.fn>
}

function makeStorePort(state: GoogleCalendarSyncStateSnapshot): {
  port: GoogleCalendarSyncStorePort
  spies: GoogleCalendarSyncStoreSpies
} {
  let current = state
  const spies: GoogleCalendarSyncStoreSpies = {
    clearDirtyItem: vi.fn((itemId: string) => {
      current = { ...current, dirtyItemIds: current.dirtyItemIds.filter(id => id !== itemId) }
    }),
    readdDirtyItem: vi.fn((itemId: string) => {
      if (!current.dirtyItemIds.includes(itemId)) {
        current = { ...current, dirtyItemIds: [...current.dirtyItemIds, itemId] }
      }
    }),
    clearDeleteTombstone: vi.fn((itemId: string) => {
      current = { ...current, pendingDeleteSync: current.pendingDeleteSync.filter(t => t.itemId !== itemId) }
    }),
    addDeleteTombstone: vi.fn((entry: PendingDeleteSync) => {
      if (!current.pendingDeleteSync.some(t => t.itemId === entry.itemId)) {
        current = { ...current, pendingDeleteSync: [...current.pendingDeleteSync, entry] }
      }
    }),
    setItemGoogleCalendarEventId: vi.fn((itemId: string, googleEventId: string) => {
      current = {
        ...current,
        items: current.items.map(item =>
          item.id === itemId ? ({ ...item, googleCalendarEventId: googleEventId } as Item) : item,
        ),
      }
    }),
    setLastSyncedAt: vi.fn((_ts: number) => {}),
  }
  return {
    port: {
      getGoogleCalendarSyncState: vi.fn(() => current),
      clearDirtyItem: spies.clearDirtyItem,
      readdDirtyItem: spies.readdDirtyItem,
      clearDeleteTombstone: spies.clearDeleteTombstone,
      addDeleteTombstone: spies.addDeleteTombstone,
      setItemGoogleCalendarEventId: spies.setItemGoogleCalendarEventId,
      setLastSyncedAt: spies.setLastSyncedAt,
    } as GoogleCalendarSyncStorePort,
    spies,
  }
}

function makeCoordinator(
  state: GoogleCalendarSyncStateSnapshot,
  options: { onTokenExpired?: () => void } = {},
): { coordinator: GoogleCalendarSyncCoordinator; spies: GoogleCalendarSyncStoreSpies } {
  const { port, spies } = makeStorePort(state)
  const coordinator = new GoogleCalendarSyncCoordinator({
    store: port,
    onTokenExpired: options.onTokenExpired,
    retryDelays: [1, 1],
  })
  return { coordinator, spies }
}

const baseCtx = {
  calendarId: CAL_ID,
  syncEnabled: true,
  courses: { 'course-1': 'Calculus' },
  projects: {},
}

describe('GoogleCalendarSyncCoordinator.drainQueue', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when syncEnabled is false', async () => {
    const { coordinator, spies } = makeCoordinator(makeState({ syncEnabled: false, dirtyItemIds: ['evt-1'] }))
    await coordinator.drainQueue()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('does nothing when both queues are empty', async () => {
    const { coordinator, spies } = makeCoordinator(makeState())
    await coordinator.drainQueue()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('stamps lastSyncedAt on an empty queue when forced', async () => {
    const { coordinator, spies } = makeCoordinator(makeState())
    await coordinator.drainQueue({ force: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).toHaveBeenCalledWith(NOW)
  })

  it('does not stamp when forced but the token is expired', async () => {
    const onTokenExpired = vi.fn()
    const { coordinator, spies } = makeCoordinator(makeState({ tokenExpiresAt: NOW - 1000 }), { onTokenExpired })
    await coordinator.drainQueue({ force: true })
    expect(onTokenExpired).toHaveBeenCalledTimes(1)
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('does not stamp when forced but pending work fails', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({ dirtyItemIds: ['evt-1'], items: [makeEvent({ id: 'evt-1' })] }),
    )
    fetchMock.mockResolvedValue(errorResponse('Forbidden'))
    await coordinator.drainQueue({ force: true })
    expect(spies.readdDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('does not broadcast token expiry when queues are empty', async () => {
    const onTokenExpired = vi.fn()
    const { coordinator } = makeCoordinator(makeState({ tokenExpiresAt: NOW - 1000 }), { onTokenExpired })
    await coordinator.drainQueue()
    expect(onTokenExpired).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('broadcasts token expiry and skips sync when the token is expired and work is pending', async () => {
    const onTokenExpired = vi.fn()
    const { coordinator, spies } = makeCoordinator(makeState({ tokenExpiresAt: NOW - 1000, dirtyItemIds: ['evt-1'] }), {
      onTokenExpired,
    })
    await coordinator.drainQueue()
    expect(onTokenExpired).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('clears the dirty id before sync and does not re-add on success', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({ dirtyItemIds: ['evt-1'], items: [makeEvent({ id: 'evt-1' })] }),
    )
    fetchMock.mockResolvedValue(okResponse('g-evt-1'))
    await coordinator.drainQueue()
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.readdDirtyItem).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(spies.setLastSyncedAt).toHaveBeenCalledWith(NOW)
  })

  it('stamps googleCalendarEventId on the item when drainQueue creates a Google event', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({ dirtyItemIds: ['evt-1'], items: [makeEvent({ id: 'evt-1' })] }),
    )
    fetchMock.mockResolvedValue(okResponse('g-evt-new'))
    await coordinator.drainQueue()
    expect(spies.setItemGoogleCalendarEventId).toHaveBeenCalledWith('evt-1', 'g-evt-new')
  })

  it('stamps a recreated googleCalendarEventId when the prior Google event was deleted', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({
        dirtyItemIds: ['evt-1'],
        items: [makeEvent({ id: 'evt-1', googleCalendarEventId: 'g-evt-gone' })],
      }),
    )
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: { message: 'Not Found' } }) })
      .mockResolvedValueOnce(okResponse('g-evt-recreated'))
    await coordinator.drainQueue()
    expect(spies.setItemGoogleCalendarEventId).toHaveBeenCalledWith('evt-1', 'g-evt-recreated')
  })

  it('re-adds the dirty id when sync fails', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({ dirtyItemIds: ['evt-1'], items: [makeEvent({ id: 'evt-1' })] }),
    )
    fetchMock.mockResolvedValue(errorResponse('Calendar not found'))
    await coordinator.drainQueue()
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.readdDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('clears a dirty id whose item no longer exists in the store', async () => {
    const { coordinator, spies } = makeCoordinator(makeState({ dirtyItemIds: ['ghost'] }))
    await coordinator.drainQueue()
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('ghost')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('clears a dirty timetable item without re-adding (skipped sync)', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({
        dirtyItemIds: ['tt-1'],
        items: [
          {
            id: 'tt-1',
            type: 'timetable',
            title: 'Lecture',
            courseId: 'course-1',
            isDeleted: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            blockId: '2',
            weekday: 1,
            activityType: 'lecture',
          } as unknown as Item,
        ],
      }),
    )
    await coordinator.drainQueue()
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('tt-1')
    expect(spies.readdDirtyItem).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('re-adds a skipped non-timetable item (e.g. missing access token) for the next cycle', async () => {
    const { coordinator, spies } = makeCoordinator(
      makeState({
        accessToken: '',
        dirtyItemIds: ['evt-1'],
        items: [makeEvent({ id: 'evt-1' })],
      }),
    )
    await coordinator.drainQueue()
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.readdDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('deletes the Google event for a tombstone and clears it on success', async () => {
    const tombstone: PendingDeleteSync = { itemId: 'evt-1', googleCalendarEventId: 'g-evt-1' }
    const { coordinator, spies } = makeCoordinator(makeState({ pendingDeleteSync: [tombstone] }))
    fetchMock.mockResolvedValue(okResponse())
    await coordinator.drainQueue()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(spies.clearDeleteTombstone).toHaveBeenCalledWith('evt-1')
    expect(spies.setLastSyncedAt).toHaveBeenCalled()
  })

  it('leaves a tombstone queued when the delete fails', async () => {
    const tombstone: PendingDeleteSync = { itemId: 'evt-1', googleCalendarEventId: 'g-evt-1' }
    const { coordinator, spies } = makeCoordinator(makeState({ pendingDeleteSync: [tombstone] }))
    fetchMock.mockResolvedValue(errorResponse('Forbidden'))
    await coordinator.drainQueue()
    expect(spies.clearDeleteTombstone).not.toHaveBeenCalled()
    expect(spies.setLastSyncedAt).not.toHaveBeenCalled()
  })

  it('processes dirty items and tombstones in one pass', async () => {
    const tombstone: PendingDeleteSync = { itemId: 'evt-2', googleCalendarEventId: 'g-evt-2' }
    const { coordinator, spies } = makeCoordinator(
      makeState({
        dirtyItemIds: ['evt-1'],
        pendingDeleteSync: [tombstone],
        items: [makeEvent({ id: 'evt-1' })],
      }),
    )
    fetchMock.mockResolvedValue(okResponse('g-evt-1'))
    await coordinator.drainQueue()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.clearDeleteTombstone).toHaveBeenCalledWith('evt-2')
    expect(spies.setLastSyncedAt).toHaveBeenCalled()
  })
})

describe('GoogleCalendarSyncCoordinator real-time sync', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('clears dirty before syncItem and does not re-add on success', async () => {
    const { coordinator, spies } = makeCoordinator(makeState())
    fetchMock.mockResolvedValue(okResponse('g-new'))
    const item = makeEvent()
    const result = await coordinator.syncItem(item, baseCtx)
    expect(result.success).toBe(true)
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.readdDirtyItem).not.toHaveBeenCalled()
  })

  it('re-adds dirty item when syncItem fails', async () => {
    const { coordinator, spies } = makeCoordinator(makeState())
    fetchMock.mockResolvedValue(errorResponse('Server error'))
    const item = makeEvent()
    const result = await coordinator.syncItem(item, baseCtx)
    expect(result.success).toBe(false)
    expect(spies.clearDirtyItem).toHaveBeenCalledWith('evt-1')
    expect(spies.readdDirtyItem).toHaveBeenCalledWith('evt-1')
  })

  it('adds tombstone before deleteItem and clears on success', async () => {
    const { coordinator, spies } = makeCoordinator(makeState())
    fetchMock.mockResolvedValue(okResponse())
    const item = makeEvent({ googleCalendarEventId: 'g-evt-1' })
    const result = await coordinator.deleteItem(item, baseCtx)
    expect(result.success).toBe(true)
    expect(spies.addDeleteTombstone).toHaveBeenCalledWith({ itemId: 'evt-1', googleCalendarEventId: 'g-evt-1' })
    expect(spies.clearDeleteTombstone).toHaveBeenCalledWith('evt-1')
  })

  it('keeps tombstone when deleteItem fails', async () => {
    const { coordinator, spies } = makeCoordinator(makeState())
    fetchMock.mockResolvedValue(errorResponse('Forbidden'))
    const item = makeEvent({ googleCalendarEventId: 'g-evt-1' })
    const result = await coordinator.deleteItem(item, baseCtx)
    expect(result.success).toBe(false)
    expect(spies.addDeleteTombstone).toHaveBeenCalledWith({ itemId: 'evt-1', googleCalendarEventId: 'g-evt-1' })
    expect(spies.clearDeleteTombstone).not.toHaveBeenCalled()
  })
})

describe('buildGoogleCalendarSyncStatus', () => {
  it('reports queue depth and last synced timestamp', () => {
    const status = buildGoogleCalendarSyncStatus({
      googleCalendar: { syncEnabled: true, lastSyncedAt: 1234 },
      dirtyItemIds: ['a', 'b'],
      pendingDeleteSync: [{ itemId: 'c', googleCalendarEventId: 'g-c' }],
    })
    expect(status).toEqual({ success: true, syncEnabled: true, queueDepth: 3, lastSyncedAt: 1234 })
  })

  it('reports zero depth when both queues are empty', () => {
    const status = buildGoogleCalendarSyncStatus({
      googleCalendar: { syncEnabled: false, lastSyncedAt: 0 },
      dirtyItemIds: [],
      pendingDeleteSync: [],
    })
    expect(status).toEqual({ success: true, syncEnabled: false, queueDepth: 0, lastSyncedAt: 0 })
  })
})
