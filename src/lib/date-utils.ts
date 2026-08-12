/**
 * Date utilities for local wall-clock dates
 *
 * The app stores item timestamps as local wall-clock times (for example, a task
 * due date or an event start time). This module compares calendar days using the
 * local date components of those timestamps, never the UTC representation.
 * A local 20:00 event end must stay on the same calendar day, regardless of the
 * user's offset from UTC.
 *
 * Key principles:
 * - Use `getDateString` (local components) for day comparisons
 * - Compare calendar days, not timestamps
 * - Construct day boundaries with `new Date(y, m, d)` (local midnight)
 * - Handle multi-day events correctly across UTC midnight boundaries
 */
import type { CalendarView } from '@/types'

/**
 * Get the local date string (YYYY-MM-DD) from a Date object or timestamp
 * Uses the date's local calendar components, not its UTC representation
 */
export function getDateString(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Check if two dates (Date objects or timestamps) represent the same calendar day
 * Uses local date strings for comparison
 */
export function isSameDate(date1: Date | number, date2: Date | number): boolean {
  return getDateString(date1) === getDateString(date2)
}

/**
 * Check if a date falls within a date range (inclusive)
 * Uses local date strings for comparison
 */
export function isDateInRange(date: Date | number, startDate: Date | number, endDate: Date | number): boolean {
  const dateStr = getDateString(date)
  const startStr = getDateString(startDate)
  const endStr = getDateString(endDate)

  return dateStr >= startStr && dateStr <= endStr
}

/**
 * Check if an event spans multiple days
 * Uses local date strings for comparison
 */
export function isMultiDayEvent(startDate: Date | number, endDate: Date | number): boolean {
  return getDateString(startDate) !== getDateString(endDate)
}

/**
 * Check if a date is before another date (calendar day comparison)
 * Uses local date strings for comparison
 */
export function isDateBefore(date1: Date | number, date2: Date | number): boolean {
  return getDateString(date1) < getDateString(date2)
}

/**
 * Check if a date is after another date (calendar day comparison)
 * Uses local date strings for comparison
 */
export function isDateAfter(date1: Date | number, date2: Date | number): boolean {
  return getDateString(date1) > getDateString(date2)
}

/**
 * Check if a date is before or equal to another date (calendar day comparison)
 * Uses local date strings for comparison
 */
export function isDateBeforeOrEqual(date1: Date | number, date2: Date | number): boolean {
  return getDateString(date1) <= getDateString(date2)
}

/**
 * Check if a date is after or equal to another date (calendar day comparison)
 * Uses local date strings for comparison
 */
export function isDateAfterOrEqual(date1: Date | number, date2: Date | number): boolean {
  return getDateString(date1) >= getDateString(date2)
}

/**
 * Calculate the difference in days between two dates
 * Uses local date strings for consistent calculation
 * Returns positive number if date2 is after date1, negative if before
 */
export function getDaysDifference(date1: Date | number, date2: Date | number): number {
  const date1Str = getDateString(date1)
  const date2Str = getDateString(date2)

  const timestamp1 = new Date(date1Str).getTime()
  const timestamp2 = new Date(date2Str).getTime()

  const diffTime = timestamp2 - timestamp1
  return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Get today's date string in local format (YYYY-MM-DD)
 * Useful for consistent "today" comparisons
 */
export function getTodayDateString(): string {
  return getDateString(new Date())
}

/**
 * Check if a date is today (calendar day comparison)
 * Uses local date strings for comparison
 */
export function isToday(date: Date | number): boolean {
  return getDateString(date) === getTodayDateString()
}

/**
 * Check if a date is in the past (before today)
 * Uses local date strings for comparison
 */
export function isPastDate(date: Date | number): boolean {
  return isDateBefore(date, new Date())
}

/**
 * Check if a date is in the future (after today)
 * Uses local date strings for comparison
 */
export function isFutureDate(date: Date | number): boolean {
  return isDateAfter(date, new Date())
}

/**
 * Calculate D-Day format (D-X for future, D+X for past, D-Day for today)
 * Uses timezone-safe date comparison
 */
export function calculateDDay(targetDate: Date | number | string): string | null {
  if (!targetDate) return null

  const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate
  const today = new Date()

  const diffDays = getDaysDifference(today, target)

  if (diffDays === 0) return 'D-Day'
  if (diffDays > 0) return `D-${diffDays}`
  return `D+${Math.abs(diffDays)}`
}

/**
 * Compare two dates for sorting purposes, handling null/undefined values
 * Null dates are treated as having a timestamp of 0 (sorted to the beginning)
 * Returns negative if date1 < date2, positive if date1 > date2, zero if equal
 */
export function compareDates(date1: Date | null | undefined, date2: Date | null | undefined): number {
  const time1 = date1 ? date1.getTime() : 0
  const time2 = date2 ? date2.getTime() : 0
  return time1 - time2
}

/**
 * Create a Date object from a date string (YYYY-MM-DD) at midnight in the local timezone
 * This is useful for imported dates where you want them to appear at the start of the day
 * in the user's local timezone rather than being affected by UTC conversion.
 */
export function createLocalMidnightDate(dateString: string): Date {
  // Parse the date string and create a date at midnight local time
  // This avoids timezone conversion issues that can occur with new Date(dateString)
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * Build a 6x7 calendar grid for the given month, starting on Monday.
 *
 * Each cell is a Date at local midnight. Leading days belong to the previous
 * month and trailing days to the next. Callers derive in-month membership with
 * `date.getMonth() === view.month`.
 */
export function buildCalendarMatrix(view: CalendarView): Date[][] {
  const first = new Date(view.year, view.month, 1)
  const offset = (first.getDay() + 6) % 7 // Monday = 0
  const start = new Date(view.year, view.month, 1 - offset)
  const flat = Array.from(
    { length: 42 },
    (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
  )
  return Array.from({ length: 6 }, (_, week) => flat.slice(week * 7, week * 7 + 7))
}

// Import timezone-aware utilities for date handling
export type DateComponents = {
  year: number
  month: number
  date: number
  day: number
  hours: number
  minutes: number
  seconds: number
  milliseconds: number
}

/**
 * Helper function to get date components in a specific timezone
 */
export function getDateComponentsInTimezone(date: Date | number, timezone?: string): DateComponents {
  const d = typeof date === 'number' ? new Date(date) : date

  if (!timezone) {
    return {
      year: d.getFullYear(),
      month: d.getMonth(),
      date: d.getDate(),
      day: d.getDay(),
      hours: d.getHours(),
      minutes: d.getMinutes(),
      seconds: d.getSeconds(),
      milliseconds: d.getMilliseconds(),
    }
  }

  // Use Intl.DateTimeFormat to get components in the specified timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(d)
  const partsMap = parts.reduce(
    (acc, part) => {
      acc[part.type] = part.value
      return acc
    },
    {} as Record<string, string>,
  )

  // Map weekday names to numbers (Sunday = 0)
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  }

  return {
    year: parseInt(partsMap.year),
    month: parseInt(partsMap.month) - 1, // JavaScript months are 0-based
    date: parseInt(partsMap.day),
    day: weekdayMap[partsMap.weekday],
    hours: parseInt(partsMap.hour),
    minutes: parseInt(partsMap.minute),
    seconds: parseInt(partsMap.second),
    milliseconds: 0, // Not available from formatter
  }
}

/**
 * Helper function to add days to date components
 */
export function addDaysToComponents(components: DateComponents, daysToAdd: number): DateComponents {
  // Create a date and add days - JavaScript automatically handles overflow
  const date = new Date(components.year, components.month, components.date + daysToAdd)

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    day: date.getDay(),
    hours: components.hours,
    minutes: components.minutes,
    seconds: components.seconds,
    milliseconds: components.milliseconds,
  }
}

/**
 * Helper function to add months to a date and get the resulting components
 * Properly handles year boundaries and invalid dates
 */
export function addMonthsToComponents(components: DateComponents, monthsToAdd: number): DateComponents {
  // Create a date and add months - JavaScript automatically handles overflow
  const date = new Date(components.year, components.month + monthsToAdd, components.date)

  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    date: date.getDate(),
    day: date.getDay(),
    hours: components.hours,
    minutes: components.minutes,
    seconds: components.seconds,
    milliseconds: components.milliseconds,
  }
}

/**
 * Helper function to create a date from date components in a specific timezone
 */
export function createDateInTimezone(
  year: number,
  month: number,
  date: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  milliseconds: number = 0,
  timezone?: string,
): Date {
  if (!timezone) {
    return new Date(year, month, date, hours, minutes, seconds, milliseconds)
  }

  // Create an ISO string that represents the local time in the target timezone
  const isoString = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}T${String(
    hours,
  ).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(
    milliseconds,
  ).padStart(3, '0')}`

  try {
    // Create a temporary date to find what UTC time corresponds to this local time in the target timezone
    const tempDate = new Date(isoString + 'Z') // Treat as UTC first

    // Format this date in the target timezone to see what local time it represents
    const formatter = new Intl.DateTimeFormat('sv-SE', {
      // Swedish format gives us YYYY-MM-DD HH:mm:ss
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const formatted = formatter.format(tempDate).replace(' ', 'T')

    // Calculate the difference between what we want and what we got
    const wantedLocal = isoString
    const actualLocal = formatted

    // If they're the same, we found the right UTC time
    if (wantedLocal.startsWith(actualLocal)) {
      return tempDate
    }

    // If not, we need to adjust
    const wantedDate = new Date(wantedLocal + 'Z')
    const actualDate = new Date(actualLocal + 'Z')
    const diff = wantedDate.getTime() - actualDate.getTime()

    return new Date(tempDate.getTime() + diff)
  } catch (error) {
    // Fallback to UTC if timezone handling fails
    console.warn(`Failed to handle timezone ${timezone}, falling back to UTC:`, error)
    return new Date(year, month, date, hours, minutes, seconds, milliseconds)
  }
}
