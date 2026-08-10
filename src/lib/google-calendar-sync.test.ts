import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GoogleCalendarSync } from './google-calendar-sync';
import type { ItemEvent } from '@/items/event/modelSchema';
import type { ItemTask } from '@/items/task/modelSchema';
import type { ItemExam } from '@/items/exam/modelSchema';
import type { ItemTimetable } from '@/items/timetable/modelSchema';
import type { Item } from '@/items/models';

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
  } as ItemEvent;
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
  } as ItemTask;
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
  } as ItemExam;
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
  } as ItemTimetable;
}

const CTX = {
  accessToken: 'token-123',
  calendarId: 'cal-1',
  syncEnabled: true,
  courseName: 'Calculus 101',
  projectName: 'Project X',
};

describe('GoogleCalendarSync.syncItem', () => {
  let sync: GoogleCalendarSync;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    sync = new GoogleCalendarSync();
    originalFetch = global.fetch;
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('guards', () => {
    it('returns { success: false, skipped: true } when syncEnabled is false', async () => {
      const result = await sync.syncItem(makeEvent(), { ...CTX, syncEnabled: false });
      expect(result).toEqual({ success: false, skipped: true });
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns skipped when accessToken is missing', async () => {
      const result = await sync.syncItem(makeEvent(), { ...CTX, accessToken: '' });
      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns skipped when calendarId is missing', async () => {
      const result = await sync.syncItem(makeEvent(), { ...CTX, calendarId: '' });
      expect(result.success).toBe(false);
      expect(result.skipped).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('does not call any underlying sync method when sync is disabled', async () => {
      const syncNewEventSpy = vi.spyOn(sync, 'syncNewEvent');
      const updateEventSpy = vi.spyOn(sync, 'updateEvent');
      const syncTaskSpy = vi.spyOn(sync, 'syncTaskToGoogle');
      const syncExamSpy = vi.spyOn(sync, 'syncExamToGoogle');

      await sync.syncItem(makeEvent(), { ...CTX, syncEnabled: false });

      expect(syncNewEventSpy).not.toHaveBeenCalled();
      expect(updateEventSpy).not.toHaveBeenCalled();
      expect(syncTaskSpy).not.toHaveBeenCalled();
      expect(syncExamSpy).not.toHaveBeenCalled();
    });
  });

  describe('timetable', () => {
    it('returns skipped for timetable items, no HTTP call', async () => {
      const result = await sync.syncItem(makeTimetable(), CTX);
      expect(result.skipped).toBe(true);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('event dispatch', () => {
    it('new event (no googleCalendarEventId) calls syncNewEvent and returns its result', async () => {
      const spy = vi
        .spyOn(sync, 'syncNewEvent')
        .mockResolvedValue({ success: true, googleEventId: 'g-new-evt' });

      const result = await sync.syncItem(makeEvent(), CTX);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'evt-1', type: 'event' }),
        'token-123',
        'cal-1',
        'Calculus 101',
        'Project X'
      );
      expect(result).toEqual({ success: true, googleEventId: 'g-new-evt' });
    });

    it('existing event (with googleCalendarEventId) calls updateEvent', async () => {
      const syncNewEventSpy = vi.spyOn(sync, 'syncNewEvent');
      const updateSpy = vi
        .spyOn(sync, 'updateEvent')
        .mockResolvedValue({ success: true, googleEventId: 'g-evt-1' });

      const result = await sync.syncItem(makeEvent({ googleCalendarEventId: 'g-evt-1' }), CTX);

      expect(syncNewEventSpy).not.toHaveBeenCalled();
      expect(updateSpy).toHaveBeenCalledWith(
        expect.objectContaining({ googleCalendarEventId: 'g-evt-1' }),
        'token-123',
        'cal-1',
        'Calculus 101',
        'Project X'
      );
      expect(result.success).toBe(true);
      expect(result.googleEventId).toBe('g-evt-1');
    });
  });

  describe('task dispatch', () => {
    it('new task calls syncTaskToGoogle with isUpdate=false', async () => {
      const spy = vi
        .spyOn(sync, 'syncTaskToGoogle')
        .mockResolvedValue({ success: true, googleEventId: 'g-new-task' });

      const result = await sync.syncItem(makeTask(), CTX);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'task-1', type: 'task' }),
        'token-123',
        'cal-1',
        false,
        'Calculus 101',
        'Project X'
      );
      expect(result).toEqual({ success: true, googleEventId: 'g-new-task' });
    });

    it('existing task calls syncTaskToGoogle with isUpdate=true', async () => {
      const spy = vi
        .spyOn(sync, 'syncTaskToGoogle')
        .mockResolvedValue({ success: true, googleEventId: 'g-task-1' });

      const result = await sync.syncItem(makeTask({ googleCalendarEventId: 'g-task-1' }), CTX);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ googleCalendarEventId: 'g-task-1' }),
        'token-123',
        'cal-1',
        true,
        'Calculus 101',
        'Project X'
      );
      expect(result.success).toBe(true);
    });
  });

  describe('exam dispatch', () => {
    it('new exam calls syncExamToGoogle with isUpdate=false', async () => {
      const spy = vi
        .spyOn(sync, 'syncExamToGoogle')
        .mockResolvedValue({ success: true, googleEventId: 'g-new-exam' });

      const result = await sync.syncItem(makeExam(), CTX);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'exam-1', type: 'exam' }),
        'token-123',
        'cal-1',
        false,
        'Calculus 101',
        'Project X'
      );
      expect(result).toEqual({ success: true, googleEventId: 'g-new-exam' });
    });

    it('existing exam calls syncExamToGoogle with isUpdate=true', async () => {
      const spy = vi
        .spyOn(sync, 'syncExamToGoogle')
        .mockResolvedValue({ success: true, googleEventId: 'g-exam-1' });

      const result = await sync.syncItem(makeExam({ googleCalendarEventId: 'g-exam-1' }), CTX);

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ googleCalendarEventId: 'g-exam-1' }),
        'token-123',
        'cal-1',
        true,
        'Calculus 101',
        'Project X'
      );
      expect(result.success).toBe(true);
    });
  });

  describe('no console.log in dispatch', () => {
    it('does not call console.log on the sync-disabled skip path', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await sync.syncItem(makeEvent(), { ...CTX, syncEnabled: false });
      expect(logSpy).not.toHaveBeenCalled();
    });

    it('does not call console.log on the timetable skip path', async () => {
      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      await sync.syncItem(makeTimetable(), CTX);
      expect(logSpy).not.toHaveBeenCalled();
    });
  });
});

