/**
 * Recurrence utilities for handling recurring events
 *
 * This module provides utilities for working with recurring events based on
 * the EventRecurrenceSchema. It includes functions to:
 * - Check if a timestamp matches a recurrence rule
 * - Generate all occurrences within a date range
 * - Get the next occurrence from a given date
 * - Calculate occurrence counts and end dates
 */

import type { EventRecurrence } from '@/items/event/modelSchema'

/**
 * Represents a single occurrence of a recurring event
 */
export interface EventOccurrence {
  /** The start timestamp of this occurrence */
  startsAt: number
  /** The end timestamp of this occurrence */
  endsAt: number
  /** The sequence number of this occurrence (1-based) */
  sequence: number
}

/**
 * Options for generating recurring event occurrences
 */
export interface RecurrenceGenerationOptions {
  /** Start of the date range to generate occurrences for */
  rangeStart: number
  /** End of the date range to generate occurrences for */
  rangeEnd: number
  /** Maximum number of occurrences to generate (overrides recurrence.count if smaller) */
  maxOccurrences?: number
  /** Whether to include occurrences that partially overlap with the range */
  includePartialOverlaps?: boolean
  /** Timezone for date calculations (IANA timezone identifier, e.g., 'America/Santiago') */
  timezone?: string
}

/**
 * Checks if a given timestamp matches a recurrence rule
 *
 * @param timestamp - The timestamp to check
 * @param baseStartTime - The start time of the original event
 * @param recurrence - The recurrence rule
 * @param timezone - Optional timezone for date calculations (IANA timezone identifier)
 * @returns True if the timestamp matches the recurrence rule
 */
export function isRecurrenceMatch(
  timestamp: number,
  baseStartTime: number,
  recurrence: EventRecurrence,
  timezone?: string,
): boolean {
  const baseComponents = getDateComponentsInTimezone(baseStartTime, timezone)
  const checkComponents = getDateComponentsInTimezone(timestamp, timezone)

  // Check if we're within the recurrence bounds
  if (recurrence.until && timestamp > recurrence.until.getTime()) {
    return false
  }

  // If we're checking the original event time, it always matches
  if (timestamp === baseStartTime) {
    return true
  }

  // If the check date is before the base date, it can't match
  if (timestamp < baseStartTime) {
    return false
  }

  return isDateInRecurrencePattern(checkComponents, baseComponents, recurrence)
}

/**
 * Generates all occurrences of a recurring event within a specified date range
 *
 * @param baseStartTime - The start time of the original event
 * @param baseEndTime - The end time of the original event
 * @param recurrence - The recurrence rule
 * @param options - Options for generation
 * @returns Array of event occurrences
 */
export function generateRecurrenceOccurrences(
  baseStartTime: number,
  baseEndTime: number,
  recurrence: EventRecurrence,
  options: RecurrenceGenerationOptions,
): EventOccurrence[] {
  const occurrences: EventOccurrence[] = []
  const baseComponents = getDateComponentsInTimezone(baseStartTime, options.timezone)
  const eventDuration = baseEndTime - baseStartTime

  let currentTimestamp = baseStartTime
  let sequence = 1
  let occurrenceCount = 0

  // Calculate maximum occurrences
  const maxCount = options.maxOccurrences
    ? Math.min(options.maxOccurrences, recurrence.count || Infinity)
    : recurrence.count || Infinity

  while (occurrenceCount < maxCount) {
    // Check if we've exceeded the until date - should not equal until date
    if (recurrence.until && currentTimestamp >= recurrence.until.getTime()) {
      break
    }

    // Check if we've exceeded the range end
    if (currentTimestamp >= options.rangeEnd) {
      break
    }

    // Check if this occurrence should be included
    const occurrenceEndTime = currentTimestamp + eventDuration
    const isInRange = options.includePartialOverlaps
      ? currentTimestamp < options.rangeEnd && occurrenceEndTime >= options.rangeStart
      : currentTimestamp >= options.rangeStart && occurrenceEndTime < options.rangeEnd

    const currentComponents = getDateComponentsInTimezone(currentTimestamp, options.timezone)
    if (isInRange && isDateInRecurrencePattern(currentComponents, baseComponents, recurrence)) {
      occurrences.push({
        startsAt: currentTimestamp,
        endsAt: occurrenceEndTime,
        sequence,
      })
      occurrenceCount++
    }

    // Move to the next potential occurrence
    currentTimestamp = getNextPotentialOccurrence(currentTimestamp, baseComponents, recurrence, options.timezone)
    sequence++

    // Safety check to prevent infinite loops
    if (sequence > 10000) {
      console.warn('Recurrence generation stopped due to safety limit')
      break
    }
  }

  return occurrences
}

