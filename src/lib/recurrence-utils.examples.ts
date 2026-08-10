/**
 * Usage examples for the recurrence utilities
 *
 * This file demonstrates how to use the recurrence utility functions
 * with various recurrence patterns and scenarios.
 */

import {
  isRecurrenceMatch,
  generateRecurrenceOccurrences,
  getNextOccurrence,
  calculateTotalOccurrences,
  getStartOfDay,
  getEndOfDay,
  type RecurrenceGenerationOptions,
} from './recurrence-utils'
import type { EventRecurrence } from '../items/event/modelSchema'

// Example: Daily recurrence every 2 days
export function exampleDailyRecurrence() {
  const baseStartTime = new Date('2024-01-01T09:00:00Z').getTime()
  const baseEndTime = new Date('2024-01-01T10:00:00Z').getTime()

  const recurrence: EventRecurrence = {
    frequency: 'daily',
    interval: 2, // Every 2 days
    count: 5, // Maximum 5 occurrences
  }

  // Generate occurrences for the first week of January
  const options: RecurrenceGenerationOptions = {
    rangeStart: baseStartTime,
    rangeEnd: new Date('2024-01-07T23:59:59Z').getTime(),
  }

  const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

  console.log('Daily recurrence (every 2 days):')
  occurrences.forEach((occ, index) => {
    const date = new Date(occ.startsAt)
    console.log(`  ${index + 1}. ${date.toISOString()}`)
  })

  return occurrences
}

// Example: Weekly recurrence on specific weekdays
export function exampleWeeklyRecurrence() {
  const baseStartTime = new Date('2024-01-01T14:30:00Z').getTime() // Monday
  const baseEndTime = new Date('2024-01-01T15:30:00Z').getTime()

  const recurrence: EventRecurrence = {
    frequency: 'weekly',
    interval: 1,
    byWeekday: [1, 3, 5], // Monday, Wednesday, Friday
    until: new Date('2024-01-31T23:59:59Z'),
  }

  const options: RecurrenceGenerationOptions = {
    rangeStart: baseStartTime,
    rangeEnd: new Date('2024-01-31T23:59:59Z').getTime(),
  }

  const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

  console.log('Weekly recurrence (Mon, Wed, Fri):')
  occurrences.forEach((occ, index) => {
    const date = new Date(occ.startsAt)
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
    console.log(`  ${index + 1}. ${dayName} ${date.toISOString()}`)
  })

  return occurrences
}

// Example: Monthly recurrence
export function exampleMonthlyRecurrence() {
  const baseStartTime = new Date('2024-01-15T10:00:00Z').getTime() // 15th day
  const baseEndTime = new Date('2024-01-15T11:00:00Z').getTime()

  const recurrence: EventRecurrence = {
    frequency: 'monthly',
    interval: 1, // Every month
    count: 12, // For a full year
  }

  const options: RecurrenceGenerationOptions = {
    rangeStart: baseStartTime,
    rangeEnd: new Date('2024-12-31T23:59:59Z').getTime(),
  }

  const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

  console.log('Monthly recurrence (15th of each month):')
  occurrences.forEach((occ, index) => {
    const date = new Date(occ.startsAt)
    console.log(`  ${index + 1}. ${date.toISOString()}`)
  })

  return occurrences
}

// Example: Checking if a specific date matches a recurrence
export function exampleRecurrenceMatching() {
  const baseStartTime = new Date('2024-01-01T09:00:00Z').getTime()

  const recurrence: EventRecurrence = {
    frequency: 'weekly',
    interval: 2, // Every 2 weeks
    byWeekday: [1], // Only Mondays
  }

  const testDates = [
    new Date('2024-01-08T09:00:00Z').getTime(), // Next Monday (1 week later)
    new Date('2024-01-15T09:00:00Z').getTime(), // Monday 2 weeks later - should match
    new Date('2024-01-22T09:00:00Z').getTime(), // Monday 3 weeks later
    new Date('2024-01-29T09:00:00Z').getTime(), // Monday 4 weeks later - should match
  ]

  console.log('Recurrence matching (every 2 weeks on Monday):')
  testDates.forEach(testDate => {
    const matches = isRecurrenceMatch(testDate, baseStartTime, recurrence)
    const date = new Date(testDate)
    console.log(`  ${date.toISOString()}: ${matches ? 'MATCHES' : 'does not match'}`)
  })
}

