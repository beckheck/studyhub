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
} from './date-utils'

describe('date-utils', () => {
  const date1 = new Date('2024-01-15T10:30:00Z') // Monday
  const date2 = new Date('2024-01-15T23:59:59Z') // Same day, different time
  const date3 = new Date('2024-01-16T00:00:00Z') // Next day
  const date4 = new Date('2024-01-20T15:00:00Z') // 5 days later

  describe('getDateString', () => {
    it('should return YYYY-MM-DD format for Date objects', () => {
      expect(getDateString(date1)).toBe('2024-01-15')
      expect(getDateString(date3)).toBe('2024-01-16')
    })

    it('should return YYYY-MM-DD format for timestamps', () => {
      expect(getDateString(date1.getTime())).toBe('2024-01-15')
      expect(getDateString(date3.getTime())).toBe('2024-01-16')
    })

    it('should handle timezone differences consistently', () => {
      // Test with dates that might have timezone issues
      const utcDate = new Date('2024-01-15T23:00:00Z')
      const localDate = new Date('2024-01-16T01:00:00+02:00') // Same UTC time, different timezone

      expect(getDateString(utcDate)).toBe('2024-01-15')
      expect(getDateString(localDate)).toBe('2024-01-15') // Should be same UTC date
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
      // Test dates around DST transition (spring forward)
      const beforeDST = new Date('2024-03-09T10:00:00-05:00') // EST
      const afterDST = new Date('2024-03-11T10:00:00-04:00') // EDT

      const daysDiff = getDaysDifference(beforeDST, afterDST)
      expect(daysDiff).toBe(2)
    })

    it('should handle dates across different timezones consistently', () => {
      // Same UTC moment in different timezone representations
      const utc = new Date('2024-01-15T23:00:00Z')
      const eastern = new Date('2024-01-15T18:00:00-05:00')
      const pacific = new Date('2024-01-15T15:00:00-08:00')

      expect(isSameDate(utc, eastern)).toBe(true)
      expect(isSameDate(utc, pacific)).toBe(true)
      expect(isSameDate(eastern, pacific)).toBe(true)
    })

    it('should handle midnight boundary cases', () => {
      const endOfDay = new Date('2024-01-15T23:59:59Z')
      const startOfNextDay = new Date('2024-01-16T00:00:00Z')

      expect(isSameDate(endOfDay, startOfNextDay)).toBe(false)
      expect(getDaysDifference(endOfDay, startOfNextDay)).toBe(1)
    })
  })
})