/**
 * Gets the next occurrence of a recurring event after a given date
 *
 * @param fromDate - The date to start searching from
 * @param baseStartTime - The start time of the original event
 * @param baseEndTime - The end time of the original event
 * @param recurrence - The recurrence rule
 * @param timezone - Optional timezone for date calculations (IANA timezone identifier)
 * @returns The next occurrence or null if no more occurrences
 */
export function getNextOccurrence(
  fromDate: number,
  baseStartTime: number,
  baseEndTime: number,
  recurrence: EventRecurrence,
  timezone?: string,
): EventOccurrence | null {
  const eventDuration = baseEndTime - baseStartTime
  const baseComponents = getDateComponentsInTimezone(baseStartTime, timezone)

  // Start from base date and iterate until we find the next occurrence after fromDate
  let currentTimestamp = baseStartTime
  let sequence = 1

  let iterations = 0
  const maxIterations = 10000

  while (iterations < maxIterations) {
    // Check if we've exceeded the until date
    if (recurrence.until && currentTimestamp > recurrence.until.getTime()) {
      return null
    }

    // Check if this is a valid occurrence and it's after fromDate
    const currentComponents = getDateComponentsInTimezone(currentTimestamp, timezone)
    if (currentTimestamp > fromDate && isDateInRecurrencePattern(currentComponents, baseComponents, recurrence)) {
      return {
        startsAt: currentTimestamp,
        endsAt: currentTimestamp + eventDuration,
        sequence,
      }
    }

    currentTimestamp = getNextPotentialOccurrence(currentTimestamp, baseComponents, recurrence, timezone)
    sequence++
    iterations++
  }

  return null
}

/**
 * Calculates the total number of occurrences for a recurrence rule
 *
 * @param baseStartTime - The start time of the original event
 * @param recurrence - The recurrence rule
 * @returns The total number of occurrences, or null if infinite
 */
export function calculateTotalOccurrences(baseStartTime: number, recurrence: EventRecurrence): number | null {
  if (recurrence.count) {
    return recurrence.count
  }

  if (recurrence.until) {
    // Estimate based on the until date
    const baseDate = new Date(baseStartTime)
    const untilDate = new Date(recurrence.until)
    const timeDiff = untilDate.getTime() - baseDate.getTime()

    switch (recurrence.frequency) {
      case 'daily':
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24 * recurrence.interval)) + 1
      case 'weekly':
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 7 * recurrence.interval)) + 1
      case 'monthly':
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 30 * recurrence.interval)) + 1
      case 'yearly':
        return Math.floor(timeDiff / (1000 * 60 * 60 * 24 * 365 * recurrence.interval)) + 1
    }
  }

  return null // Infinite
}

// Private helper functions

/**
 * Type for date components extracted from a timestamp
 */
