import type { SemesterDates, Item } from '../types'
import { store } from '../stores/app'
import { uid } from './utils'

const SEMESTER_EVENT_TAG = 'semester-auto-event'

interface EventItem {
  type: 'event'
  title: string
  startsAt: Date
  endsAt: Date
  isAllDay: boolean
  color: string
  tags: string[]
  isDeleted: boolean
}

function makeSingleDayEvent(title: string, dateStr: string, color: string): EventItem {
  const [y, m, d] = dateStr.split('-').map(Number)
  const start = new Date(y, m - 1, d, 0, 0, 0, 0)
  const end = new Date(y, m - 1, d, 0, 0, 0, 0)
  return {
    type: 'event',
    title,
    startsAt: start,
    endsAt: end,
    isAllDay: true,
    color,
    tags: [SEMESTER_EVENT_TAG],
    isDeleted: false,
  }
}

function makeMultiDayEvent(title: string, startStr: string, endStr: string, color: string): EventItem {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd, 0, 0, 0, 0)
  const end = new Date(ey, em - 1, ed, 0, 0, 0, 0)
  // If same date, shift end forward by 1 day so planner sees it as a single all-day block
  if (start.getTime() === end.getTime()) {
    end.setUTCDate(end.getUTCDate() + 1)
  }
  return {
    type: 'event',
    title,
    startsAt: start,
    endsAt: end,
    isAllDay: true,
    color,
    tags: [SEMESTER_EVENT_TAG],
    isDeleted: false,
  }
}

export function syncSemesterEvents(dates: SemesterDates): void {
  // Remove existing auto-generated semester events
  for (let i = store.items.length - 1; i >= 0; i--) {
    const item = store.items[i]
    if (item.tags?.includes(SEMESTER_EVENT_TAG)) {
      store.items.splice(i, 1)
    }
  }

  const now = new Date()
  const events: EventItem[] = []

  // 1st Semester events
  if (dates.firstSemesterStart) {
    events.push(makeSingleDayEvent('First day of classes - 1st Semester', dates.firstSemesterStart, '#10b981'))
  }
  if (dates.firstSemesterEnd) {
    events.push(makeSingleDayEvent('Final day of classes - 1st Semester', dates.firstSemesterEnd, '#10b981'))
  }

  // 2nd Semester events
  if (dates.secondSemesterStart) {
    events.push(makeSingleDayEvent('First day of classes - 2nd Semester', dates.secondSemesterStart, '#3b82f6'))
  }
  if (dates.secondSemesterEnd) {
    events.push(makeSingleDayEvent('Final day of classes - 2nd Semester', dates.secondSemesterEnd, '#3b82f6'))
  }

  // Finals
  if (dates.finalsStart) {
    events.push(makeSingleDayEvent('Beginning of Final Season', dates.finalsStart, '#f59e0b'))
  }
  if (dates.finalsEnd) {
    events.push(makeSingleDayEvent('End of Final Season', dates.finalsEnd, '#f59e0b'))
  }

  // Recess Week (multiday event)
  if (dates.recessWeekStart && dates.recessWeekEnd) {
    events.push(makeMultiDayEvent('Recess Week', dates.recessWeekStart, dates.recessWeekEnd, '#8b5cf6'))
  }

  // Winter Break (multiday event)
  if (dates.winterBreakStart && dates.winterBreakEnd) {
    events.push(makeMultiDayEvent('Winter Break', dates.winterBreakStart, dates.winterBreakEnd, '#06b6d4'))
  }

  // Add all events
  for (const event of events) {
    const newItem = {
      ...event,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    } as Item
    store.items.unshift(newItem)
  }
}
