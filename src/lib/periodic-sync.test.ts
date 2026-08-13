import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { buildSyncStatus, runPeriodicSync, type PeriodicSyncDeps } from './periodic-sync'
import { GoogleCalendarSync } from './google-calendar-sync'
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

function makeDeps(overrides: Partial<PeriodicSyncDeps> = {}): PeriodicSyncDeps {
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
    sync: new GoogleCalendarSync([1, 1]),
    onDirtyCleared: vi.fn(),
    onDirtyReadded: vi.fn(),
    onTombstoneCleared: vi.fn(),
    onLastSyncedAt: vi.fn(),
    onTokenExpired: vi.fn(),
    ...overrides,
  }
}

describe('runPeriodicSync', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('does nothing when syncEnabled is false', async () => {
    const deps = makeDeps({ syncEnabled: false, dirtyItemIds: ['evt-1'] })
    await runPeriodicSync(deps)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
    expect(deps.onTokenExpired).not.toHaveBeenCalled()
  })

  it('does nothing when both queues are empty', async () => {
    const deps = makeDeps()
    await runPeriodicSync(deps)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
    expect(deps.onTokenExpired).not.toHaveBeenCalled()
  })

  it('stamps lastSyncedAt on an empty queue when forced', async () => {
    const deps = makeDeps()
    await runPeriodicSync(deps, { force: true })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onTokenExpired).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).toHaveBeenCalledWith(NOW)
  })

  it('does not stamp when forced but the token is expired', async () => {
    const deps = makeDeps({ tokenExpiresAt: NOW - 1000 })
    await runPeriodicSync(deps, { force: true })
    expect(deps.onTokenExpired).toHaveBeenCalledTimes(1)
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('does not stamp when forced but pending work fails', async () => {
    const deps = makeDeps({
      dirtyItemIds: ['evt-1'],
      items: [makeEvent({ id: 'evt-1' })],
    })

    fetchMock.mockResolvedValue(errorResponse('Forbidden'))

    await runPeriodicSync(deps, { force: true })

    expect(deps.onDirtyReadded).toHaveBeenCalledWith('evt-1')
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('does not broadcast token expiry when queues are empty', async () => {
    const deps = makeDeps({ tokenExpiresAt: NOW - 1000 })
    await runPeriodicSync(deps)
    expect(deps.onTokenExpired).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('broadcasts token expiry and skips sync when the token is expired and work is pending', async () => {
    const deps = makeDeps({ tokenExpiresAt: NOW - 1000, dirtyItemIds: ['evt-1'] })
    await runPeriodicSync(deps)
    expect(deps.onTokenExpired).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('clears the dirty id before sync and does not re-add on success', async () => {
    const sync = new GoogleCalendarSync([1, 1])
    const clearSpy = vi.fn()
    const readdSpy = vi.fn()
    const deps = makeDeps({
      dirtyItemIds: ['evt-1'],
      items: [makeEvent({ id: 'evt-1' })],
      sync,
      onDirtyCleared: clearSpy,
      onDirtyReadded: readdSpy,
    })

    fetchMock.mockResolvedValue(okResponse('g-evt-1'))

    await runPeriodicSync(deps)

    expect(clearSpy).toHaveBeenCalledWith('evt-1')
    expect(readdSpy).not.toHaveBeenCalled()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(deps.onLastSyncedAt).toHaveBeenCalledWith(NOW)
  })

  it('re-adds the dirty id when sync fails', async () => {
    const deps = makeDeps({
      dirtyItemIds: ['evt-1'],
      items: [makeEvent({ id: 'evt-1' })],
    })

    fetchMock.mockResolvedValue(errorResponse('Calendar not found'))

    await runPeriodicSync(deps)

    expect(deps.onDirtyCleared).toHaveBeenCalledWith('evt-1')
    expect(deps.onDirtyReadded).toHaveBeenCalledWith('evt-1')
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('clears a dirty id whose item no longer exists in the store', async () => {
    const deps = makeDeps({ dirtyItemIds: ['ghost'] })
    await runPeriodicSync(deps)
    expect(deps.onDirtyCleared).toHaveBeenCalledWith('ghost')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('clears a dirty timetable item without re-adding (skipped sync)', async () => {
    const deps = makeDeps({
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
    })

    await runPeriodicSync(deps)

    expect(deps.onDirtyCleared).toHaveBeenCalledWith('tt-1')
    expect(deps.onDirtyReadded).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('re-adds a skipped non-timetable item (e.g. missing access token) for the next cycle', async () => {
    const deps = makeDeps({
      accessToken: '',
      dirtyItemIds: ['evt-1'],
      items: [makeEvent({ id: 'evt-1' })],
    })

    await runPeriodicSync(deps)

    expect(deps.onDirtyCleared).toHaveBeenCalledWith('evt-1')
    expect(deps.onDirtyReadded).toHaveBeenCalledWith('evt-1')
    expect(fetchMock).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('deletes the Google event for a tombstone and clears it on success', async () => {
    const tombstone: PendingDeleteSync = { itemId: 'evt-1', googleCalendarEventId: 'g-evt-1' }
    const deps = makeDeps({ pendingDeleteSync: [tombstone] })

    fetchMock.mockResolvedValue(okResponse())

    await runPeriodicSync(deps)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(deps.onTombstoneCleared).toHaveBeenCalledWith('evt-1')
    expect(deps.onLastSyncedAt).toHaveBeenCalled()
  })

  it('leaves a tombstone queued when the delete fails', async () => {
    const tombstone: PendingDeleteSync = { itemId: 'evt-1', googleCalendarEventId: 'g-evt-1' }
    const deps = makeDeps({ pendingDeleteSync: [tombstone] })

    fetchMock.mockResolvedValue(errorResponse('Forbidden'))

    await runPeriodicSync(deps)

    expect(deps.onTombstoneCleared).not.toHaveBeenCalled()
    expect(deps.onLastSyncedAt).not.toHaveBeenCalled()
  })

  it('processes dirty items and tombstones in one pass', async () => {
    const tombstone: PendingDeleteSync = { itemId: 'evt-2', googleCalendarEventId: 'g-evt-2' }
    const deps = makeDeps({
      dirtyItemIds: ['evt-1'],
      pendingDeleteSync: [tombstone],
      items: [makeEvent({ id: 'evt-1' })],
    })

    fetchMock.mockResolvedValue(okResponse('g-evt-1'))

    await runPeriodicSync(deps)

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(deps.onDirtyCleared).toHaveBeenCalledWith('evt-1')
    expect(deps.onTombstoneCleared).toHaveBeenCalledWith('evt-2')
    expect(deps.onLastSyncedAt).toHaveBeenCalled()
  })
})

describe('buildSyncStatus', () => {
  it('reports queue depth and last synced timestamp', () => {
    const status = buildSyncStatus({
      googleCalendar: { syncEnabled: true, lastSyncedAt: 1234 },
      dirtyItemIds: ['a', 'b'],
      pendingDeleteSync: [{ itemId: 'c', googleCalendarEventId: 'g-c' }],
    })
    expect(status).toEqual({ success: true, syncEnabled: true, queueDepth: 3, lastSyncedAt: 1234 })
  })

  it('reports zero depth when both queues are empty', () => {
    const status = buildSyncStatus({
      googleCalendar: { syncEnabled: false, lastSyncedAt: 0 },
      dirtyItemIds: [],
      pendingDeleteSync: [],
    })
    expect(status).toEqual({ success: true, syncEnabled: false, queueDepth: 0, lastSyncedAt: 0 })
  })
})