type DateComponents = {
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
 * Checks if a date matches the recurrence pattern
 */
function isDateInRecurrencePattern(
  checkComponents: DateComponents,
  baseComponents: DateComponents,
  recurrence: EventRecurrence,
): boolean {
  switch (recurrence.frequency) {
    case 'daily':
      return isDailyMatch(checkComponents, baseComponents, recurrence)
    case 'weekly':
      return isWeeklyMatch(checkComponents, baseComponents, recurrence)
    case 'monthly':
      return isMonthlyMatch(checkComponents, baseComponents, recurrence)
    case 'yearly':
      return isYearlyMatch(checkComponents, baseComponents, recurrence)
    default:
      return false
  }
}

/**
 * Checks if a date matches a daily recurrence pattern
 */
function isDailyMatch(
  checkComponents: DateComponents,
  baseComponents: DateComponents,
  recurrence: EventRecurrence,
): boolean {
  // Calculate the difference in days between the two dates
  const checkTime = createTimestampInTimezone(
    checkComponents.year,
    checkComponents.month,
    checkComponents.date,
    0,
    0,
    0,
    0,
  )
  const baseTime = createTimestampInTimezone(baseComponents.year, baseComponents.month, baseComponents.date, 0, 0, 0, 0)

  const daysDiff = Math.floor((checkTime - baseTime) / (1000 * 60 * 60 * 24))

  if (daysDiff < 0) return false
  if (daysDiff % recurrence.interval !== 0) return false

  // Check weekday constraints if specified
  if (recurrence.byWeekday && recurrence.byWeekday.length > 0) {
    return recurrence.byWeekday.includes(checkComponents.day)
  }

  return true
}

/**
 * Checks if a date matches a weekly recurrence pattern
 */
function isWeeklyMatch(
  checkComponents: DateComponents,
  baseComponents: DateComponents,
  recurrence: EventRecurrence,
): boolean {
  // Calculate the difference in weeks
  const checkTime = createTimestampInTimezone(
    checkComponents.year,
    checkComponents.month,
    checkComponents.date,
    0,
    0,
    0,
    0,
  )
  const baseTime = createTimestampInTimezone(baseComponents.year, baseComponents.month, baseComponents.date, 0, 0, 0, 0)

  const weeksDiff = Math.floor((checkTime - baseTime) / (1000 * 60 * 60 * 24 * 7))

  if (weeksDiff < 0) return false
  if (weeksDiff % recurrence.interval !== 0) return false

  // Check weekday constraints
  if (recurrence.byWeekday && recurrence.byWeekday.length > 0) {
    return recurrence.byWeekday.includes(checkComponents.day)
  } else {
    // If no weekday specified, use the original event's weekday
    return checkComponents.day === baseComponents.day
  }
}

/**
 * Checks if a date matches a monthly recurrence pattern
 */
function isMonthlyMatch(
  checkComponents: DateComponents,
  baseComponents: DateComponents,
  recurrence: EventRecurrence,
): boolean {
  const monthsDiff = (checkComponents.year - baseComponents.year) * 12 + (checkComponents.month - baseComponents.month)

  if (monthsDiff < 0) return false
  if (monthsDiff % recurrence.interval !== 0) return false

  // Check if it's the same day of the month
  return checkComponents.date === baseComponents.date
}

/**
 * Checks if a date matches a yearly recurrence pattern
 */
function isYearlyMatch(
  checkComponents: DateComponents,
  baseComponents: DateComponents,
  recurrence: EventRecurrence,
): boolean {
  const yearsDiff = checkComponents.year - baseComponents.year

  if (yearsDiff < 0) return false
  if (yearsDiff % recurrence.interval !== 0) return false

  // Check if it's the same month and day
  return checkComponents.month === baseComponents.month && checkComponents.date === baseComponents.date
}

/**
 * Gets the next potential occurrence timestamp based on the recurrence frequency
 */
function getNextPotentialOccurrence(
  currentTimestamp: number,
  baseComponents: DateComponents,
  recurrence: EventRecurrence,
  timezone?: string,
): number {
  const currentComponents = getDateComponentsInTimezone(currentTimestamp, timezone)

  switch (recurrence.frequency) {
    case 'daily': {
      const newComponents = addDaysToComponents(currentComponents, recurrence.interval)
      return createTimestampInTimezone(
        newComponents.year,
        newComponents.month,
        newComponents.date,
        baseComponents.hours,
        baseComponents.minutes,
        baseComponents.seconds,
        baseComponents.milliseconds,
        timezone,
      )
    }

    case 'weekly':
      if (recurrence.byWeekday && recurrence.byWeekday.length > 0) {
        // Find next weekday in the list
        const currentDay = currentComponents.day
        const sortedWeekdays = [...recurrence.byWeekday].sort((a, b) => a - b)

        // Find next weekday in current week
        let nextWeekday = sortedWeekdays.find(day => day > currentDay)

        if (nextWeekday !== undefined) {
          // Next occurrence is later this week
          const daysToAdd = nextWeekday - currentDay
          const newComponents = addDaysToComponents(currentComponents, daysToAdd)
          return createTimestampInTimezone(
            newComponents.year,
            newComponents.month,
            newComponents.date,
            baseComponents.hours,
            baseComponents.minutes,
            baseComponents.seconds,
            baseComponents.milliseconds,
            timezone,
          )
        } else {
          // Move to next interval and start with first weekday
          const daysToNextWeek = 7 - currentDay + sortedWeekdays[0]
          const additionalWeeks = (recurrence.interval - 1) * 7
          const newComponents = addDaysToComponents(currentComponents, daysToNextWeek + additionalWeeks)
          return createTimestampInTimezone(
            newComponents.year,
            newComponents.month,
            newComponents.date,
            baseComponents.hours,
            baseComponents.minutes,
            baseComponents.seconds,
            baseComponents.milliseconds,
            timezone,
          )
        }
      } else {
        // Use original weekday
        const newComponents = addDaysToComponents(currentComponents, 7 * recurrence.interval)
        return createTimestampInTimezone(
          newComponents.year,
          newComponents.month,
          newComponents.date,
          baseComponents.hours,
          baseComponents.minutes,
          baseComponents.seconds,
          baseComponents.milliseconds,
          timezone,
        )
      }

    case 'monthly': {
      const newComponents = addMonthsToComponents(currentComponents, recurrence.interval)
      return createTimestampInTimezone(
        newComponents.year,
        newComponents.month,
        newComponents.date,
        baseComponents.hours,
        baseComponents.minutes,
        baseComponents.seconds,
        baseComponents.milliseconds,
        timezone,
      )
    }

    case 'yearly':
      return createTimestampInTimezone(
        currentComponents.year + recurrence.interval,
        currentComponents.month,
        currentComponents.date,
        baseComponents.hours,
        baseComponents.minutes,
        baseComponents.seconds,
        baseComponents.milliseconds,
        timezone,
      )

    default:
      throw new Error(`Unsupported recurrence frequency: ${String(recurrence.frequency)}`)
  }
}

/**
 * Utility function to create a date at the start of the day (00:00:00)
 */
export function getStartOfDay(timestamp: number, timezone?: string): number {
  const components = getDateComponentsInTimezone(timestamp, timezone)
  return createTimestampInTimezone(components.year, components.month, components.date, 0, 0, 0, 0, timezone)
}

/**
 * Utility function to create a date at the end of the day (23:59:59.999)
 */
export function getEndOfDay(timestamp: number, timezone?: string): number {
  const components = getDateComponentsInTimezone(timestamp, timezone)
  return createTimestampInTimezone(components.year, components.month, components.date, 23, 59, 59, 999, timezone)
}

/**
 * Utility function to get the start of a week (Sunday 00:00:00)
 */
export function getStartOfWeek(timestamp: number, timezone?: string): number {
  const components = getDateComponentsInTimezone(timestamp, timezone)
  const dayOffset = components.day
  const startOfWeekComponents = addDaysToComponents(components, -dayOffset)
  return createTimestampInTimezone(
    startOfWeekComponents.year,
    startOfWeekComponents.month,
    startOfWeekComponents.date,
    0,
    0,
    0,
    0,
    timezone,
  )
}

/**
 * Utility function to get the end of a week (Saturday 23:59:59.999)
 */
export function getEndOfWeek(timestamp: number, timezone?: string): number {
  const components = getDateComponentsInTimezone(timestamp, timezone)
  const dayOffset = 6 - components.day
  const endOfWeekComponents = addDaysToComponents(components, dayOffset)
  return createTimestampInTimezone(
    endOfWeekComponents.year,
    endOfWeekComponents.month,
    endOfWeekComponents.date,
    23,
    59,
    59,
    999,
    timezone,
  )
}

/**
 * Helper function to get date components in a specific timezone
 */
function getDateComponentsInTimezone(timestamp: number, timezone?: string) {
  const date = new Date(timestamp)

  if (!timezone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      date: date.getDate(),
      day: date.getDay(),
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
      milliseconds: date.getMilliseconds(),
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

  const parts = formatter.formatToParts(date)
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
 * Helper function to add days to a date and get the resulting components
 * Properly handles month/year boundaries
 */
function addDaysToComponents(components: DateComponents, daysToAdd: number): DateComponents {
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
function addMonthsToComponents(components: DateComponents, monthsToAdd: number): DateComponents {
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
 * Helper function to create a timestamp from date components in a specific timezone
 */
function createTimestampInTimezone(
  year: number,
  month: number,
  date: number,
  hours: number = 0,
  minutes: number = 0,
  seconds: number = 0,
  milliseconds: number = 0,
  timezone?: string,
): number {
  if (!timezone) {
    return new Date(year, month, date, hours, minutes, seconds, milliseconds).getTime()
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
      return tempDate.getTime()
    }

    // If not, we need to adjust
    const wantedDate = new Date(wantedLocal + 'Z')
    const actualDate = new Date(actualLocal + 'Z')
    const diff = wantedDate.getTime() - actualDate.getTime()

    return tempDate.getTime() + diff
  } catch (error) {
    // Fallback to UTC if timezone handling fails
    console.warn(`Failed to handle timezone ${timezone}, falling back to UTC:`, error)
    return new Date(year, month, date, hours, minutes, seconds, milliseconds).getTime()
  }
}
