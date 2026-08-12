import { describe, expect, it } from 'vite-plus/test'
import {
  getDateString,
  isSameDate,
  isDateInRange,
  isMultiDayEvent,
  isDateBefore,
  isDateAfter,
  isDateBeforeOrEqual,
  isDateAfterOrEqual,
  getDaysDifference,
  getTodayDateString,
  isToday,
  isPastDate,
  isFutureDate,
  calculateDDay,
  getDateComponentsInTimezone,
  addDaysToComponents,
  addMonthsToComponents,
  buildCalendarMatrix,
} from './date-utils'

describe('date-utils', () => {
  const date1 = new Date(2024, 0, 15, 10, 30) // Monday
  const date2 = new Date(2024, 0, 15, 23, 59, 59) // Same day, different time
  const date3 = new Date(2024, 0, 16, 0, 0) // Next day
  const date4 = new Date(2024, 0, 20, 15, 0) // 5 days later

  describe('getDateString', () => {
    it('should return YYYY-MM-DD format for Date objects', () => {
      expect(getDateString(date1)).toBe('2024-01-15')
      expect(getDateString(date3)).toBe('2024-01-16')
    })

    it('should return YYYY-MM-DD format for timestamps', () => {
      expect(getDateString(date1.getTime())).toBe('2024-01-15')
      expect(getDateString(date3.getTime())).toBe('2024-01-16')
    })

    it('should use local calendar components', () => {
      const early = new Date(2024, 0, 15, 0, 30)
      const late = new Date(2024, 0, 15, 23, 30)

      expect(getDateString(early)).toBe('2024-01-15')
      expect(getDateString(late)).toBe('2024-01-15')
    })
  })

  describe('isSameDate', () => {
    it('should return true for same calendar day', () => {
      expect(isSameDate(date1, date2)).toBe(true)
    })

    it('should return false for different calendar days', () => {
      expect(isSameDate(date1, date3)).toBe(false)
    })

    it('should work with mixed Date objects and timestamps', () => {
      expect(isSameDate(date1, date2.getTime())).toBe(true)
      expect(isSameDate(date1.getTime(), date3)).toBe(false)
    })
  })

  describe('isDateInRange', () => {
    it('should return true for date within range (inclusive)', () => {
      expect(isDateInRange(date2, date1, date3)).toBe(true)
      expect(isDateInRange(date1, date1, date3)).toBe(true) // Start boundary
      expect(isDateInRange(date3, date1, date3)).toBe(true) // End boundary
    })

    it('should return false for date outside range', () => {
      expect(isDateInRange(date4, date1, date3)).toBe(false)
    })
  })

  describe('isMultiDayEvent', () => {
    it('should return false for same day events', () => {
      expect(isMultiDayEvent(date1, date2)).toBe(false)
    })

    it('should return true for multi-day events', () => {
      expect(isMultiDayEvent(date1, date3)).toBe(true)
      expect(isMultiDayEvent(date1, date4)).toBe(true)
    })
  })

  describe('date comparison functions', () => {
    it('should correctly compare dates', () => {
      expect(isDateBefore(date1, date3)).toBe(true)
      expect(isDateBefore(date3, date1)).toBe(false)
      expect(isDateBefore(date1, date2)).toBe(false) // Same day

      expect(isDateAfter(date3, date1)).toBe(true)
      expect(isDateAfter(date1, date3)).toBe(false)
      expect(isDateAfter(date1, date2)).toBe(false) // Same day

      expect(isDateBeforeOrEqual(date1, date3)).toBe(true)
      expect(isDateBeforeOrEqual(date1, date2)).toBe(true) // Same day
      expect(isDateBeforeOrEqual(date3, date1)).toBe(false)

      expect(isDateAfterOrEqual(date3, date1)).toBe(true)
      expect(isDateAfterOrEqual(date1, date2)).toBe(true) // Same day
      expect(isDateAfterOrEqual(date1, date3)).toBe(false)
    })
  })

  describe('getDaysDifference', () => {
    it('should calculate correct day differences', () => {
      expect(getDaysDifference(date1, date3)).toBe(1)
      expect(getDaysDifference(date1, date4)).toBe(5)
      expect(getDaysDifference(date1, date2)).toBe(0) // Same day
      expect(getDaysDifference(date3, date1)).toBe(-1) // Negative for past
    })
  })

  describe('today functions', () => {
    it('should handle today comparisons', () => {
      const today = new Date()
      const todayString = getTodayDateString()

      expect(todayString).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(isToday(today)).toBe(true)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      expect(isToday(yesterday)).toBe(false)
    })

    it('should handle past/future date checks', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)

      expect(isPastDate(yesterday)).toBe(true)
      expect(isFutureDate(tomorrow)).toBe(true)
      expect(isPastDate(tomorrow)).toBe(false)
      expect(isFutureDate(yesterday)).toBe(false)
    })
  })

  describe('calculateDDay', () => {
    it('should return correct D-Day format', () => {
      const today = new Date()
      const tomorrow = new Date()
      tomorrow.setDate(today.getDate() + 1)
      const yesterday = new Date()
      yesterday.setDate(today.getDate() - 1)

      // Note: calculateDDay adds 1 day to all calculations (preserving existing behavior)
      const tomorrowResult = calculateDDay(tomorrow)
      const yesterdayResult = calculateDDay(yesterday)

      expect(tomorrowResult).toMatch(/D-\d+/)
      // Yesterday result could be 'D-Day' or 'D+X' depending on the +1 adjustment
      expect(yesterdayResult).toMatch(/D[-+]\d+|D-Day/)
    })

    it('should handle string dates', () => {
      const result = calculateDDay('2024-12-25')
      expect(result).toMatch(/D[-+]\d+|D-Day/)
    })

    it('should return null for invalid input', () => {
      expect(calculateDDay(null as any)).toBe(null)
      expect(calculateDDay(undefined as any)).toBe(null)
      expect(calculateDDay('')).toBe(null)
    })
  })

  describe('timezone safety', () => {
    it('should handle daylight saving time transitions correctly', () => {
      const beforeDST = new Date(2024, 2, 9, 10)
      const afterDST = new Date(2024, 2, 11, 10)

      const daysDiff = getDaysDifference(beforeDST, afterDST)
      expect(daysDiff).toBe(2)
    })

    it('should treat local dates at the edges of a day as the same day', () => {
      const early = new Date(2024, 0, 15, 0, 30)
      const late = new Date(2024, 0, 15, 23, 30)

      expect(isSameDate(early, late)).toBe(true)
      expect(getDaysDifference(early, late)).toBe(0)
    })

    it('should handle midnight boundary cases', () => {
      const endOfDay = new Date(2024, 0, 15, 23, 59, 59)
      const startOfNextDay = new Date(2024, 0, 16, 0, 0, 0)

      expect(isSameDate(endOfDay, startOfNextDay)).toBe(false)
      expect(getDaysDifference(endOfDay, startOfNextDay)).toBe(1)
    })
  })

  describe('getDateComponentsInTimezone', () => {
    it('should accept both Date objects and timestamps', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const fromDate = getDateComponentsInTimezone(date)
      const fromTimestamp = getDateComponentsInTimezone(date.getTime())

      expect(fromTimestamp).toEqual(fromDate)
      expect(fromTimestamp).toMatchObject({ year: 2024, month: 0, date: 15 })
    })

    it('should return components in the given timezone', () => {
      const timestamp = new Date('2024-01-01T03:30:00Z').getTime()
      const inUTC = getDateComponentsInTimezone(timestamp, 'UTC')
      const inTokyo = getDateComponentsInTimezone(timestamp, 'Asia/Tokyo')

      expect(inUTC).toMatchObject({ date: 1, hours: 3 })
      expect(inTokyo).toMatchObject({ date: 1, hours: 12 })
    })
  })

  describe('addDaysToComponents', () => {
    it('should cross month boundaries', () => {
      const components = {
        year: 2024,
        month: 0,
        date: 31,
        day: 3,
        hours: 10,
        minutes: 30,
        seconds: 0,
        milliseconds: 0,
      }

      const result = addDaysToComponents(components, 1)

      expect(result).toMatchObject({ year: 2024, month: 1, date: 1, hours: 10, minutes: 30 })
    })
  })

  describe('addMonthsToComponents', () => {
    it('should cross year boundaries', () => {
      const components = {
        year: 2024,
        month: 11,
        date: 15,
        day: 0,
        hours: 10,
        minutes: 30,
        seconds: 0,
        milliseconds: 0,
      }

      const result = addMonthsToComponents(components, 1)

      expect(result).toMatchObject({ year: 2025, month: 0, date: 15, hours: 10, minutes: 30 })
    })
  })

  describe('buildCalendarMatrix', () => {
    it('returns a 6x7 grid for a month that needs six weeks', () => {
      const matrix = buildCalendarMatrix({ year: 2026, month: 7 })

      expect(matrix).toHaveLength(6)
      expect(matrix[0]).toHaveLength(7)
      expect(matrix[5]).toHaveLength(7)
      expect(matrix[0][0].getFullYear()).toBe(2026)
      expect(matrix[0][0].getMonth()).toBe(6)
      expect(matrix[5][6].getMonth()).toBe(8)
    })

    it('includes the last day of the target month', () => {
      const matrix = buildCalendarMatrix({ year: 2026, month: 7 })
      const flat = matrix.flat()

      expect(flat.some(date => date.getFullYear() === 2026 && date.getMonth() === 7 && date.getDate() === 31)).toBe(
        true,
      )
    })

    it('starts the grid on a Monday', () => {
      const matrix = buildCalendarMatrix({ year: 2026, month: 7 })

      expect(matrix[0][0].getDay()).toBe(1)
    })

    it('consecutive cells are one day apart', () => {
      const flat = buildCalendarMatrix({ year: 2026, month: 7 }).flat()

      for (let i = 1; i < flat.length; i++) {
        const diff = flat[i].getTime() - flat[i - 1].getTime()
        expect(diff).toBe(24 * 60 * 60 * 1000)
      }
    })
  })
})