// Example: Finding the next occurrence
export function exampleNextOccurrence() {
  const baseStartTime = new Date('2024-01-01T09:00:00Z').getTime()
  const baseEndTime = new Date('2024-01-01T10:00:00Z').getTime()

  const recurrence: EventRecurrence = {
    frequency: 'daily',
    interval: 3, // Every 3 days
  }

  const fromDate = new Date('2024-01-05T12:00:00Z').getTime() // Friday afternoon

  const nextOcc = getNextOccurrence(fromDate, baseStartTime, baseEndTime, recurrence)

  console.log('Next occurrence after Friday Jan 5th:')
  if (nextOcc) {
    const date = new Date(nextOcc.startsAt)
    console.log(`  Next: ${date.toISOString()} (sequence: ${nextOcc.sequence})`)
  } else {
    console.log('  No more occurrences')
  }

  return nextOcc
}

// Example: Working with all-day events and timezones
export function exampleAllDayEvents() {
  // For all-day events, use start/end of day utilities with timezone
  const eventDate = new Date('2024-01-01T15:30:00Z').getTime() // Some time during the day

  // Same day but in New York timezone
  const allDayStartNY = getStartOfDay(eventDate, 'America/Santiago')
  const allDayEndNY = getEndOfDay(eventDate, 'America/Santiago')

  const recurrence: EventRecurrence = {
    frequency: 'weekly',
    interval: 1,
    byWeekday: [1, 3, 5], // Monday, Wednesday, Friday
  }

  const options: RecurrenceGenerationOptions = {
    rangeStart: allDayStartNY,
    rangeEnd: new Date('2024-01-31T23:59:59Z').getTime(),
    timezone: 'America/Santiago', // Use New York timezone for calculations
  }

  const occurrences = generateRecurrenceOccurrences(allDayStartNY, allDayEndNY, recurrence, options)

  console.log('All-day weekly events in New York timezone:')
  occurrences.slice(0, 5).forEach((occ, index) => {
    const startDate = new Date(occ.startsAt)
    const endDate = new Date(occ.endsAt)
    console.log(`  ${index + 1}. ${startDate.toDateString()} to ${endDate.toDateString()}`)
  })

  return occurrences
}

// Example: Calculating total occurrences
export function exampleTotalOccurrences() {
  const baseStartTime = new Date('2024-01-01T09:00:00Z').getTime()

  // Example 1: Limited by count
  const recurrenceWithCount: EventRecurrence = {
    frequency: 'daily',
    interval: 1,
    count: 30,
  }

  // Example 2: Limited by until date
  const recurrenceWithUntil: EventRecurrence = {
    frequency: 'weekly',
    interval: 1,
    until: new Date('2024-12-31T23:59:59Z'),
  }

  // Example 3: Infinite recurrence
  const infiniteRecurrence: EventRecurrence = {
    frequency: 'monthly',
    interval: 1,
  }

  console.log('Total occurrences:')
  console.log(`  With count (30 daily): ${calculateTotalOccurrences(baseStartTime, recurrenceWithCount)}`)
  console.log(`  With until date (weekly for 2024): ${calculateTotalOccurrences(baseStartTime, recurrenceWithUntil)}`)
  console.log(`  Infinite (monthly): ${calculateTotalOccurrences(baseStartTime, infiniteRecurrence)}`)
}

// Example: Complex business scenario - Team meetings
export function exampleTeamMeetings() {
  // Team meeting every Tuesday and Thursday at 2 PM
  const baseStartTime = new Date('2024-01-02T14:00:00Z').getTime() // Tuesday
  const baseEndTime = new Date('2024-01-02T15:00:00Z').getTime()

  const recurrence: EventRecurrence = {
    frequency: 'weekly',
    interval: 1,
    byWeekday: [2, 4], // Tuesday and Thursday
    until: new Date('2024-03-31T23:59:59Z'), // End of Q1
  }

  // Get all meetings for Q1 2024
  const options: RecurrenceGenerationOptions = {
    rangeStart: baseStartTime,
    rangeEnd: new Date('2024-03-31T23:59:59Z').getTime(),
  }

  const meetings = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

  console.log(`Team meetings Q1 2024 (${meetings.length} total):`)
  meetings.slice(0, 10).forEach((meeting, index) => {
    const date = new Date(meeting.startsAt)
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]
    console.log(`  ${index + 1}. ${dayName} ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`)
  })

  if (meetings.length > 10) {
    console.log(`  ... and ${meetings.length - 10} more meetings`)
  }

  return meetings
}

// Example: Exception handling for edge cases
export function exampleEdgeCases() {
  const baseStartTime = new Date('2024-02-29T10:00:00Z').getTime() // Leap day

  const yearlyRecurrence: EventRecurrence = {
    frequency: 'yearly',
    interval: 1,
  }

  // Check if leap day occurs in non-leap years
  const testYears = [2025, 2026, 2027, 2028] // 2028 is next leap year

  console.log('Leap day recurrence:')
  testYears.forEach(year => {
    const testDate = new Date(`${year}-02-29T10:00:00Z`).getTime()
    const isValid = !isNaN(testDate) // Check if date is valid
    const matches = isValid ? isRecurrenceMatch(testDate, baseStartTime, yearlyRecurrence) : false

    console.log(`  ${year}: ${isValid ? (matches ? 'MATCHES' : 'does not match') : 'invalid date'}`)
  })
}

