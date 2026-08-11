import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { convertRecurrenceToRRule, GoogleCalendarSync } from './google-calendar-sync'
import type { ItemEvent } from '@/items/event/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemTimetable } from '@/items/timetable/modelSchema'
import type { Item } from '@/items/models'

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

function makeTimetable(overrides: Partial<ItemTimetable> = {}): ItemTimetable {
  return {
    id: 'tt-1',
    type: 'timetable',
    title: 'Lecture',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    blockId: '2',
    weekday: 1,
    activityType: 'lecture',
    ...overrides,
  } as ItemTimetable
}

const CTX = {
  accessToken: 'token-123',
  calendarId: 'cal-1',
  syncEnabled: true,
  courses: { 'course-1': 'Calculus 101' },
  projects: { 'project-1': 'Project X' },
}

const API_BASE = 'https://www.googleapis.com/calendar/v3'

function okResponse(id = 'g-created'): any {
  return { ok: true, status: 200, json: async () => ({ id }) }
}

function errorResponse(message = 'API error'): any {
  return { ok: false, status: 400, json: async () => ({ error: { message } }) }
}

describe('convertRecurrenceToRRule', () => {
  it('emits FREQ only for the base case', () => {
    expect(convertRecurrenceToRRule({ frequency: 'weekly', interval: 1 })).toBe('FREQ=WEEKLY')
  })

  it('emits INTERVAL only when greater than 1', () => {
    expect(convertRecurrenceToRRule({ frequency: 'weekly', interval: 2 })).toBe('FREQ=WEEKLY;INTERVAL=2')
    expect(convertRecurrenceToRRule({ frequency: 'daily', interval: 1 })).toBe('FREQ=DAILY')
  })

  it('maps byWeekday numbers to two-letter days', () => {
    expect(convertRecurrenceToRRule({ frequency: 'weekly', interval: 1, byWeekday: [0, 2, 4] })).toBe(
      'FREQ=WEEKLY;BYDAY=SU,TU,TH',
    )
  })

  it('emits COUNT when present, taking precedence over UNTIL', () => {
    expect(
      convertRecurrenceToRRule({ frequency: 'weekly', interval: 1, count: 4, until: new Date('2024-01-31') }),
    ).toBe('FREQ=WEEKLY;COUNT=4')
  })

  it('formats UNTIL as YYYYMMDD from local date components', () => {
    expect(convertRecurrenceToRRule({ frequency: 'daily', interval: 1, until: new Date('2024-01-31T15:00:00') })).toBe(
      'FREQ=DAILY;UNTIL=20240131',
    )
  })

  it('combines all parts in order', () => {
    expect(convertRecurrenceToRRule({ frequency: 'weekly', interval: 2, byWeekday: [1, 3], count: 6 })).toBe(
      'FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;COUNT=6',
    )
  })
})

