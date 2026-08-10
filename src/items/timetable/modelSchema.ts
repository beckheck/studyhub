import { t } from '@/i18n/config'
import { addDaysToComponents, createDateInTimezone, getDateComponentsInTimezone } from '@/lib/date-utils'
import { z } from 'zod'
import { ItemBase, ItemBaseSchema } from '../base/modelSchema'

export const ITEM_TIMETABLE_ACTIVITY_TYPES = ['lecture', 'tutorial', 'workshop', 'lab'] as const

export type ItemTimetableActivityType = (typeof ITEM_TIMETABLE_ACTIVITY_TYPES)[number]

export const TIME_BLOCKS = [
  { id: '1', startsAt: '08:20', endsAt: '09:30' },
  { id: '2', startsAt: '09:40', endsAt: '10:50' },
  { id: '3', startsAt: '11:00', endsAt: '12:10' },
  { id: '4', startsAt: '12:20', endsAt: '13:30' },
  { id: '5', startsAt: '14:50', endsAt: '16:00' },
  { id: '6', startsAt: '16:10', endsAt: '17:20' },
  { id: '7', startsAt: '17:30', endsAt: '18:40' },
  { id: '8', startsAt: '18:50', endsAt: '20:00' },
]

export const TimetableBlockSchema = z.object({
  id: z.string({ message: t('items:timetable.validation.idRequired') }),
  startsAt: z
    .string({ message: t('items:timetable.validation.startsAtRequired') })
    .regex(/^\d{1,2}:\d{2}$/, { message: t('items:timetable.validation.timeFormat') }),
  endsAt: z
    .string({ message: t('items:timetable.validation.endsAtRequired') })
    .regex(/^\d{1,2}:\d{2}$/, { message: t('items:timetable.validation.timeFormat') }),
})
// {weekday, blockId} can be later converted to {startsAt, endsAt, recurrence}.

export const ItemTimetableSchema = z.object({
  type: z.literal('timetable'),
  blockId: z.string({ message: t('items:timetable.validation.blockIdRequired') }),
  weekday: z
    .number({ message: t('items:timetable.validation.weekdayRequired') })
    .min(0, { message: t('items:timetable.validation.weekdayMin') })
    .max(6, { message: t('items:timetable.validation.weekdayMax') }),
  classroom: z.string().optional(),
  // classroom: z
  //   .string({ message: t('items:timetable.validation.classroomRequired') })
  //   .min(1, { message: t('items:timetable.validation.classroomMinLength') }),
  teacher: z.string().optional(),
  // teacher: z
  //   .string({ message: t('items:timetable.validation.teacherRequired') })
  //   .min(1, { message: t('items:timetable.validation.teacherMinLength') }),
  activityType: z
    .string({ message: t('items:timetable.validation.activityTypeRequired') })
    .min(1, { message: t('items:timetable.validation.activityTypeMinLength') }),
})

export const ItemTimetableCompleteSchema = ItemBaseSchema.extend(ItemTimetableSchema.shape)
export type TimetableBlock = z.infer<typeof TimetableBlockSchema>
export type ItemTimetableSpecific = z.infer<typeof ItemTimetableSchema>
export type ItemTimetable = ItemBase & ItemTimetableSpecific

// Derived type that replaces weekday and blockId with actual time properties
export type ItemTimetableInstance = Omit<ItemTimetable, 'weekday' | 'blockId'> & {
  startsAt: Date
  endsAt: Date
}

/**
 * Helper function to find a time block by its ID
 */
function getTimeBlockById(blockId: string): TimetableBlock | undefined {
  return TIME_BLOCKS.find(block => block.id === blockId)
}

/**
 * Helper function to calculate the next occurrence of a given weekday from a date
 * @param fromDate The starting date
 * @param targetWeekday The target weekday (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 * @param timezone The timezone to use for calculations (defaults to UTC)
 * @returns The next date that falls on the target weekday
 */
function getNextWeekdayOccurrence(fromDate: Date, targetWeekday: number, timezone?: string): Date {
  const components = getDateComponentsInTimezone(fromDate, timezone)
  const currentWeekday = components.day

  let daysToAdd = targetWeekday - currentWeekday

  // If the target weekday is today or in the past this week, move to next week
  if (daysToAdd <= 0) {
    daysToAdd += 7
  }

  const nextComponents = addDaysToComponents(components, daysToAdd)
  return createDateInTimezone(
    nextComponents.year,
    nextComponents.month,
    nextComponents.date,
    0, // Start of day
    0,
    0,
    0,
    timezone,
  )
}

