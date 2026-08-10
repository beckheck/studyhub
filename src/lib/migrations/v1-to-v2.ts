import type { Item } from '@/types';
import { createLocalMidnightDate } from '@/lib/date-utils';
import type { ExchangeFormatV2 } from '@/lib/data-transfer';

function convertLegacyExams(data: ExchangeFormatV2): Item[] {
  return (data.exams || []).map(exam => ({
    id: exam.id,
    type: 'exam' as const,
    title: exam.title,
    courseId: exam.courseId,
    color: undefined,
    notes: exam.notes,
    tags: undefined,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    startsAt: createLocalMidnightDate(exam.date),
    weight: exam.weight,
    isCompleted: false,
  }));
}

function convertLegacyTasks(data: ExchangeFormatV2): Item[] {
  return (data.tasks || []).map(task => {
    let priority: 'low' | 'medium' | 'high' = 'medium';
    if (task.priority) {
      const normalizedPriority = task.priority.toLowerCase();
      if (normalizedPriority === 'low' || normalizedPriority === 'high') {
        priority = normalizedPriority;
      }
    }
    return {
      id: task.id,
      type: 'task' as const,
      title: task.title,
      courseId: task.courseId,
      color: undefined,
      notes: task.notes || '',
      tags: undefined,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueAt: createLocalMidnightDate(task.due),
      priority,
      isCompleted: task.done,
    };
  });
}

function convertLegacyRegularEvents(data: ExchangeFormatV2): Item[] {
  return (data.regularEvents || []).map(event => ({
    id: event.id,
    type: 'event' as const,
    title: event.title,
    courseId: event.courseId,
    color: event.color,
    notes: event.notes || '',
    tags: undefined,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    startsAt: createLocalMidnightDate(event.startDate),
    endsAt: event.endDate ? createLocalMidnightDate(event.endDate) : createLocalMidnightDate(event.startDate),
    isAllDay: true,
    location: event.location || undefined,
    recurrence: undefined,
  }));
}

function convertLegacyTimetableEvents(data: ExchangeFormatV2): Item[] {
  const eventTypeMap: Record<string, string> = {
    Catedra: 'lecture',
    Ayudantia: 'tutorial',
    Taller: 'workshop',
    Laboratorio: 'lab',
  };

  const dayToWeekdayMap: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return (data.timetableEvents || []).map(timetableEvent => {
    const activityType = eventTypeMap[timetableEvent.eventType] || timetableEvent.eventType.toLowerCase();
    const weekday = dayToWeekdayMap[timetableEvent.day] ?? 1;

    return {
      id: timetableEvent.id,
      type: 'timetable' as const,
      title: `${timetableEvent.eventType}`,
      courseId: timetableEvent.courseId,
      color: timetableEvent.color,
      notes: '',
      tags: undefined,
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      blockId: timetableEvent.block,
      weekday,
      classroom: timetableEvent.classroom || undefined,
      teacher: timetableEvent.teacher || undefined,
      activityType,
    };
  });
}

export function migrateV1ToV2(data: ExchangeFormatV2): ExchangeFormatV2 {
  const hasLegacyData =
    (data.exams && data.exams.length > 0) ||
    (data.tasks && data.tasks.length > 0) ||
    (data.regularEvents && data.regularEvents.length > 0) ||
    (data.timetableEvents && data.timetableEvents.length > 0);

  if (!hasLegacyData) {
    return data;
  }

  const legacyItems = [
    ...convertLegacyExams(data),
    ...convertLegacyTasks(data),
    ...convertLegacyRegularEvents(data),
    ...convertLegacyTimetableEvents(data),
  ];

  const existingItems: any[] = data.items || [];
  const { exams, tasks, regularEvents, timetableEvents, ...rest } = data;

  return {
    ...rest,
    items: [...existingItems, ...legacyItems],
  };
}