describe('GoogleCalendarSync.deleteItem', () => {
  let sync: GoogleCalendarSync;
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    sync = new GoogleCalendarSync();
    originalFetch = global.fetch;
    global.fetch = vi.fn() as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('calls deleteEvent for events with googleCalendarEventId', async () => {
    const spy = vi.spyOn(sync, 'deleteEvent').mockResolvedValue({ success: true });

    const result = await sync.deleteItem(makeEvent({ googleCalendarEventId: 'g-evt-1' }), CTX);

    expect(spy).toHaveBeenCalledWith('g-evt-1', 'token-123', 'cal-1');
    expect(result.success).toBe(true);
  });

  it('returns skipped for events without googleCalendarEventId', async () => {
    const spy = vi.spyOn(sync, 'deleteEvent');
    const result = await sync.deleteItem(makeEvent(), CTX);

    expect(result.skipped).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns skipped for task items', async () => {
    const spy = vi.spyOn(sync, 'deleteEvent');
    const result = await sync.deleteItem(makeTask(), CTX);

    expect(result.skipped).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns skipped for exam items', async () => {
    const spy = vi.spyOn(sync, 'deleteEvent');
    const result = await sync.deleteItem(makeExam(), CTX);

    expect(result.skipped).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('returns skipped for timetable items', async () => {
    const spy = vi.spyOn(sync, 'deleteEvent');
    const result = await sync.deleteItem(makeTimetable(), CTX);

    expect(result.skipped).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not call console.log on the non-event skip path', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    await sync.deleteItem(makeTask(), CTX);
    expect(logSpy).not.toHaveBeenCalled();
  });
});