/**
 * Helper function to create a timetable instance from a base item and a specific date
 */
function createTimetableInstance(timetableItem: ItemTimetable, date: Date, timezone?: string): ItemTimetableInstance {
  const block = getTimeBlockById(timetableItem.blockId)
  if (!block) {
    throw new Error(`Invalid blockId: ${timetableItem.blockId}`)
  }

  const { weekday: _weekday, blockId: _blockId, ...baseItem } = timetableItem

  // Parse time strings and create Date objects for the given date
  const [startHours, startMinutes] = block.startsAt.split(':').map(Number)
  const [endHours, endMinutes] = block.endsAt.split(':').map(Number)

  // Get date components in the specified timezone
  const dateComponents = getDateComponentsInTimezone(date, timezone)

  // Create timezone-aware Date objects, defaulting to UTC if no timezone specified
  const targetTimezone = timezone || 'UTC'

  const startsAt = createDateInTimezone(
    dateComponents.year,
    dateComponents.month,
    dateComponents.date,
    startHours,
    startMinutes,
    0,
    0,
    targetTimezone,
  )

  const endsAt = createDateInTimezone(
    dateComponents.year,
    dateComponents.month,
    dateComponents.date,
    endHours,
    endMinutes,
    0,
    0,
    targetTimezone,
  )

  return {
    ...baseItem,
    startsAt,
    endsAt,
  }
}

/**
 * Get the next occurrence of a timetable item from a given date
 * @param timetableItem The base timetable item
 * @param fromDate The date to start searching from (defaults to today)
 * @param timezone The timezone to use for calculations (defaults to UTC)
 * @returns The next timetable instance, or null if not found within a reasonable timeframe
 */
export function getNextTimetableInstance(
  timetableItem: ItemTimetable,
  fromDate: Date = new Date(),
  timezone?: string,
): ItemTimetableInstance | undefined {
  try {
    // Find the next occurrence of the target weekday
    const nextDate = getNextWeekdayOccurrence(fromDate, timetableItem.weekday, timezone)

    // Create and return the instance
    return createTimetableInstance(timetableItem, nextDate, timezone)
  } catch (error) {
    console.error('Error creating next timetable instance:', error)
    return undefined
  }
}

/**
 * Generate all occurrences of a timetable item within a date range
 * @param timetableItem The base timetable item
 * @param startDate Start of the date range (inclusive)
 * @param endDate End of the date range (exclusive)
 * @param timezone The timezone to use for calculations (defaults to UTC)
 * @returns Array of timetable instances with actual start/end times
 */
export function getTimetableInstancesBetween(
  timetableItem: ItemTimetable,
  startDate: Date,
  endDate: Date,
  timezone?: string,
): ItemTimetableInstance[] {
  const instances: ItemTimetableInstance[] = []

  try {
    // Validate the time block exists
    if (!getTimeBlockById(timetableItem.blockId)) {
      console.error(`Invalid blockId: ${timetableItem.blockId}`)
      return instances
    }

    // Validate date range
    if (startDate >= endDate) {
      return instances
    }

    // Get date components in the specified timezone
    const startComponents = getDateComponentsInTimezone(startDate, timezone)

    // Find the first occurrence on or after startDate
    const targetWeekday = timetableItem.weekday
    const currentWeekday = startComponents.day

    // Calculate days to the first occurrence
    let daysToAdd = targetWeekday - currentWeekday
    if (daysToAdd < 0) {
      daysToAdd += 7
    }

    // Start from the first occurrence
    let currentComponents = addDaysToComponents(startComponents, daysToAdd)

    // Generate instances for each week until we exceed the end date
    while (true) {
      const currentDate = createDateInTimezone(
        currentComponents.year,
        currentComponents.month,
        currentComponents.date,
        0, // Start of day
        0,
        0,
        0,
        timezone,
      )

      // Check if we've exceeded the end date (exclusive)
      if (currentDate >= endDate) {
        break
      }

      // Only add if this occurrence is on or after the start date
      if (currentDate >= startDate) {
        instances.push(createTimetableInstance(timetableItem, currentDate, timezone))
      }

      // Move to next week
      currentComponents = addDaysToComponents(currentComponents, 7)
    }

    return instances
  } catch (error) {
    console.error('Error generating timetable instances:', error)
    return instances
  }
}
