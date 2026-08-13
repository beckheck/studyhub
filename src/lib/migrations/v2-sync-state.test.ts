import { describe, expect, it } from 'vite-plus/test'
import { migrateV2SyncState } from './v2-sync-state'
import type { ExchangeFormatV2 } from '@/lib/data-transfer'

function baseV2(): any {
  return {
    version: '2',
    courses: [],
    sessions: [],
    examGrades: [],
    sessionTasks: [],
    items: [],
    weeklyGoals: [],
    degreePlan: { name: 'Degree Plan', semesters: [], completedCourses: [] },
    wellness: { water: 0, gratitude: '', moodPercentages: {}, hasInteracted: false, monthlyMoods: {}, showWords: true },
    fileAttachments: { files: {}, metadata: {} },
    dashboard: { widgetVisibility: {}, widgetOrder: [], widgetCollapsed: {} },
    settings: {
      selectedCourseId: '',
      soundtrackEmbed: '',
      soundtrackPosition: 'dashboard',
      weather: { apiKey: '', location: { useGeolocation: true, city: '' } },
      focusTimer: {},
      theme: {},
      googleCalendar: {
        syncEnabled: true,
        accessToken: 'token-1',
        calendarId: 'cal-1',
      },
    },
  }
}

describe('migrateV2SyncState', () => {
  it('injects empty dirtyItemIds and pendingDeleteSync for old data', () => {
    const migrated = migrateV2SyncState(baseV2())
    expect(migrated.dirtyItemIds).toEqual([])
    expect(migrated.pendingDeleteSync).toEqual([])
  })

  it('injects syncIntervalMin 5 and lastSyncedAt 0 into existing googleCalendar', () => {
    const migrated = migrateV2SyncState(baseV2())
    expect(migrated.settings?.googleCalendar).toMatchObject({
      syncEnabled: true,
      accessToken: 'token-1',
      calendarId: 'cal-1',
      syncIntervalMin: 5,
      lastSyncedAt: 0,
    })
  })

  it('preserves an existing syncIntervalMin and lastSyncedAt', () => {
    const data = baseV2()
    data.settings.googleCalendar.syncIntervalMin = 15
    data.settings.googleCalendar.lastSyncedAt = 12345

    const migrated = migrateV2SyncState(data)

    expect(migrated.settings?.googleCalendar?.syncIntervalMin).toBe(15)
    expect(migrated.settings?.googleCalendar?.lastSyncedAt).toBe(12345)
  })

  it('injects a default googleCalendar when it is missing entirely', () => {
    const data = baseV2()
    delete data.settings.googleCalendar

    const migrated = migrateV2SyncState(data)

    expect(migrated.settings.googleCalendar).toBeUndefined()
    expect(migrated.dirtyItemIds).toEqual([])
    expect(migrated.pendingDeleteSync).toEqual([])
  })

  it('preserves existing dirtyItemIds and pendingDeleteSync when present', () => {
    const data = baseV2()
    data.dirtyItemIds = ['item-1']
    data.pendingDeleteSync = [{ itemId: 'item-2', googleCalendarEventId: 'gcal-2' }]

    const migrated = migrateV2SyncState(data)

    expect(migrated.dirtyItemIds).toEqual(['item-1'])
    expect(migrated.pendingDeleteSync).toEqual([{ itemId: 'item-2', googleCalendarEventId: 'gcal-2' }])
  })

  it('keeps the exchange format version at 2', () => {
    const migrated = migrateV2SyncState(baseV2()) as ExchangeFormatV2
    expect(migrated.version).toBe('2')
  })
})
