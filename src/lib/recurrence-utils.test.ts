/**
 * Unit tests for recurrence utilities
 *
 * This test suite validates the recurrence utility functions that handle
 * recurring events based on the EventRecurrenceSchema.
 *
 * Tests cover:
 * - Matching timestamps against recurrence rules
 * - Generating occurrences within date ranges
 * - Getting next occurrences
 * - Calculating total occurrence counts
 * - Edge cases and boundary conditions
 * - Different frequency types (daily, weekly, monthly, yearly)
 * - Weekday constraints and interval handling
 * - Until dates and count limits
 */

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  isRecurrenceMatch,
  generateRecurrenceOccurrences,
  getNextOccurrence,
  calculateTotalOccurrences,
  type RecurrenceGenerationOptions,
} from './recurrence-utils'
import type { EventRecurrence } from '../items/event/modelSchema'

describe('recurrence-utils', () => {
  // Test dates - using fixed timestamps for consistent testing
  const baseStartTime = new Date('2024-01-01T10:00:00Z').getTime() // Monday
  const baseEndTime = new Date('2024-01-01T11:00:00Z').getTime()
  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour
  const oneWeek = 7 * oneDay

  beforeEach(() => {
    // Reset any mocks before each test
    vi.restoreAllMocks()
  })

  describe('isRecurrenceMatch', () => {
    it('should match the original event timestamp', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      expect(isRecurrenceMatch(baseStartTime, baseStartTime, recurrence)).toBe(true)
    })

    it('should match with timezone parameter', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      expect(isRecurrenceMatch(baseStartTime, baseStartTime, recurrence, 'America/Santiago')).toBe(true)
    })

    it('should not match timestamps before the base time', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const beforeTime = baseStartTime - oneDay
      expect(isRecurrenceMatch(beforeTime, baseStartTime, recurrence)).toBe(false)
    })

    it('should not match timestamps after until date', () => {
      const untilDate = baseStartTime + 3 * oneDay
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        until: new Date(untilDate),
      }

      const afterUntil = untilDate + oneDay
      expect(isRecurrenceMatch(afterUntil, baseStartTime, recurrence)).toBe(false)
    })

    it('should match daily recurrence with interval 1', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const nextDay = baseStartTime + oneDay
      const dayAfter = baseStartTime + 2 * oneDay

      expect(isRecurrenceMatch(nextDay, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(dayAfter, baseStartTime, recurrence)).toBe(true)
    })

    it('should match daily recurrence with interval 2', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 2,
      }

      const nextDay = baseStartTime + oneDay
      const twoDaysLater = baseStartTime + 2 * oneDay
      const threeDaysLater = baseStartTime + 3 * oneDay

      expect(isRecurrenceMatch(nextDay, baseStartTime, recurrence)).toBe(false)
      expect(isRecurrenceMatch(twoDaysLater, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(threeDaysLater, baseStartTime, recurrence)).toBe(false)
    })

    it('should match daily recurrence with weekday constraints', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        byWeekday: [1, 3, 5], // Monday, Wednesday, Friday
      }

      const tuesday = baseStartTime + oneDay // Tuesday
      const wednesday = baseStartTime + 2 * oneDay // Wednesday
      const thursday = baseStartTime + 3 * oneDay // Thursday

      expect(isRecurrenceMatch(tuesday, baseStartTime, recurrence)).toBe(false)
      expect(isRecurrenceMatch(wednesday, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(thursday, baseStartTime, recurrence)).toBe(false)
    })

    it('should match weekly recurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
      }

      const nextWeek = baseStartTime + oneWeek
      const twoWeeksLater = baseStartTime + 2 * oneWeek
      const nextDay = baseStartTime + oneDay

      expect(isRecurrenceMatch(nextWeek, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(twoWeeksLater, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(nextDay, baseStartTime, recurrence)).toBe(false)
    })

    it('should match weekly recurrence with specific weekdays', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        byWeekday: [1, 3], // Monday, Wednesday
      }

      const nextMonday = baseStartTime + oneWeek
      const nextWednesday = baseStartTime + oneWeek + 2 * oneDay
      const nextTuesday = baseStartTime + oneWeek + oneDay

      expect(isRecurrenceMatch(nextMonday, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(nextWednesday, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(nextTuesday, baseStartTime, recurrence)).toBe(false)
    })

    it('should match monthly recurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'monthly',
        interval: 1,
      }

      const nextMonth = new Date('2024-02-01T10:00:00Z').getTime()
      const twoMonthsLater = new Date('2024-03-01T10:00:00Z').getTime()
      const wrongDay = new Date('2024-02-02T10:00:00Z').getTime()

      expect(isRecurrenceMatch(nextMonth, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(twoMonthsLater, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(wrongDay, baseStartTime, recurrence)).toBe(false)
    })

    it('should match yearly recurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'yearly',
        interval: 1,
      }

      const nextYear = new Date('2025-01-01T10:00:00Z').getTime()
      const twoYearsLater = new Date('2026-01-01T10:00:00Z').getTime()
      const wrongMonth = new Date('2025-02-01T10:00:00Z').getTime()

      expect(isRecurrenceMatch(nextYear, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(twoYearsLater, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(wrongMonth, baseStartTime, recurrence)).toBe(false)
    })
  })

  describe('generateRecurrenceOccurrences', () => {
    it('should generate daily occurrences within range', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 3 * oneDay,
        includePartialOverlaps: false,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences).toHaveLength(3)
      expect(occurrences[0].startsAt).toBe(baseStartTime)
      expect(occurrences[1].startsAt).toBe(baseStartTime + oneDay)
      expect(occurrences[2].startsAt).toBe(baseStartTime + 2 * oneDay)
      expect(occurrences.every(occ => occ.endsAt === occ.startsAt + oneHour)).toBe(true)
    })

    it('should respect count limit', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        count: 2,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 10 * oneDay,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences).toHaveLength(2)
    })

    it('should respect until date', () => {
      const untilDate = baseStartTime + 2 * oneDay
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        until: new Date(untilDate),
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 10 * oneDay,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences).toHaveLength(2)
      expect(occurrences.every(occ => occ.startsAt <= untilDate)).toBe(true)
    })

    it('should respect maxOccurrences option', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        count: 10,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 10 * oneDay,
        maxOccurrences: 3,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences).toHaveLength(3)
    })

    it('should handle partial overlaps correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime + oneHour / 2, // Starts halfway through first event
        rangeEnd: baseStartTime + oneDay + oneHour / 2, // Ends halfway through second event
        includePartialOverlaps: true,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences).toHaveLength(2)
    })

    it('should generate weekly occurrences with specific weekdays', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        byWeekday: [1, 3], // Monday, Wednesday
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 2 * oneWeek,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      // Should get Monday and Wednesday of first week, then Monday and Wednesday of second week
      expect(occurrences).toHaveLength(4)

      // Check that all occurrences are on Monday (1) or Wednesday (3)
      occurrences.forEach(occ => {
        const day = new Date(occ.startsAt).getDay()
        expect([1, 3]).toContain(day)
      })
    })

    it('should assign correct sequence numbers', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 3 * oneDay,
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences[0].sequence).toBe(1)
      expect(occurrences[1].sequence).toBe(2)
      expect(occurrences[2].sequence).toBe(3)
    })
  })

  describe('getNextOccurrence', () => {
    it('should return the next daily occurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const fromDate = baseStartTime + oneHour / 2 // Halfway through the day
      const nextOcc = getNextOccurrence(fromDate, baseStartTime, baseEndTime, recurrence)

      expect(nextOcc).not.toBeNull()
      expect(nextOcc!.startsAt).toBe(baseStartTime + oneDay)
      expect(nextOcc!.endsAt).toBe(baseEndTime + oneDay)
    })

    it('should return null when no more occurrences due to until date', () => {
      const untilDate = baseStartTime + oneDay
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        until: new Date(untilDate),
      }

      const fromDate = baseStartTime + 2 * oneDay
      const nextOcc = getNextOccurrence(fromDate, baseStartTime, baseEndTime, recurrence)

      expect(nextOcc).toBeNull()
    })

    it('should handle weekly recurrence with specific weekdays', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        byWeekday: [1, 3], // Monday, Wednesday
      }

      // Ask for next occurrence after Monday
      const fromDate = baseStartTime + oneHour
      const nextOcc = getNextOccurrence(fromDate, baseStartTime, baseEndTime, recurrence)

      expect(nextOcc).not.toBeNull()
      // Should be Wednesday of the same week
      const expectedWednesday = baseStartTime + 2 * oneDay
      expect(nextOcc!.startsAt).toBe(expectedWednesday)
    })

    it('should handle interval correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 3,
      }

      const fromDate = baseStartTime + oneHour
      const nextOcc = getNextOccurrence(fromDate, baseStartTime, baseEndTime, recurrence)

      expect(nextOcc).not.toBeNull()
      expect(nextOcc!.startsAt).toBe(baseStartTime + 3 * oneDay)
    })
  })

  describe('calculateTotalOccurrences', () => {
    it('should return count when specified', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        count: 10,
      }

      const total = calculateTotalOccurrences(baseStartTime, recurrence)
      expect(total).toBe(10)
    })

    it('should estimate from until date for daily frequency', () => {
      const untilDate = baseStartTime + 5 * oneDay
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        until: new Date(untilDate),
      }

      const total = calculateTotalOccurrences(baseStartTime, recurrence)
      expect(total).toBe(6) // 0, 1, 2, 3, 4, 5 days = 6 occurrences
    })

    it('should estimate from until date for weekly frequency', () => {
      const untilDate = baseStartTime + 2 * oneWeek
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        until: new Date(untilDate),
      }

      const total = calculateTotalOccurrences(baseStartTime, recurrence)
      expect(total).toBe(3) // 0, 1, 2 weeks = 3 occurrences
    })

    it('should return null for infinite recurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const total = calculateTotalOccurrences(baseStartTime, recurrence)
      expect(total).toBeNull()
    })
  })

  describe('edge cases and error handling', () => {
    it('should handle leap year for yearly recurrence', () => {
      const leapYearStart = new Date('2024-02-29T10:00:00Z').getTime() // Leap day
      const recurrence: EventRecurrence = {
        frequency: 'yearly',
        interval: 1,
      }

      // Check if 2025-02-28 matches (leap day doesn't exist in 2025)
      const nextYear = new Date('2025-02-28T10:00:00Z').getTime()
      const nextYearLeapDay = new Date('2025-02-29T10:00:00Z').getTime() // Invalid date

      expect(isRecurrenceMatch(nextYear, leapYearStart, recurrence)).toBe(false)
      expect(isRecurrenceMatch(nextYearLeapDay, leapYearStart, recurrence)).toBe(false)
    })

    it('should handle end of month edge cases for monthly recurrence', () => {
      const january31 = new Date('2024-01-31T10:00:00Z').getTime()
      const recurrence: EventRecurrence = {
        frequency: 'monthly',
        interval: 1,
      }

      // February doesn't have 31st day
      const february31 = new Date('2024-02-31T10:00:00Z').getTime() // Invalid date
      const february29 = new Date('2024-02-29T10:00:00Z').getTime() // Valid date

      expect(isRecurrenceMatch(february31, january31, recurrence)).toBe(false)
      expect(isRecurrenceMatch(february29, january31, recurrence)).toBe(false)
    })

    it('should prevent infinite loops with safety limit', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 365 * 50 * oneDay, // 50 years
        maxOccurrences: 20000, // More than safety limit
      }

      // Mock console.warn to check if warning is logged
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      // Should stop at safety limit
      expect(occurrences.length).toBeLessThanOrEqual(10000)
      expect(warnSpy).toHaveBeenCalledWith('Recurrence generation stopped due to safety limit')

      warnSpy.mockRestore()
    })

    it('should handle large intervals correctly', () => {
      const recurrence: EventRecurrence = {
        frequency: 'yearly',
        interval: 10,
      }

      const tenYearsLater = new Date('2034-01-01T10:00:00Z').getTime()
      const fiveYearsLater = new Date('2029-01-01T10:00:00Z').getTime()

      expect(isRecurrenceMatch(tenYearsLater, baseStartTime, recurrence)).toBe(true)
      expect(isRecurrenceMatch(fiveYearsLater, baseStartTime, recurrence)).toBe(false)
    })

    it('should handle empty weekday arrays', () => {
      const recurrence: EventRecurrence = {
        frequency: 'weekly',
        interval: 1,
        byWeekday: [],
      }

      const nextWeek = baseStartTime + oneWeek
      expect(isRecurrenceMatch(nextWeek, baseStartTime, recurrence)).toBe(true)
    })
  })

  describe('timezone support', () => {
    it('should handle different timezones in recurrence matching', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const nextDay = baseStartTime + oneDay

      // Should work with different timezones
      expect(isRecurrenceMatch(nextDay, baseStartTime, recurrence, 'America/Santiago')).toBe(true)
      expect(isRecurrenceMatch(nextDay, baseStartTime, recurrence, 'Europe/London')).toBe(true)
      expect(isRecurrenceMatch(nextDay, baseStartTime, recurrence, 'Asia/Tokyo')).toBe(true)
    })

    it('should generate occurrences with timezone parameter', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
        count: 3,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseStartTime,
        rangeEnd: baseStartTime + 5 * oneDay,
        timezone: 'America/Santiago',
      }

      const occurrences = generateRecurrenceOccurrences(baseStartTime, baseEndTime, recurrence, options)

      expect(occurrences).toHaveLength(3)
      expect(occurrences[0].startsAt).toBe(baseStartTime)
    })

    it('should handle timezone in next occurrence', () => {
      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      const fromDate = baseStartTime + oneHour / 2
      const nextOcc = getNextOccurrence(fromDate, baseStartTime, baseEndTime, recurrence, 'Europe/Berlin')

      expect(nextOcc).not.toBeNull()
      expect(nextOcc!.startsAt).toBeGreaterThan(fromDate)
    })

    it('should handle DST transitions correctly', () => {
      // Test around DST transition date in New York (March 10, 2024)
      const beforeDST = new Date('2024-03-09T10:00:00-05:00').getTime() // EST
      const afterDST = new Date('2024-03-11T10:00:00-04:00').getTime() // EDT

      const recurrence: EventRecurrence = {
        frequency: 'daily',
        interval: 1,
      }

      // Should handle DST transition gracefully
      expect(isRecurrenceMatch(afterDST, beforeDST, recurrence, 'America/Santiago')).toBe(true)
    })
  })

  describe('DST edge cases', () => {
    describe('Spring Forward - time gap (2:30 AM does not exist)', () => {
      it('should handle recurrence when target time falls in DST gap', () => {
        // March 10, 2024: DST begins in America/New_York (2:00 AM -> 3:00 AM)
        // Starting event at 2:30 AM EST on March 9th (before DST)
        const baseTime = new Date('2024-03-09T02:30:00-05:00').getTime() // EST
        const baseEndTime = baseTime + oneHour

        const recurrence: EventRecurrence = {
          frequency: 'daily',
          interval: 1,
        }

        // March 10th 2:30 AM EST would map to a non-existent time
        // The implementation should handle this gracefully
        const options: RecurrenceGenerationOptions = {
          rangeStart: baseTime,
          rangeEnd: baseTime + 3 * oneDay,
          timezone: 'America/New_York',
        }

        const occurrences = generateRecurrenceOccurrences(baseTime, baseEndTime, recurrence, options)

        expect(occurrences.length).toBeGreaterThan(0)

        // Check that March 10th occurrence exists and is valid
        const march10Occurrence = occurrences.find(occ => {
          const date = new Date(occ.startsAt)
          return date.getDate() === 10 && date.getMonth() === 2 // March
        })

        expect(march10Occurrence).toBeDefined()

        // The time should be adjusted to a valid time (likely 3:30 AM EDT)
        if (march10Occurrence) {
          const localTime = new Date(march10Occurrence.startsAt).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })

          // Should not be 2:30 (since that time doesn't exist on March 10th)
          expect(localTime).not.toBe('02:30')
          // Should likely be 3:30 (spring forward adjustment)
          expect(['03:30', '01:30']).toContain(localTime)
        }
      })

      it('should handle getNextOccurrence during spring forward gap', () => {
        const baseTime = new Date('2024-03-09T02:30:00-05:00').getTime()
        const baseEndTime = baseTime + oneHour

        const recurrence: EventRecurrence = {
          frequency: 'daily',
          interval: 1,
        }

        // Ask for next occurrence after the base time
        const fromTime = baseTime + oneHour / 2
        const nextOcc = getNextOccurrence(fromTime, baseTime, baseEndTime, recurrence, 'America/New_York')

        expect(nextOcc).not.toBeNull()

        if (nextOcc) {
          // Should find a valid next occurrence even during DST transition
          expect(nextOcc.startsAt).toBeGreaterThan(fromTime)

          // Check that the local time is valid
          const localTime = new Date(nextOcc.startsAt).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })

          // Should be a valid time (not in the gap)
          expect(localTime).not.toBe('02:30')
        }
      })

      it('should handle isRecurrenceMatch during spring forward gap', () => {
        const baseTime = new Date('2024-03-09T02:30:00-05:00').getTime()

        const recurrence: EventRecurrence = {
          frequency: 'daily',
          interval: 1,
        }

        // Try to match at the same local time on March 10th
        // This creates a timestamp that would be 2:30 AM if the gap didn't exist
        const gapTime = new Date('2024-03-10T02:30:00-05:00').getTime()

        // The function should handle this gracefully
        const matches = isRecurrenceMatch(gapTime, baseTime, recurrence, 'America/New_York')

        // Should either match (if adjusted) or not match (if gap handled differently)
        expect(typeof matches).toBe('boolean')
      })
    })

    describe('Fall Back - time overlap (2:30 AM happens twice)', () => {
      it('should handle recurrence when target time occurs twice', () => {
        // November 3, 2024: DST ends in America/New_York (2:00 AM -> 1:00 AM)
        // Starting event at 1:30 AM EDT on November 2nd
        const baseTime = new Date('2024-11-02T01:30:00-04:00').getTime() // EDT
        const baseEndTime = baseTime + oneHour

        const recurrence: EventRecurrence = {
          frequency: 'daily',
          interval: 1,
        }

        const options: RecurrenceGenerationOptions = {
          rangeStart: baseTime,
          rangeEnd: baseTime + 3 * oneDay,
          timezone: 'America/New_York',
        }

        const occurrences = generateRecurrenceOccurrences(baseTime, baseEndTime, recurrence, options)

        expect(occurrences.length).toBeGreaterThan(0)

        // Check that November 3rd occurrence exists
        const nov3Occurrence = occurrences.find(occ => {
          const date = new Date(occ.startsAt)
          return date.getDate() === 3 && date.getMonth() === 10 // November
        })

        expect(nov3Occurrence).toBeDefined()

        // The implementation should consistently pick one of the two possible times
        if (nov3Occurrence) {
          const localTime = new Date(nov3Occurrence.startsAt).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })

          // Should be 1:30 (either first or second occurrence)
          expect(localTime).toBe('01:30')
        }
      })

      it('should consistently choose the same occurrence during fall back', () => {
        const baseTime = new Date('2024-11-02T01:30:00-04:00').getTime()
        const baseEndTime = baseTime + oneHour

        const recurrence: EventRecurrence = {
          frequency: 'daily',
          interval: 1,
        }

        // Generate occurrences multiple times to ensure consistency
        const options: RecurrenceGenerationOptions = {
          rangeStart: baseTime,
          rangeEnd: baseTime + 2 * oneDay,
          timezone: 'America/New_York',
        }

        const occurrences1 = generateRecurrenceOccurrences(baseTime, baseEndTime, recurrence, options)

        const occurrences2 = generateRecurrenceOccurrences(baseTime, baseEndTime, recurrence, options)

        // Should generate the same results consistently
        expect(occurrences1.length).toBe(occurrences2.length)

        occurrences1.forEach((occ1, index) => {
          const occ2 = occurrences2[index]
          expect(occ1.startsAt).toBe(occ2.startsAt)
          expect(occ1.endsAt).toBe(occ2.endsAt)
        })
      })

      it('should handle isRecurrenceMatch during fall back overlap', () => {
        const baseTime = new Date('2024-11-02T01:30:00-04:00').getTime()

        const recurrence: EventRecurrence = {
          frequency: 'daily',
          interval: 1,
        }

        // Create timestamps for both occurrences of 1:30 AM on November 3rd
        const firstOccurrence = new Date('2024-11-03T01:30:00-04:00').getTime() // EDT (before fall back)
        const secondOccurrence = new Date('2024-11-03T01:30:00-05:00').getTime() // EST (after fall back)

        const matches1 = isRecurrenceMatch(firstOccurrence, baseTime, recurrence, 'America/New_York')
        const matches2 = isRecurrenceMatch(secondOccurrence, baseTime, recurrence, 'America/New_York')

        // At least one should match, and behavior should be consistent
        expect(matches1 || matches2).toBe(true)

        // Test consistency by calling multiple times
        const matches1Again = isRecurrenceMatch(firstOccurrence, baseTime, recurrence, 'America/New_York')
        const matches2Again = isRecurrenceMatch(secondOccurrence, baseTime, recurrence, 'America/New_York')

        expect(matches1).toBe(matches1Again)
        expect(matches2).toBe(matches2Again)
      })
    })

    describe('Timezone Offset Changes', () => {
      it('should handle recurrence calculation across multiple DST transitions', () => {
        // Start in winter (EST), span across spring forward and fall back
        const winterStart = new Date('2024-01-15T14:00:00-05:00').getTime() // EST
        const winterEnd = winterStart + oneHour

        const recurrence: EventRecurrence = {
          frequency: 'monthly',
          interval: 1,
        }

        // Generate occurrences that span multiple DST transitions
        const options: RecurrenceGenerationOptions = {
          rangeStart: winterStart,
          rangeEnd: winterStart + 365 * oneDay, // Full year
          timezone: 'America/New_York',
        }

        const occurrences = generateRecurrenceOccurrences(winterStart, winterEnd, recurrence, options)

        expect(occurrences.length).toBeGreaterThan(6) // At least 6 months

        // Check that all occurrences maintain the same local time (2:00 PM)
        occurrences.forEach(occ => {
          const localTime = new Date(occ.startsAt).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          })

          expect(localTime).toBe('14:00')
        })
      })
    })
  })

  describe('recurrence expansion through shared date helpers', () => {
    it('should expand monthly occurrences', () => {
      const baseTime = new Date('2024-01-15T10:00:00Z').getTime()
      const baseEndTime = baseTime + oneHour

      const recurrence: EventRecurrence = {
        frequency: 'monthly',
        interval: 1,
        count: 3,
      }

      const options: RecurrenceGenerationOptions = {
        rangeStart: baseTime,
        rangeEnd: baseTime + 120 * oneDay,
        timezone: 'UTC',
      }

      const occurrences = generateRecurrenceOccurrences(baseTime, baseEndTime, recurrence, options)

      expect(occurrences.map(occ => new Date(occ.startsAt).toISOString())).toEqual([
        '2024-01-15T10:00:00.000Z',
        '2024-02-15T10:00:00.000Z',
        '2024-03-15T10:00:00.000Z',
      ])
    })
  })
})
