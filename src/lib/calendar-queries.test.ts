import { describe, it, expect, beforeEach, vi } from 'vite-plus/test'
import { getItemsInRange, getItemsOnDate, entriesOnDate } from './calendar-queries'
import type { Item } from '@/items/models'
import type { ItemEvent } from '@/items/event/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'

const REAL_NOW = Date.now

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

describe('calendar-queries', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    Date.now = REAL_NOW
  })

  describe('getItemsOnDate', () => {
    it('returns a one-off task on its dueAt date', () => {
      const task = makeTask()
      const date = new Date('2024-01-10T12:00:00.000Z')
      const entries = getItemsOnDate([task], date)
      expect(entries).toHaveLength(1)
      expect(entries[0].item.id).toBe('task-1')
      expect(entries[0].startsAt).toEqual(task.dueAt)
    })

    it('returns a one-off exam on its startsAt date', () => {
      const exam = makeExam()
      const date = new Date('2024-01-10T12:00:00.000Z')
      const entries = getItemsOnDate([exam], date)
      expect(entries).toHaveLength(1)
      expect(entries[0].item.id).toBe('exam-1')
      expect(entries[0].startsAt).toEqual(exam.startsAt)
    })

    it('returns a one-off event on its startsAt date', () => {
      const event = makeEvent()
      const date = new Date('2024-01-10T14:00:00.000Z')
      const entries = getItemsOnDate([event], date)
      expect(entries).toHaveLength(1)
      expect(entries[0].item.id).toBe('evt-1')
      expect(entries[0].startsAt).toEqual(event.startsAt)
      expect(entries[0].endsAt).toEqual(event.endsAt)
    })

    it('does not return the task on a different date', () => {
      const task = makeTask()
      const date = new Date('2024-01-11T12:00:00.000Z')
      const entries = getItemsOnDate([task], date)
      expect(entries).toHaveLength(0)
    })

    it('returns a completed task (view filters it)', () => {
      const task = makeTask({ isCompleted: true })
      const date = new Date('2024-01-10T12:00:00.000Z')
      const entries = getItemsOnDate([task], date)
      expect(entries).toHaveLength(1)
    })

    it('excludes timetable items', () => {
      const timetable = {
        id: 'tt-1',
        type: 'timetable',
        title: 'Lecture',
        courseId: 'c1',
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      const date = new Date('2024-01-10T12:00:00.000Z')
      const entries = getItemsOnDate([timetable as unknown as Item], date)
      expect(entries).toHaveLength(0)
    })

    it('excludes soft-deleted items', () => {
      const task = makeTask({ isDeleted: true })
      const date = new Date('2024-01-10T12:00:00.000Z')
      const entries = getItemsOnDate([task], date)
      expect(entries).toHaveLength(0)
    })

    it('delegates to getItemsInRange (same results for a single date)', () => {
      const event = makeEvent()
      const date = new Date('2024-01-10T14:00:00.000Z')
      const onDate = getItemsOnDate([event], date)
      const inRange = getItemsInRange(
        [event],
        new Date('2024-01-10T00:00:00.000Z'),
        new Date('2024-01-10T23:59:59.999Z'),
      )
      expect(onDate).toHaveLength(inRange.length)
      expect(onDate[0].item.id).toBe(inRange[0].item.id)
    })
  })

  describe('getItemsInRange', () => {
    const rangeStart = new Date('2024-01-01T00:00:00.000Z')
    const rangeEnd = new Date('2024-01-31T23:59:59.999Z')

    it('returns a multi-day event (Fri-Sun) on each day Fri, Sat, Sun', () => {
      const event = makeEvent({
        startsAt: new Date('2024-01-12T10:00:00.000Z'),
        endsAt: new Date('2024-01-14T10:00:00.000Z'),
      })
      const entries = getItemsInRange([event], rangeStart, rangeEnd)
      expect(entries).toHaveLength(3)
      const dates = entries.map(e => e.date.toISOString().split('T')[0])
      expect(dates).toEqual(['2024-01-12', '2024-01-13', '2024-01-14'])
      for (const e of entries) {
        expect(e.startsAt).toEqual(event.startsAt)
        expect(e.endsAt).toEqual(event.endsAt)
      }
    })

    it('returns a weekly recurring event with count:4 on 4 consecutive Wednesdays', () => {
      const event = makeEvent({
        startsAt: new Date('2024-01-03T14:00:00.000Z'),
        endsAt: new Date('2024-01-03T15:00:00.000Z'),
        recurrence: {
          frequency: 'weekly',
          interval: 1,
          byWeekday: [3],
          count: 4,
        },
      })
      const entries = getItemsInRange([event], rangeStart, rangeEnd)
      const dates = entries.map(e => e.date.toISOString().split('T')[0])
      expect(dates).toEqual(['2024-01-03', '2024-01-10', '2024-01-17', '2024-01-24'])
      expect(entries).toHaveLength(4)
      for (const e of entries) {
        expect(e.endsAt).toBeDefined()
        expect(e.sequence).toBeGreaterThanOrEqual(1)
      }
      expect(entries[0].sequence).toBe(1)
      expect(entries[1].sequence).toBe(2)
      expect(entries[2].sequence).toBe(3)
      expect(entries[3].sequence).toBe(4)
    })

    it('does not return a recurring event occurrence after its until date', () => {
      const event = makeEvent({
        startsAt: new Date('2024-01-03T14:00:00.000Z'),
        endsAt: new Date('2024-01-03T15:00:00.000Z'),
        recurrence: {
          frequency: 'daily',
          interval: 1,
          until: new Date('2024-01-05T00:00:00.000Z'),
        },
      })
      const entries = getItemsInRange([event], rangeStart, rangeEnd)
      const dates = entries.map(e => e.date.toISOString().split('T')[0])
      expect(dates).toEqual(['2024-01-03', '2024-01-04'])
      expect(dates).not.toContain('2024-01-05')
      expect(dates).not.toContain('2024-01-06')
    })

    it('returns a recurring event once on startsAt when expandRecurrence is false', () => {
      const event = makeEvent({
        startsAt: new Date('2024-01-03T14:00:00.000Z'),
        endsAt: new Date('2024-01-03T15:00:00.000Z'),
        recurrence: {
          frequency: 'daily',
          interval: 1,
          count: 10,
        },
      })
      const entries = getItemsInRange([event], rangeStart, rangeEnd, { expandRecurrence: false })
      expect(entries).toHaveLength(1)
      expect(entries[0].sequence).toBeUndefined()
    })

    it('filters by courseFilter', () => {
      const task1 = makeTask({ id: 't1', courseId: 'math' })
      const task2 = makeTask({ id: 't2', courseId: 'bio', dueAt: new Date('2024-01-10T10:00:00.000Z') })
      const entries = getItemsInRange([task1, task2], rangeStart, rangeEnd, { courseFilter: 'math' })
      expect(entries).toHaveLength(1)
      expect(entries[0].item.id).toBe('t1')
    })

    it('courseFilter "all" does not filter', () => {
      const task1 = makeTask({ id: 't1', courseId: 'math' })
      const task2 = makeTask({ id: 't2', courseId: 'bio', dueAt: new Date('2024-01-10T10:00:00.000Z') })
      const entries = getItemsInRange([task1, task2], rangeStart, rangeEnd, { courseFilter: 'all' })
      expect(entries).toHaveLength(2)
    })
  })

  describe('entriesOnDate', () => {
    it('groups entries by date from a range query', () => {
      const event = makeEvent({
        startsAt: new Date('2024-01-12T10:00:00.000Z'),
        endsAt: new Date('2024-01-14T10:00:00.000Z'),
      })
      const rangeStart = new Date('2024-01-01T00:00:00.000Z')
      const rangeEnd = new Date('2024-01-31T23:59:59.999Z')
      const all = getItemsInRange([event], rangeStart, rangeEnd)
      const onSat = entriesOnDate(all, new Date('2024-01-13T12:00:00.000Z'))
      expect(onSat).toHaveLength(1)
      const onMon = entriesOnDate(all, new Date('2024-01-15T12:00:00.000Z'))
      expect(onMon).toHaveLength(0)
    })
  })
})
