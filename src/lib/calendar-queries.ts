import { getDateString, isDateInRange, isSameDate } from './date-utils';
import { generateRecurrenceOccurrences, type EventOccurrence } from './recurrence-utils';
import type { Item } from '@/items/models';
import type { ItemEvent } from '@/items/event/modelSchema';
import type { ItemExam } from '@/items/exam/modelSchema';
import type { ItemTask } from '@/items/task/modelSchema';

export interface CalendarEntry {
  item: Item;
  date: Date;
  startsAt: Date;
  endsAt?: Date;
  sequence?: number;
}

export interface CalendarQueryOptions {
  courseFilter?: string;
  expandRecurrence?: boolean;
}

export function getItemsInRange(
  items: readonly Item[],
  rangeStart: Date,
  rangeEnd: Date,
  opts: CalendarQueryOptions = {}
): CalendarEntry[] {
  const { courseFilter, expandRecurrence = true } = opts;
  const entries: CalendarEntry[] = [];

  for (const item of items) {
    if (item.type === 'timetable') continue;
    if (item.isDeleted) continue;
    if (courseFilter && courseFilter !== 'all' && item.courseId !== courseFilter) continue;

    if (item.type === 'event') {
      entries.push(...entriesForEvent(item, rangeStart, rangeEnd, expandRecurrence));
    } else {
      const { date, startsAt } = itemEntry(item);
      if (isDateInRange(date, rangeStart, rangeEnd)) {
        entries.push({ item, date, startsAt });
      }
    }
  }

  return entries;
}

export function getItemsOnDate(
  items: readonly Item[],
  date: Date,
  opts: CalendarQueryOptions = {}
): CalendarEntry[] {
  const dayStart = new Date(date);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setUTCHours(23, 59, 59, 999);
  return getItemsInRange(items, dayStart, dayEnd, opts);
}

function entriesForEvent(
  item: ItemEvent,
  rangeStart: Date,
  rangeEnd: Date,
  expandRecurrence: boolean
): CalendarEntry[] {
  if (expandRecurrence && item.recurrence) {
    return expandRecurringEvent(item, rangeStart, rangeEnd);
  }
  return singleEventEntries(item, rangeStart, rangeEnd);
}

function expandRecurringEvent(
  item: ItemEvent,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEntry[] {
  const occurrences = generateRecurrenceOccurrences(
    item.startsAt.getTime(),
    item.endsAt.getTime(),
    item.recurrence!,
    {
      rangeStart: rangeStart.getTime(),
      rangeEnd: rangeEnd.getTime(),
      includePartialOverlaps: true,
    }
  );
  return occurrences.map((occ: EventOccurrence) => ({
    item,
    date: new Date(occ.startsAt),
    startsAt: new Date(occ.startsAt),
    endsAt: new Date(occ.endsAt),
    sequence: occ.sequence,
  }));
}

function singleEventEntries(
  item: ItemEvent,
  rangeStart: Date,
  rangeEnd: Date
): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const eventStartStr = getDateString(item.startsAt);
  const eventEndStr = getDateString(item.endsAt);
  const rangeStartStr = getDateString(rangeStart);
  const rangeEndStr = getDateString(rangeEnd);

  const overlapStart = eventStartStr > rangeStartStr ? eventStartStr : rangeStartStr;
  const overlapEnd = eventEndStr < rangeEndStr ? eventEndStr : rangeEndStr;
  if (overlapStart > overlapEnd) return entries;

  let cursor = new Date(overlapStart + 'T00:00:00.000Z');
  const last = new Date(overlapEnd + 'T00:00:00.000Z');
  while (getDateString(cursor) <= getDateString(last)) {
    entries.push({
      item,
      date: new Date(cursor),
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return entries;
}

function itemEntry(item: Item): { date: Date; startsAt: Date } {
  if (item.type === 'task') {
    return { date: (item as ItemTask).dueAt, startsAt: (item as ItemTask).dueAt };
  }
  return { date: (item as ItemExam).startsAt, startsAt: (item as ItemExam).startsAt };
}

export function entriesOnDate(entries: CalendarEntry[], date: Date): CalendarEntry[] {
  return entries.filter(e => isSameDate(e.date, date));
}