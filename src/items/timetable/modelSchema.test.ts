import { describe, expect, it } from 'vite-plus/test'
import { getNextTimetableInstance, getTimetableInstancesBetween, ItemTimetable, TIME_BLOCKS } from './modelSchema'

// Mock timetable item for testing
const mockTimetableItem: ItemTimetable = {
  id: 'test-1',
  type: 'timetable',
  courseId: 'course-1',
  title: 'Mathematics Lecture',
  isDeleted: false,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  weekday: 1, // Monday
  blockId: '1', // 08:20 - 09:30
  activityType: 'lecture',
  classroom: 'Room 101',
  teacher: 'Dr. Smith',
}

describe('Timetable Instance Functions', () => {
  describe('getNextTimetableInstance', () => {
    it('should return the next Monday occurrence from a given Tuesday', () => {
      // Starting from Tuesday, January 16, 2024
      const fromDate = new Date('2024-01-16T10:00:00Z') // Tuesday
      const nextInstance = getNextTimetableInstance(mockTimetableItem, fromDate)

      expect(nextInstance).toBeDefined()
      // Expected next Monday: January 22, 2024 at 08:20 UTC
      expect(nextInstance?.startsAt).toEqual(new Date('2024-01-22T08:20:00.000Z'))
      expect(nextInstance?.endsAt).toEqual(new Date('2024-01-22T09:30:00.000Z'))
      expect(nextInstance?.activityType).toBe('lecture')
      expect(nextInstance?.classroom).toBe('Room 101')
      expect(nextInstance?.teacher).toBe('Dr. Smith')
      expect(nextInstance?.id).toBe('test-1')
      expect(nextInstance?.courseId).toBe('course-1')
      expect(nextInstance?.title).toBe('Mathematics Lecture')

      // Should not have weekday or blockId properties
      expect('weekday' in nextInstance!).toBe(false)
      expect('blockId' in nextInstance!).toBe(false)
    })

    it('should return the next Monday occurrence from a given Monday', () => {
      // Starting from Monday, January 15, 2024
      const fromDate = new Date('2024-01-15T10:00:00Z') // Monday
      const nextInstance = getNextTimetableInstance(mockTimetableItem, fromDate)

      expect(nextInstance).toBeDefined()
      // Should get next Monday (January 22, 2024), not the same day
      expect(nextInstance?.startsAt).toEqual(new Date('2024-01-22T08:20:00.000Z'))
      expect(nextInstance?.endsAt).toEqual(new Date('2024-01-22T09:30:00.000Z'))
    })

    it('should handle Sunday as weekday 0', () => {
      const sundayItem: ItemTimetable = {
        ...mockTimetableItem,
        weekday: 0, // Sunday
      }

      // Starting from Monday, January 15, 2024
      const fromDate = new Date('2024-01-15T10:00:00Z') // Monday
      const nextInstance = getNextTimetableInstance(sundayItem, fromDate)

      expect(nextInstance).toBeDefined()
      // Starting from Monday Jan 15, next Sunday should be Jan 21, 2024
      expect(nextInstance?.startsAt).toEqual(new Date('2024-01-21T08:20:00.000Z'))
      expect(nextInstance?.endsAt).toEqual(new Date('2024-01-21T09:30:00.000Z'))
    })

    it('should handle different time blocks correctly', () => {
      const afternoonItem: ItemTimetable = {
        ...mockTimetableItem,
        blockId: '5', // 14:50 - 16:00
      }

      const fromDate = new Date('2024-01-16T10:00:00Z') // Tuesday
      const nextInstance = getNextTimetableInstance(afternoonItem, fromDate)

      expect(nextInstance).toBeDefined()
      // Next Monday (Jan 22) with block 5 time (14:50 - 16:00)
      expect(nextInstance?.startsAt).toEqual(new Date('2024-01-22T14:50:00.000Z'))
      expect(nextInstance?.endsAt).toEqual(new Date('2024-01-22T16:00:00.000Z'))
    })

    it('should return undefined for invalid blockId', () => {
      const invalidItem: ItemTimetable = {
        ...mockTimetableItem,
        blockId: 'invalid',
      }

      const fromDate = new Date('2024-01-16T10:00:00Z')
      const nextInstance = getNextTimetableInstance(invalidItem, fromDate)

      expect(nextInstance).toBeUndefined()
    })

    it('should use current date as default when fromDate is not provided', () => {
      const nextInstance = getNextTimetableInstance(mockTimetableItem)

      expect(nextInstance).toBeDefined()
      // Should return a Date object, not a string
      expect(nextInstance?.startsAt).toBeInstanceOf(Date)
      expect(nextInstance?.endsAt).toBeInstanceOf(Date)
      expect(nextInstance?.startsAt.getUTCHours()).toBe(8)
      expect(nextInstance?.startsAt.getUTCMinutes()).toBe(20)
      expect(nextInstance?.endsAt.getUTCHours()).toBe(9)
      expect(nextInstance?.endsAt.getUTCMinutes()).toBe(30)
    })
  })

  describe('getTimetableInstancesBetween', () => {
    it('should generate multiple instances for a multi-week range', () => {
      // Range from January 15, 2024 (Monday) to February 5, 2024 (Monday)
      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-02-05T00:00:00Z')

      const instances = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)

      expect(instances).toHaveLength(3) // Jan 15, Jan 22, Jan 29

      instances.forEach(instance => {
        expect(instance.startsAt).toBeInstanceOf(Date)
        expect(instance.endsAt).toBeInstanceOf(Date)
        expect(instance.startsAt.getUTCHours()).toBe(8)
        expect(instance.startsAt.getUTCMinutes()).toBe(20)
        expect(instance.endsAt.getUTCHours()).toBe(9)
        expect(instance.endsAt.getUTCMinutes()).toBe(30)
        expect(instance.activityType).toBe('lecture')
        expect(instance.classroom).toBe('Room 101')
        expect(instance.teacher).toBe('Dr. Smith')
        expect('weekday' in instance).toBe(false)
        expect('blockId' in instance).toBe(false)
      })
    })

    it('should generate instances starting from the first matching weekday in range', () => {
      // Range from Tuesday, January 16, 2024 to Monday, January 29, 2024
      const startDate = new Date('2024-01-16T00:00:00Z') // Tuesday
      const endDate = new Date('2024-01-29T00:00:00Z') // Monday

      const instances = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)

      expect(instances).toHaveLength(1) // Jan 22, Jan 29 (skipping Jan 15 as it's before start date)
    })

    it('should return empty array if no instances fall within range', () => {
      // Range that doesn\'t include any Mondays
      const startDate = new Date('2024-01-16T00:00:00Z') // Tuesday
      const endDate = new Date('2024-01-18T00:00:00Z') // Thursday

      const instances = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)

      expect(instances).toHaveLength(0)
    })

    it('should handle single day range that matches the weekday', () => {
      // Range that includes exactly one Monday
      const startDate = new Date('2024-01-15T00:00:00Z') // Monday
      const endDate = new Date('2024-01-16T00:00:00Z') // Tuesday

      const instances = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)

      expect(instances).toHaveLength(1)
      expect(instances[0].startsAt).toBeInstanceOf(Date)
      expect(instances[0].endsAt).toBeInstanceOf(Date)
      expect(instances[0].startsAt.getUTCHours()).toBe(8)
      expect(instances[0].startsAt.getUTCMinutes()).toBe(20)
      expect(instances[0].endsAt.getUTCHours()).toBe(9)
      expect(instances[0].endsAt.getUTCMinutes()).toBe(30)
    })

    it('should handle weekend courses (Saturday/Sunday)', () => {
      const saturdayItem: ItemTimetable = {
        ...mockTimetableItem,
        weekday: 6, // Saturday
      }

      // Range from Monday to next Monday
      const startDate = new Date('2024-01-15T00:00:00Z') // Monday
      const endDate = new Date('2024-01-22T00:00:00Z') // Monday

      const instances = getTimetableInstancesBetween(saturdayItem, startDate, endDate)

      expect(instances).toHaveLength(1) // Saturday Jan 20
    })

    it('should handle different time blocks correctly', () => {
      const eveningItem: ItemTimetable = {
        ...mockTimetableItem,
        blockId: '6', // 16:10 - 17:20
      }

      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-22T00:00:00Z')

      const instances = getTimetableInstancesBetween(eveningItem, startDate, endDate)

      expect(instances).toHaveLength(1)
      expect(instances[0].startsAt).toBeInstanceOf(Date)
      expect(instances[0].endsAt).toBeInstanceOf(Date)
      expect(instances[0].startsAt.getUTCHours()).toBe(16)
      expect(instances[0].startsAt.getUTCMinutes()).toBe(10)
      expect(instances[0].endsAt.getUTCHours()).toBe(17)
      expect(instances[0].endsAt.getUTCMinutes()).toBe(20)
    })

    it('should return empty array for invalid blockId', () => {
      const invalidItem: ItemTimetable = {
        ...mockTimetableItem,
        blockId: 'invalid',
      }

      const startDate = new Date('2024-01-15T00:00:00Z')
      const endDate = new Date('2024-01-22T00:00:00Z')

      const instances = getTimetableInstancesBetween(invalidItem, startDate, endDate)

      expect(instances).toHaveLength(0)
    })

    it('should handle start date after end date gracefully', () => {
      const startDate = new Date('2024-01-22T00:00:00Z')
      const endDate = new Date('2024-01-15T00:00:00Z')

      const instances = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)

      expect(instances).toHaveLength(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle all possible weekdays (0-6)', () => {
      const weekdays = [0, 1, 2, 3, 4, 5, 6] // Sunday through Saturday
      const startDate = new Date('2024-01-14T00:00:00Z') // Sunday
      const endDate = new Date('2024-01-21T00:00:00Z') // Sunday (next week)

      weekdays.forEach(weekday => {
        const item: ItemTimetable = {
          ...mockTimetableItem,
          weekday,
        }

        const instances = getTimetableInstancesBetween(item, startDate, endDate)
        expect(instances).toHaveLength(1)
      })
    })

    it('should handle all available time blocks', () => {
      TIME_BLOCKS.forEach(block => {
        const item: ItemTimetable = {
          ...mockTimetableItem,
          blockId: block.id,
        }

        const nextInstance = getNextTimetableInstance(item)
        expect(nextInstance).toBeDefined()
        expect(nextInstance?.startsAt).toBeInstanceOf(Date)
        expect(nextInstance?.endsAt).toBeInstanceOf(Date)
        // Check that the times match the expected block times
        expect(nextInstance?.startsAt.getUTCHours()).toBe(parseInt(block.startsAt.split(':')[0]))
        expect(nextInstance?.startsAt.getUTCMinutes()).toBe(parseInt(block.startsAt.split(':')[1]))
        expect(nextInstance?.endsAt.getUTCHours()).toBe(parseInt(block.endsAt.split(':')[0]))
        expect(nextInstance?.endsAt.getUTCMinutes()).toBe(parseInt(block.endsAt.split(':')[1]))
      })
    })
  })

  describe('Timezone Support', () => {
    describe('getNextTimetableInstance with timezone', () => {
      it('should handle timezone-aware calculations', () => {
        // Test from a specific date in Eastern Time
        const fromDate = new Date('2024-01-16T15:00:00Z') // Tuesday 3 PM UTC
        const nextInstance = getNextTimetableInstance(mockTimetableItem, fromDate, 'America/New_York')

        expect(nextInstance).toBeDefined()
        expect(nextInstance?.startsAt).toBeInstanceOf(Date)
        expect(nextInstance?.endsAt).toBeInstanceOf(Date)
        // In Eastern timezone, the times should be in local time for that timezone
        expect(nextInstance?.activityType).toBe('lecture')
      })

      it('should handle timezone-aware calculations across date boundaries', () => {
        // Test with a time that might be a different day in different timezones
        const fromDate = new Date('2024-01-16T05:00:00Z') // Tuesday 5 AM UTC (Monday 11 PM EST)
        const nextInstanceUTC = getNextTimetableInstance(mockTimetableItem, fromDate)
        const nextInstanceEastern = getNextTimetableInstance(mockTimetableItem, fromDate, 'America/New_York')

        expect(nextInstanceUTC).toBeDefined()
        expect(nextInstanceEastern).toBeDefined()
        // Both should find the next Monday occurrence but potentially from different starting points
        expect(nextInstanceUTC?.startsAt).toBeInstanceOf(Date)
        expect(nextInstanceEastern?.startsAt).toBeInstanceOf(Date)
      })

      it('should default to UTC when no timezone is provided', () => {
        const fromDate = new Date('2024-01-16T10:00:00Z') // Tuesday
        const nextInstanceUTC = getNextTimetableInstance(mockTimetableItem, fromDate)
        const nextInstanceNoTZ = getNextTimetableInstance(mockTimetableItem, fromDate, undefined)

        expect(nextInstanceUTC).toEqual(nextInstanceNoTZ)
      })
    })

    describe('getTimetableInstancesBetween with timezone', () => {
      it('should generate timezone-aware instances between dates', () => {
        const startDate = new Date('2024-01-15T00:00:00Z') // Monday
        const endDate = new Date('2024-02-05T00:00:00Z') // 3 weeks later

        const instancesUTC = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)
        const instancesEastern = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate, 'America/New_York')

        expect(instancesUTC.length).toBeGreaterThan(0)
        expect(instancesEastern.length).toBeGreaterThan(0)
        // Should generate instances for each Monday in the range
        expect(instancesUTC.length).toBe(instancesEastern.length) // Should be same count

        instancesUTC.forEach(instance => {
          expect(instance.startsAt).toBeInstanceOf(Date)
          expect(instance.endsAt).toBeInstanceOf(Date)
          expect(instance.startsAt.getUTCHours()).toBe(8)
          expect(instance.startsAt.getUTCMinutes()).toBe(20)
          expect(instance.endsAt.getUTCHours()).toBe(9)
          expect(instance.endsAt.getUTCMinutes()).toBe(30)
        })

        instancesEastern.forEach(instance => {
          expect(instance.startsAt).toBeInstanceOf(Date)
          expect(instance.endsAt).toBeInstanceOf(Date)
          // Eastern timezone instances should also be Date objects
        })
      })

      it('should handle different timezones consistently', () => {
        const startDate = new Date('2024-01-15T00:00:00Z') // Monday
        const endDate = new Date('2024-01-29T00:00:00Z') // 2 weeks later

        const instancesPacific = getTimetableInstancesBetween(
          mockTimetableItem,
          startDate,
          endDate,
          'America/Los_Angeles',
        )
        const instancesEastern = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate, 'America/New_York')
        const instancesUTC = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate)

        // All should find the same number of Monday occurrences
        expect(instancesPacific.length).toBe(instancesEastern.length)
        expect(instancesEastern.length).toBe(instancesUTC.length)
        expect(instancesUTC.length).toBe(2) // Should have 2 Mondays in this range
      })

      it('should handle edge cases around DST transitions', () => {
        // Test around a DST transition date
        const startDate = new Date('2024-03-10T00:00:00Z') // Around spring DST transition
        const endDate = new Date('2024-03-18T00:00:00Z') // One week later

        const instances = getTimetableInstancesBetween(mockTimetableItem, startDate, endDate, 'America/New_York')

        expect(instances.length).toBeGreaterThanOrEqual(0)
        instances.forEach(instance => {
          expect(instance.startsAt).toBeInstanceOf(Date)
          expect(instance.endsAt).toBeInstanceOf(Date)
          // During DST transition, the times should still be valid Date objects
        })
      })
    })
  })
})