describe('GoogleCalendarSync.syncItem', () => {
  let sync: GoogleCalendarSync
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sync = new GoogleCalendarSync([1, 1])
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('guards', () => {
    it('returns skipped when syncEnabled is false, without calling fetch', async () => {
      const result = await sync.syncItem(makeEvent(), { ...CTX, syncEnabled: false })
      expect(result).toEqual({ success: false, skipped: true })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns skipped when accessToken is missing', async () => {
      const result = await sync.syncItem(makeEvent(), { ...CTX, accessToken: '' })
      expect(result).toEqual({ success: false, skipped: true })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns skipped when calendarId is missing', async () => {
      const result = await sync.syncItem(makeEvent(), { ...CTX, calendarId: '' })
      expect(result).toEqual({ success: false, skipped: true })
      expect(fetchMock).not.toHaveBeenCalled()
    })

    it('returns skipped for a timetable item, without calling fetch', async () => {
      const result = await sync.syncItem(makeTimetable(), CTX)
      expect(result).toEqual({ success: false, skipped: true })
      expect(fetchMock).not.toHaveBeenCalled()
    })
  })

  describe('request shape', () => {
    it('POSTs a new event with the converted body', async () => {
      fetchMock.mockResolvedValue(okResponse('g-evt-1'))

      const event = makeEvent({ notes: 'some notes' })
      const result = await sync.syncItem(event, CTX)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${API_BASE}/calendars/cal-1/events`)
      expect(options.method).toBe('POST')
      expect((options.headers as any).Authorization).toBe('Bearer token-123')

      const body = JSON.parse(options.body as string)
      expect(body.summary).toBe('Test Event')
      expect(body.description).toBe('some notes\n\n📌 Type: Event\n📚 Course: Calculus 101')
      expect(body.start).toEqual({ dateTime: event.startsAt.toISOString(), timeZone: expect.any(String) })
      expect(body.end).toEqual({ dateTime: event.endsAt.toISOString(), timeZone: expect.any(String) })
      expect(result).toEqual({ success: true, googleEventId: 'g-evt-1' })
    })

    it('PUTs an existing event to its googleEventId URL', async () => {
      fetchMock.mockResolvedValue(okResponse())

      const event = makeEvent({ googleCalendarEventId: 'g-evt-1' })
      const result = await sync.syncItem(event, CTX)

      expect(fetchMock).toHaveBeenCalledTimes(1)
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${API_BASE}/calendars/cal-1/events/g-evt-1`)
      expect(options.method).toBe('PUT')
      expect(result).toEqual({ success: true, googleEventId: 'g-evt-1' })
    })

    it('falls back to POST on 404 and returns the new event id', async () => {
      fetchMock
        .mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({ error: { message: 'Not Found' } }) })
        .mockResolvedValueOnce(okResponse('g-new-id'))

      const event = makeEvent({ googleCalendarEventId: 'g-deleted', id: 'evt-1' })
      const result = await sync.syncItem(event, CTX)

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/calendars/cal-1/events/g-deleted`)
      expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('PUT')
      expect(fetchMock.mock.calls[1][0]).toBe(`${API_BASE}/calendars/cal-1/events`)
      expect((fetchMock.mock.calls[1][1] as RequestInit).method).toBe('POST')
      expect(result).toEqual({ success: true, googleEventId: 'g-new-id' })
    })

    it('formats all-day events as date only, with end inclusive of the last day', async () => {
      fetchMock.mockResolvedValue(okResponse('g-evt-1'))

      const event = makeEvent({
        isAllDay: true,
        startsAt: new Date(2024, 0, 10, 0, 0, 0),
        endsAt: new Date(2024, 0, 10, 0, 0, 0),
      })
      await sync.syncItem(event, CTX)

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(body.start).toEqual({ date: '2024-01-10' })
      expect(body.end).toEqual({ date: '2024-01-11' })
    })

    it('sends the recurrence as an RRule array', async () => {
      fetchMock.mockResolvedValue(okResponse('g-evt-1'))

      const event = makeEvent({ recurrence: { frequency: 'weekly', interval: 1, count: 4 } })
      await sync.syncItem(event, CTX)

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(body.recurrence).toEqual(['FREQ=WEEKLY;COUNT=4'])
    })

    it('POSTs a task with start/end from dueAt and priority metadata', async () => {
      fetchMock.mockResolvedValue(okResponse('g-task-1'))

      const task = makeTask()
      const result = await sync.syncItem(task, CTX)

      const [_url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(options.method).toBe('POST')
      const body = JSON.parse(options.body as string)
      expect(body.summary).toBe('Test Task')
      expect(body.description).toBe('📌 Type: Task\n📚 Course: Calculus 101\n⚡ Priority: MEDIUM')
      expect(body.start).toEqual({ dateTime: task.dueAt.toISOString(), timeZone: expect.any(String) })
      expect(body.end.dateTime).toBe(new Date(task.dueAt.getTime() + 60 * 60 * 1000).toISOString())
      expect(result).toEqual({ success: true, googleEventId: 'g-task-1' })
    })

    it('PUTs an existing task', async () => {
      fetchMock.mockResolvedValue(okResponse())

      const task = makeTask({ googleCalendarEventId: 'g-task-1' })
      const result = await sync.syncItem(task, CTX)

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(url).toBe(`${API_BASE}/calendars/cal-1/events/g-task-1`)
      expect(options.method).toBe('PUT')
      expect(result).toEqual({ success: true, googleEventId: 'g-task-1' })
    })

    it('POSTs an exam with weight metadata and two-hour duration from startsAt', async () => {
      fetchMock.mockResolvedValue(okResponse('g-exam-1'))

      const exam = makeExam()
      const result = await sync.syncItem(exam, CTX)

      const [_url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      expect(options.method).toBe('POST')
      const body = JSON.parse(options.body as string)
      expect(body.summary).toBe('Test Exam')
      expect(body.description).toBe('📌 Type: Exam\n📚 Course: Calculus 101\n⚖️ Weight: 30%')
      expect(body.start).toEqual({ dateTime: exam.startsAt.toISOString(), timeZone: expect.any(String) })
      expect(body.end.dateTime).toBe(new Date(exam.startsAt.getTime() + 2 * 60 * 60 * 1000).toISOString())
      expect(result).toEqual({ success: true, googleEventId: 'g-exam-1' })
    })
  })

  describe('name resolution', () => {
    it('prefers the course name over the project name in metadata', async () => {
      fetchMock.mockResolvedValue(okResponse('g-evt-1'))

      const event = makeEvent({ courseId: 'course-1', projectId: 'project-1' })
      await sync.syncItem(event, CTX)

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(body.description).toBe('📌 Type: Event\n📚 Course: Calculus 101')
    })

    it('uses the project name when the item has no course', async () => {
      fetchMock.mockResolvedValue(okResponse('g-evt-1'))

      const event = makeEvent({ courseId: undefined, projectId: 'project-1' })
      await sync.syncItem(event, CTX)

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(body.description).toBe('📌 Type: Event\n🎯 Project: Project X')
    })

    it('omits course metadata when the name map has no match', async () => {
      fetchMock.mockResolvedValue(okResponse('g-evt-1'))

      const event = makeEvent({ courseId: 'course-unknown', projectId: undefined })
      await sync.syncItem(event, CTX)

      const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)
      expect(body.description).toBe('📌 Type: Event')
    })
  })

  describe('errors and retry', () => {
    it('returns the API error message on a non-ok response', async () => {
      fetchMock.mockResolvedValue(errorResponse('Calendar not found'))

      const result = await sync.syncItem(makeEvent(), CTX)

      expect(result).toEqual({ success: false, error: 'Calendar not found' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('retries on a transient network failure, then succeeds', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(okResponse('g-evt-1'))

      const result = await sync.syncItem(makeEvent(), CTX)

      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ success: true, googleEventId: 'g-evt-1' })
    })

    it('returns an error once the per-call retry budget is exhausted', async () => {
      fetchMock.mockRejectedValue(new Error('network down'))

      const result = await sync.syncItem(makeEvent(), CTX)

      // initial attempt + retryDelays [1, 1] gives two retries
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: false, error: 'network down' })
    })

    it('keeps retry state per call so concurrent syncs do not interfere', async () => {
      fetchMock.mockRejectedValueOnce(new Error('network down')).mockResolvedValue(okResponse('g-a'))

      const events = [makeEvent(), makeEvent()]
      const [a, b] = await Promise.all(events.map(item => sync.syncItem(item, CTX)))

      expect(a.success).toBe(true)
      expect(b.success).toBe(true)
      // one call retried after the shared mock rejection, the other succeeded directly
      expect(fetchMock).toHaveBeenCalledTimes(3)
    })
  })
})

describe('GoogleCalendarSync.deleteItem', () => {
  let sync: GoogleCalendarSync
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sync = new GoogleCalendarSync([1, 1])
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('DELETEs the Google event for an event item', async () => {
    fetchMock.mockResolvedValue(okResponse())

    const result = await sync.deleteItem(makeEvent({ googleCalendarEventId: 'g-evt-1' }), CTX)

    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`${API_BASE}/calendars/cal-1/events/g-evt-1`)
    expect(options.method).toBe('DELETE')
    expect(result).toEqual({ success: true })
  })

  it('DELETEs the Google event for a task item', async () => {
    fetchMock.mockResolvedValue(okResponse())

    const result = await sync.deleteItem(makeTask({ googleCalendarEventId: 'g-task-1' }), CTX)

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/calendars/cal-1/events/g-task-1`)
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
    expect(result).toEqual({ success: true })
  })

  it('DELETEs the Google event for an exam item', async () => {
    fetchMock.mockResolvedValue(okResponse())

    const result = await sync.deleteItem(makeExam({ googleCalendarEventId: 'g-exam-1' }), CTX)

    expect(fetchMock.mock.calls[0][0]).toBe(`${API_BASE}/calendars/cal-1/events/g-exam-1`)
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe('DELETE')
    expect(result).toEqual({ success: true })
  })

  it('returns skipped when the item has no Google event id', async () => {
    const result = await sync.deleteItem(makeTask(), CTX)

    expect(result).toEqual({ success: false, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns skipped for a timetable item', async () => {
    const result = await sync.deleteItem(makeTimetable(), CTX)

    expect(result).toEqual({ success: false, skipped: true })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('returns the API error message on a non-ok response', async () => {
    fetchMock.mockResolvedValue(errorResponse('Forbidden'))

    const result = await sync.deleteItem(makeEvent({ googleCalendarEventId: 'g-evt-1' }), CTX)

    expect(result).toEqual({ success: false, error: 'Forbidden' })
  })
})

describe('GoogleCalendarSync.bulkSyncItems', () => {
  let sync: GoogleCalendarSync
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    sync = new GoogleCalendarSync([1, 1])
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('POSTs new items and PUTs existing ones through syncItem', async () => {
    fetchMock.mockResolvedValueOnce(okResponse('g-evt-1')).mockResolvedValueOnce(okResponse())

    const items: Item[] = [makeEvent(), makeTask({ googleCalendarEventId: 'g-task-1' })]
    const result = await sync.bulkSyncItems(items, CTX)

    expect(result.success).toBe(2)
    expect(result.failed).toBe(0)
    expect(result.errors).toEqual([])
    expect(result.updatedEventIds.size).toBe(1)
    expect(result.updatedEventIds.get('evt-1')).toBe('g-evt-1')
    const [postUrl, postOptions] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(postUrl).toBe(`${API_BASE}/calendars/cal-1/events`)
    expect(postOptions.method).toBe('POST')
    const [putUrl, putOptions] = fetchMock.mock.calls[1] as [string, RequestInit]
    expect(putUrl).toBe(`${API_BASE}/calendars/cal-1/events/g-task-1`)
    expect(putOptions.method).toBe('PUT')
  })

  it('reports progress for every item including skipped ones', async () => {
    fetchMock.mockResolvedValue(okResponse())

    const progress: number[] = []
    const items: Item[] = [makeEvent(), makeTimetable(), makeEvent()]
    await sync.bulkSyncItems(items, CTX, (current, _total) => progress.push(current))

    expect(progress).toEqual([1, 2, 3])
  })

  it('aggregates failures and skips without counting skipped items', async () => {
    fetchMock.mockResolvedValueOnce(errorResponse('bad event')).mockResolvedValueOnce(okResponse('g-ev-3'))

    const items: Item[] = [makeEvent(), makeTimetable(), makeEvent()]
    const result = await sync.bulkSyncItems(items, CTX)

    expect(result.success).toBe(1)
    expect(result.failed).toBe(1)
    expect(result.errors).toEqual(['Test Event: bad event'])
  })
})

describe('GoogleCalendarSync getValidAccessToken callback', () => {
  let fetchMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    fetchMock = vi.fn()
    global.fetch = fetchMock as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the token from getValidAccessToken instead of ctx.accessToken when the callback is present', async () => {
    const freshToken = 'fresh-token-from-callback'
    const getValidAccessToken = vi.fn().mockResolvedValue(freshToken)
    const sync = new GoogleCalendarSync([1, 1], getValidAccessToken)

    fetchMock.mockResolvedValue(okResponse('g-evt-1'))

    await sync.syncItem(makeEvent(), { ...CTX, accessToken: 'stale-token' })

    expect(getValidAccessToken).toHaveBeenCalledTimes(1)
    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect((options.headers as any).Authorization).toBe(`Bearer ${freshToken}`)
  })

  it('uses ctx.accessToken directly when the callback is absent', async () => {
    const sync = new GoogleCalendarSync([1, 1])

    fetchMock.mockResolvedValue(okResponse('g-evt-1'))

    await sync.syncItem(makeEvent(), CTX)

    const options = fetchMock.mock.calls[0][1] as RequestInit
    expect((options.headers as any).Authorization).toBe(`Bearer ${CTX.accessToken}`)
  })

  it('surfaces the callback error when getValidAccessToken throws', async () => {
    const getValidAccessToken = vi.fn().mockRejectedValue(new Error('Token expired, please reconnect'))
    const sync = new GoogleCalendarSync([1, 1], getValidAccessToken)

    const result = await sync.syncItem(makeEvent(), CTX)

    expect(result.success).toBe(false)
    expect(result.error).toBe('Token expired, please reconnect')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
