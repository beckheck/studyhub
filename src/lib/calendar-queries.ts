import { getDateString, getDeviceTimezone, isDateInRange, isSameDate } from './date-utils'
import { generateRecurrenceOccurrences, type EventOccurrence } from './recurrence-utils'
import type { Item } from '@/items/models'
import type { ItemEvent } from '@/items/event/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'
import { getTimetableInstancesBetween, type ItemTimetable } from '@/items/timetable/modelSchema'

export interface CalendarEntry {
  item: Item
  date: Date
  startsAt: Date
  endsAt?: Date
  sequence?: number
}

export interface CalendarQueryOptions {
  courseFilter?: string
  expandRecurrence?: boolean
  /** IANA timezone for Timetable expansion. Defaults to the device timezone. */
  timezone?: string
  /** Course id -> title map. Timetable entries use the course title as their display title. */
  courseTitles?: Readonly<Record<string, string>>
  includeTimetable?: boolean
}

export function getItemsInRange(
  items: readonly Item[],
  rangeStart: Date,
  rangeEnd: Date,
  opts: CalendarQueryOptions = {},
): CalendarEntry[] {
  const { courseFilter, expandRecurrence = true, timezone = getDeviceTimezone(), courseTitles, includeTimetable } = opts
  const entries: CalendarEntry[] = []

  for (const item of items) {
    if (item.isDeleted) continue
    if (courseFilter && courseFilter !== 'all' && item.courseId !== courseFilter) continue

    if (item.type === 'timetable') {
      if (!includeTimetable) continue
      entries.push(...entriesForTimetable(item, rangeStart, rangeEnd, timezone, courseTitles))
    } else if (item.type === 'event') {
      entries.push(...entriesForEvent(item, rangeStart, rangeEnd, expandRecurrence))
    } else {
      const { date, startsAt } = itemEntry(item)
      if (isDateInRange(date, rangeStart, rangeEnd)) {
        entries.push({ item, date, startsAt })
      }
    }
  }

  return entries
}

export function getItemsOnDate(items: readonly Item[], date: Date, opts: CalendarQueryOptions = {}): CalendarEntry[] {
  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  return getItemsInRange(items, dayStart, dayEnd, opts)
}

function entriesForTimetable(
  item: ItemTimetable,
  rangeStart: Date,
  rangeEnd: Date,
  timezone: string,
  courseTitles?: Readonly<Record<string, string>>,
): CalendarEntry[] {
  const instances = getTimetableInstancesBetween(item, rangeStart, rangeEnd, timezone)
  const courseTitle = item.courseId ? courseTitles?.[item.courseId] : undefined
  const displayItem = courseTitle ? ({ ...item, title: courseTitle } as Item) : item
  return instances.map(instance => ({
    item: displayItem,
    date: new Date(instance.startsAt.getFullYear(), instance.startsAt.getMonth(), instance.startsAt.getDate()),
    startsAt: instance.startsAt,
    endsAt: instance.endsAt,
  }))
}

function entriesForEvent(
  item: ItemEvent,
  rangeStart: Date,
  rangeEnd: Date,
  expandRecurrence: boolean,
): CalendarEntry[] {
  if (expandRecurrence && item.recurrence) {
    return expandRecurringEvent(item, rangeStart, rangeEnd)
  }
  return singleEventEntries(item, rangeStart, rangeEnd)
}

function expandRecurringEvent(item: ItemEvent, rangeStart: Date, rangeEnd: Date): CalendarEntry[] {
  const occurrences = generateRecurrenceOccurrences(item.startsAt.getTime(), item.endsAt.getTime(), item.recurrence!, {
    rangeStart: rangeStart.getTime(),
    rangeEnd: rangeEnd.getTime(),
    includePartialOverlaps: true,
  })
  return occurrences.map((occ: EventOccurrence) => ({
    item,
    date: new Date(occ.startsAt),
    startsAt: new Date(occ.startsAt),
    endsAt: new Date(occ.endsAt),
    sequence: occ.sequence,
  }))
}

function singleEventEntries(item: ItemEvent, rangeStart: Date, rangeEnd: Date): CalendarEntry[] {
  const entries: CalendarEntry[] = []
  const eventStartStr = getDateString(item.startsAt)
  const eventEndStr = getDateString(item.endsAt)
  const rangeStartStr = getDateString(rangeStart)
  const rangeEndStr = getDateString(rangeEnd)

  const overlapStart = eventStartStr > rangeStartStr ? eventStartStr : rangeStartStr
  const overlapEnd = eventEndStr < rangeEndStr ? eventEndStr : rangeEndStr
  if (overlapStart > overlapEnd) return entries

  let cursor = parseLocalDate(overlapStart)
  const last = parseLocalDate(overlapEnd)
  while (getDateString(cursor) <= getDateString(last)) {
    entries.push({
      item,
      date: new Date(cursor),
      startsAt: item.startsAt,
      endsAt: item.endsAt,
    })
    cursor.setDate(cursor.getDate() + 1)
  }
  return entries
}

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function itemEntry(item: Item): { date: Date; startsAt: Date } {
  if (item.type === 'task') {
    return { date: (item as ItemTask).dueAt, startsAt: (item as ItemTask).dueAt }
  }
  return { date: (item as ItemExam).startsAt, startsAt: (item as ItemExam).startsAt }
}

export function entriesOnDate(entries: CalendarEntry[], date: Date): CalendarEntry[] {
  return entries.filter(e => isSameDate(e.date, date))
}

export function courseTitlesFromCourses(courses: ReadonlyArray<{ id: string; title: string }>): Record<string, string> {
  return Object.fromEntries(courses.map(c => [c.id, c.title]))
}