// Example: Timezone-aware recurring events
export function exampleTimezoneHandling() {
  // Meeting at 2 PM Eastern Time every weekday
  const easternTime = 'America/Santiago'
  const baseStartTime = new Date('2024-01-01T14:00:00-05:00').getTime() // 2 PM EST
  const baseEndTime = new Date('2024-01-01T15:00:00-05:00').getTime() // 3 PM EST

  const recurrence: EventRecurrence = {
    frequency: 'daily',
    interval: 1,
    byWeekday: [1, 2, 3, 4, 5], // Monday through Friday
    count: 10,
  }

  const options: RecurrenceGenerationOptions = {
    rangeStart: baseStartTime,
    rangeEnd: new Date('2024-12-31T23:59:59Z').getTime(),
    timezone: easternTime,
  }

  const meetings = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

  console.log('Weekday meetings in Eastern Time:')
  meetings.forEach((meeting, index) => {
    const utcDate = new Date(meeting.startsAt)
    const etDate = new Date(meeting.startsAt).toLocaleString('en-US', {
      timeZone: easternTime,
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })

    console.log(`  ${index + 1}. ${etDate} (UTC: ${utcDate.toISOString()})`)
  })

  // Test getting the next occurrence after a specific date in the timezone
  const checkDate = new Date('2024-01-05T20:00:00Z').getTime() // Friday evening UTC
  const nextMeeting = getNextOccurrence(checkDate, baseStartTime, baseEndTime, recurrence, easternTime)

  if (nextMeeting) {
    const nextInET = new Date(nextMeeting.startsAt).toLocaleString('en-US', {
      timeZone: easternTime,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    })
    console.log(`\nNext meeting after Friday evening: ${nextInET}`)
  }

  return meetings
}

// Example: Cross-timezone scheduling
export function exampleCrossTimezoneScheduling() {
  // Global team standup: 9 AM in London, daily
  const londonTime = 'Europe/London'
  const baseStartTime = new Date('2024-01-01T09:00:00Z').getTime() // 9 AM UTC (GMT)
  const baseEndTime = new Date('2024-01-01T09:30:00Z').getTime() // 9:30 AM UTC

  const recurrence: EventRecurrence = {
    frequency: 'daily',
    interval: 1,
    byWeekday: [1, 2, 3, 4, 5], // Weekdays only
    count: 5,
  }

  const options: RecurrenceGenerationOptions = {
    rangeStart: baseStartTime,
    rangeEnd: new Date('2024-01-31T23:59:59Z').getTime(),
    timezone: londonTime,
  }

  const standups = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

  console.log('Global team standup schedule:')
  standups.forEach((standup, index) => {
    const times = {
      london: new Date(standup.startsAt).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
      newYork: new Date(standup.startsAt).toLocaleString('en-US', {
        timeZone: 'America/Santiago',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
      tokyo: new Date(standup.startsAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        hour: '2-digit',
        minute: '2-digit',
        timeZoneName: 'short',
      }),
    }

    const date = new Date(standup.startsAt).toLocaleDateString('en-GB', {
      timeZone: londonTime,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })

    console.log(`  ${index + 1}. ${date} - London: ${times.london}, NYC: ${times.newYork}, Tokyo: ${times.tokyo}`)
  })

  return standups
}

// Export all examples for easy testing
export const examples = {
  daily: exampleDailyRecurrence,
  weekly: exampleWeeklyRecurrence,
  monthly: exampleMonthlyRecurrence,
  matching: exampleRecurrenceMatching,
  nextOccurrence: exampleNextOccurrence,
  allDay: exampleAllDayEvents,
  totalOccurrences: exampleTotalOccurrences,
  teamMeetings: exampleTeamMeetings,
  edgeCases: exampleEdgeCases,
  timezoneHandling: exampleTimezoneHandling,
  crossTimezone: exampleCrossTimezoneScheduling,
}

// Run all examples if this file is executed directly
if (typeof require !== 'undefined' && require.main === module) {
  console.log('=== Recurrence Utilities Examples ===\n')

  Object.entries(examples).forEach(([name, example]) => {
    console.log(`--- ${name.toUpperCase()} ---`)
    try {
      example()
    } catch (error) {
      console.error(`Error in ${name}:`, error)
    }
    console.log('')
  })
}
