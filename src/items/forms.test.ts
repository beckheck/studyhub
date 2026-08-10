/**
 * Unit tests for form-model bidirectional converters
 *
 * This test suite validates the conversion functions that transform between
 * form data (used in UI components) and model data (used in the application state).
 *
 * Tests cover:
 * - Form to model conversions (task, exam, event, timetable)
 * - Model to form conversions (task, exam, event, timetable)
 * - Handling of optional fields and empty values
 * - Preservation of existing item data during updates
 * - Date and time handling with proper formatting
 * - Recurrence rules for events
 * - Helper functions for creating and updating items
 * - Edge cases and error handling
 */

import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  DEFAULT_ITEM_EVENT_FORM,
  eventFormToModelConverter,
  eventModelToFormConverter,
  ItemEventForm,
} from './event/formSchema'
import { ItemEvent } from './event/modelSchema'
import { DEFAULT_ITEM_EXAM_FORM, examFormToModelConverter, ItemExamForm } from './exam/formSchema'
import { ItemExam } from './exam/modelSchema'
import {
  convertItemFormToModel,
  convertItemModelToForm,
  createItemModelFromForm,
  itemFormToModelConverterMap,
  itemModelToFormConverterMap,
  updateItemModelFromForm,
} from './forms'
import { DEFAULT_ITEM_TASK_FORM, ItemTaskForm } from './task/formSchema'
import { ItemTask } from './task/modelSchema'
import { DEFAULT_ITEM_TIMETABLE_FORM, ItemTimetableForm } from './timetable/formSchema'
import { ItemTimetable } from './timetable/modelSchema'

describe('Converters', () => {
  const mockDate = new Date('2022-01-01T00:00:00.000Z')
  const mockOldDate = new Date('2000-01-01T00:00:00.000Z')
  const mockUUID = 'test-uuid-123'

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(mockDate)

    // Mock crypto.randomUUID
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: () => mockUUID },
      writable: true,
    })
  })
  describe('Form to Model Converters', () => {
    describe('Task Form Converter', () => {
      it('should convert task form to model correctly', () => {
        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Complete assignment',
          courseId: 'math-101',
          color: '#ff0000',
          notes: 'Important assignment',
          tags: ['homework', 'urgent'],
          dueAt: '2022-01-15',
          priority: 'high',
          isCompleted: true,
        }

        const result = itemFormToModelConverterMap.task(taskForm)

        expect(result).toEqual({
          title: 'Complete assignment',
          courseId: 'math-101',
          color: '#ff0000',
          notes: 'Important assignment',
          tags: ['homework', 'urgent'],
          type: 'task',
          dueAt: new Date('2022-01-15'),
          priority: 'high',
          isCompleted: true,
        })
      })

      it('should handle empty optional fields', () => {
        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Simple task',
          courseId: '',
          notes: '',
          tags: [],
          dueAt: '2022-01-10',
        }

        const result = itemFormToModelConverterMap.task(taskForm)

        expect(result).toEqual({
          title: 'Simple task',
          courseId: undefined,
          color: '#3b82f6',
          notes: undefined,
          tags: undefined,
          type: 'task',
          dueAt: new Date('2022-01-10'),
          priority: 'medium',
          isCompleted: false,
        })
      })

      it('should preserve existing item data when provided', () => {
        const existingItem: ItemTask = {
          id: 'existing-id',
          title: 'Old title',
          courseId: 'old-course',
          color: '#000000',
          notes: 'Old notes',
          tags: ['old'],
          isDeleted: false,
          createdAt: mockOldDate,
          updatedAt: mockOldDate,
          type: 'task',
          dueAt: mockDate,
          priority: 'low',
          isCompleted: false,
        }

        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Updated title',
          dueAt: '2022-01-15',
        }

        const result = itemFormToModelConverterMap.task(taskForm, existingItem)

        expect(result).toEqual({
          title: 'Updated title',
          courseId: undefined,
          color: '#3b82f6',
          notes: undefined,
          tags: undefined,
          type: 'task',
          dueAt: new Date('2022-01-15'),
          priority: 'medium',
          isCompleted: false,
          id: 'existing-id',
          isDeleted: false,
          createdAt: mockOldDate,
          updatedAt: mockDate,
        })
      })
    })

    describe('Exam Form Converter', () => {
      it('should convert exam form to model correctly', () => {
        const examForm: ItemExamForm = {
          ...DEFAULT_ITEM_EXAM_FORM,
          title: 'Midterm Exam',
          courseId: 'physics-201',
          startsAt: '2022-01-20',
          startsAtTime: '14:30',
          weight: 35,
          isCompleted: true,
        }

        const result = itemFormToModelConverterMap.exam(examForm)

        expect(result).toEqual({
          title: 'Midterm Exam',
          courseId: 'physics-201',
          color: '#ef4444',
          notes: undefined,
          tags: undefined,
          type: 'exam',
          startsAt: new Date('2022-01-20T14:30'),
          weight: 35,
          isCompleted: true,
        })
      })

      it('should handle default time format', () => {
        const examForm: ItemExamForm = {
          ...DEFAULT_ITEM_EXAM_FORM,
          title: 'Final Exam',
          startsAt: '2022-01-25',
          startsAtTime: '09:00',
        }

        const result = examFormToModelConverter(examForm)

        expect(result.startsAt).toStrictEqual(new Date('2022-01-25T09:00'))
      })
    })

    describe('Event Form Converter', () => {
      it('should convert event form to model correctly', () => {
        const eventForm: ItemEventForm = {
          ...DEFAULT_ITEM_EVENT_FORM,
          title: 'Study Group',
          startsAt: '2022-01-18',
          startsAtTime: '18:00',
          endsAt: '2022-01-18',
          endsAtTime: '20:00',
          location: 'Library Room 201',
          isAllDay: false,
        }

        const result = itemFormToModelConverterMap.event(eventForm)

        expect(result).toEqual({
          title: 'Study Group',
          courseId: undefined,
          color: '#8b5cf6',
          notes: undefined,
          tags: undefined,
          type: 'event',
          startsAt: new Date('2022-01-18T18:00'),
          endsAt: new Date('2022-01-18T20:00'),
          isAllDay: false,
          location: 'Library Room 201',
          recurrence: undefined,
        })
      })

      it('should handle recurrence properly', () => {
        const eventForm: ItemEventForm = {
          ...DEFAULT_ITEM_EVENT_FORM,
          title: 'Weekly Meeting',
          startsAt: '2022-01-17',
          startsAtTime: '15:00',
          endsAt: '2022-01-17',
          endsAtTime: '16:00',
          hasRecurrence: true,
          recurrenceFrequency: 'weekly',
          recurrenceInterval: 2,
          recurrenceByWeekday: [1, 3], // Monday and Wednesday
          recurrenceCount: 10,
          recurrenceUntil: '2022-03-15',
        }

        const result = eventFormToModelConverter(eventForm)

        expect(result.recurrence).toEqual({
          frequency: 'weekly',
          interval: 2,
          byWeekday: [1, 3],
          count: 10,
          until: new Date('2022-03-15'),
        })
      })

      it('should default to 1 hour duration if end time not provided', () => {
        const eventForm: ItemEventForm = {
          ...DEFAULT_ITEM_EVENT_FORM,
          title: 'Short Event',
          startsAt: '2022-01-20',
          startsAtTime: '10:00',
          endsAt: '',
          endsAtTime: '',
        }

        const result = eventFormToModelConverter(eventForm)
        const startTime = new Date('2022-01-20T10:00')
        const expectedEndTime = new Date(startTime.getTime() + 60 * 60 * 1000) // +1 hour

        expect(result.endsAt).toStrictEqual(expectedEndTime)
      })

      it('should not include recurrence when hasRecurrence is false', () => {
        const eventForm: ItemEventForm = {
          ...DEFAULT_ITEM_EVENT_FORM,
          title: 'One-time Event',
          startsAt: '2022-01-20',
          startsAtTime: '10:00',
          endsAt: '2022-01-20',
          endsAtTime: '11:00',
          hasRecurrence: false,
          recurrenceFrequency: 'weekly', // Should be ignored
        }

        const result = eventFormToModelConverter(eventForm)

        expect(result.recurrence).toBeUndefined()
      })
    })

    describe('Timetable Form Converter', () => {
      it('should convert timetable form to model correctly', () => {
        const timetableForm: ItemTimetableForm = {
          ...DEFAULT_ITEM_TIMETABLE_FORM,
          title: 'Advanced Calculus',
          courseId: 'math-301',
          blockId: '3',
          weekday: 2, // Tuesday
          classroom: 'Math Building 205',
          teacher: 'Dr. Smith',
          activityType: 'Lecture',
        }

        const result = itemFormToModelConverterMap.timetable(timetableForm)

        expect(result).toEqual({
          title: 'Advanced Calculus',
          courseId: 'math-301',
          color: '#06b6d4',
          notes: undefined,
          tags: undefined,
          type: 'timetable',
          blockId: '3',
          weekday: 2,
          classroom: 'Math Building 205',
          teacher: 'Dr. Smith',
          activityType: 'Lecture',
        })
      })
    })

    describe('createItemModelFromForm', () => {
      it('should create a complete item with generated ID and timestamps', () => {
        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'New Task',
          dueAt: '2022-01-15',
        }

        const result = createItemModelFromForm('task', taskForm)

        expect(result).toEqual({
          id: mockUUID,
          title: 'New Task',
          courseId: undefined,
          color: '#3b82f6',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'task',
          dueAt: new Date('2022-01-15'),
          priority: 'medium',
          isCompleted: false,
        })
      })

      it('should use custom ID generator when provided', () => {
        const customIdGenerator = () => 'custom-id-456'
        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Task with Custom ID',
          dueAt: '2022-01-15',
        }

        const result = createItemModelFromForm('task', taskForm, customIdGenerator)

        expect(result.id).toBe('custom-id-456')
      })
    })

    describe('updateItemModelFromForm', () => {
      it('should update existing item with form data', () => {
        const existingItem: ItemTask = {
          id: 'existing-task-id',
          title: 'Old Task',
          courseId: 'old-course',
          color: '#000000',
          notes: 'Old notes',
          tags: ['old-tag'],
          isDeleted: false,
          createdAt: new Date(-86400000), // 1 day ago
          updatedAt: new Date(-3600000), // 1 hour ago
          type: 'task',
          dueAt: new Date(-3600000),
          priority: 'low',
          isCompleted: false,
        }

        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Updated Task',
          courseId: 'new-course',
          priority: 'high',
          isCompleted: true,
          dueAt: '2022-01-20',
        }

        const result = updateItemModelFromForm('task', taskForm, existingItem)

        expect(result).toEqual({
          id: 'existing-task-id',
          title: 'Updated Task',
          courseId: 'new-course',
          color: '#3b82f6',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: new Date(-86400000),
          updatedAt: mockDate,
          type: 'task',
          dueAt: new Date('2022-01-20'),
          priority: 'high',
          isCompleted: true,
        })
      })
    })

    describe('convertItemFormToModel', () => {
      it('should route to correct converter based on type', () => {
        const taskForm: ItemTaskForm = {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Test Task',
          dueAt: '2022-01-15',
        }

        const result = convertItemFormToModel('task', taskForm) as Partial<ItemTask>

        expect(result.type).toBe('task')
        expect(result.title).toBe('Test Task')
        expect(result.dueAt).toStrictEqual(new Date('2022-01-15'))
      })

      it('should work with all item types', () => {
        // Test task
        const taskResult = convertItemFormToModel('task', {
          ...DEFAULT_ITEM_TASK_FORM,
          title: 'Task',
          dueAt: '2022-01-15',
        })
        expect(taskResult.type).toBe('task')

        // Test exam
        const examResult = convertItemFormToModel('exam', {
          ...DEFAULT_ITEM_EXAM_FORM,
          title: 'Exam',
          startsAt: '2022-01-15',
          startsAtTime: '10:00',
        })
        expect(examResult.type).toBe('exam')

        // Test event
        const eventResult = convertItemFormToModel('event', {
          ...DEFAULT_ITEM_EVENT_FORM,
          title: 'Event',
          startsAt: '2022-01-15',
          startsAtTime: '10:00',
          endsAt: '2022-01-15',
          endsAtTime: '11:00',
        })
        expect(eventResult.type).toBe('event')

        // Test timetable
        const timetableResult = convertItemFormToModel('timetable', {
          ...DEFAULT_ITEM_TIMETABLE_FORM,
          title: 'Timetable',
        })
        expect(timetableResult.type).toBe('timetable')
      })
    })
  })

  describe('Model to Form Converters', () => {
    describe('Task Model to Form Converter', () => {
      it('should convert task model to form correctly', () => {
        const taskModel: ItemTask = {
          id: 'task-123',
          title: 'Complete assignment',
          courseId: 'math-101',
          color: '#ff0000',
          notes: 'Important assignment',
          tags: ['homework', 'urgent'],
          isDeleted: false,
          createdAt: mockOldDate,
          updatedAt: mockOldDate,
          type: 'task',
          dueAt: new Date('2022-01-15'),
          priority: 'high',
          isCompleted: true,
        }

        const result = itemModelToFormConverterMap.task(taskModel)

        expect(result).toEqual({
          title: 'Complete assignment',
          courseId: 'math-101',
          color: '#ff0000',
          notes: 'Important assignment',
          tags: ['homework', 'urgent'],
          dueAt: '2022-01-15',
          priority: 'high',
          isCompleted: true,
        })
      })

      it('should handle empty optional fields in task model', () => {
        const taskModel: ItemTask = {
          id: 'task-456',
          title: 'Simple task',
          courseId: undefined,
          color: '#3b82f6',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'task',
          dueAt: new Date('2022-01-10'),
          priority: 'medium',
          isCompleted: false,
        }

        const result = itemModelToFormConverterMap.task(taskModel)

        expect(result).toEqual({
          title: 'Simple task',
          courseId: undefined,
          color: '#3b82f6',
          notes: '',
          tags: [],
          dueAt: '2022-01-10',
          priority: 'medium',
          isCompleted: false,
        })
      })

      it('should throw error for invalid task type', () => {
        const invalidModel = {
          id: 'invalid-123',
          title: 'Invalid',
          type: 'exam',
        } as any

        expect(() => itemModelToFormConverterMap.task(invalidModel)).toThrow('Invalid item type')
      })
    })

    describe('Exam Model to Form Converter', () => {
      it('should convert exam model to form correctly', () => {
        const examModel: ItemExam = {
          id: 'exam-123',
          title: 'Midterm Exam',
          courseId: 'physics-201',
          color: '#ef4444',
          notes: 'Bring calculator',
          tags: ['midterm'],
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'exam',
          startsAt: new Date('2022-01-20T14:30:00'),
          weight: 35,
          isCompleted: true,
        }

        const result = itemModelToFormConverterMap.exam(examModel)

        expect(result).toEqual({
          title: 'Midterm Exam',
          courseId: 'physics-201',
          color: '#ef4444',
          notes: 'Bring calculator',
          tags: ['midterm'],
          startsAt: '2022-01-20',
          startsAtTime: '14:30',
          weight: 35,
          isCompleted: true,
        })
      })

      it('should handle midnight time correctly', () => {
        const examModel: ItemExam = {
          id: 'exam-456',
          title: 'Early Exam',
          courseId: undefined,
          color: '#ef4444',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'exam',
          startsAt: new Date('2022-01-25T00:00:00'),
          weight: 20,
          isCompleted: false,
        }

        const result = itemModelToFormConverterMap.exam(examModel)

        expect(result).toEqual({
          title: 'Early Exam',
          courseId: undefined,
          color: '#ef4444',
          notes: '',
          tags: [],
          startsAt: '2022-01-25',
          startsAtTime: '00:00',
          weight: 20,
          isCompleted: false,
        })
      })

      it('should throw error for invalid exam type', () => {
        const invalidModel = {
          id: 'invalid-123',
          title: 'Invalid',
          type: 'task',
        } as any

        expect(() => itemModelToFormConverterMap.exam(invalidModel)).toThrow('Invalid item type')
      })
    })

    describe('Event Model to Form Converter', () => {
      it('should convert event model to form correctly', () => {
        const eventModel: ItemEvent = {
          id: 'event-123',
          title: 'Study Group',
          courseId: 'cs-101',
          color: '#8b5cf6',
          notes: 'Bring notes',
          tags: ['group', 'study'],
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'event',
          startsAt: new Date('2022-01-18T18:00:00'),
          endsAt: new Date('2022-01-18T20:00:00'),
          isAllDay: false,
          location: 'Library Room 201',
          recurrence: {
            frequency: 'weekly',
            interval: 2,
            byWeekday: [1, 3],
            count: 10,
            until: new Date('2022-03-15'),
          },
        }

        const result = itemModelToFormConverterMap.event(eventModel)

        expect(result).toEqual({
          title: 'Study Group',
          courseId: 'cs-101',
          color: '#8b5cf6',
          notes: 'Bring notes',
          tags: ['group', 'study'],
          startsAt: '2022-01-18',
          startsAtTime: '18:00',
          endsAt: '2022-01-18',
          endsAtTime: '20:00',
          isAllDay: false,
          location: 'Library Room 201',
          hasRecurrence: true,
          recurrenceFrequency: 'weekly',
          recurrenceInterval: 2,
          recurrenceByWeekday: [1, 3],
          recurrenceCount: 10,
          recurrenceUntil: '2022-03-15',
        })
      })

      it('should handle event without recurrence', () => {
        const eventModel: ItemEvent = {
          id: 'event-456',
          title: 'One-time Event',
          courseId: undefined,
          color: '#8b5cf6',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'event',
          startsAt: new Date('2022-01-20T10:00:00'),
          endsAt: new Date('2022-01-20T11:00:00'),
          isAllDay: false,
          location: undefined,
          recurrence: undefined,
        }

        const result = itemModelToFormConverterMap.event(eventModel)

        expect(result).toEqual({
          title: 'One-time Event',
          courseId: undefined,
          color: '#8b5cf6',
          notes: '',
          tags: [],
          startsAt: '2022-01-20',
          startsAtTime: '10:00',
          endsAt: '2022-01-20',
          endsAtTime: '11:00',
          isAllDay: false,
          location: '',
          hasRecurrence: false,
          recurrenceFrequency: 'weekly',
          recurrenceInterval: 1,
          recurrenceByWeekday: [],
          recurrenceCount: undefined,
          recurrenceUntil: undefined,
        })
      })

      it('should handle all-day events', () => {
        const eventModel: ItemEvent = {
          id: 'event-789',
          title: 'All Day Event',
          courseId: 'course-123',
          color: '#8b5cf6',
          notes: 'All day long',
          tags: ['all-day'],
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'event',
          startsAt: new Date('2022-01-22T12:00:00'),
          endsAt: new Date('2022-01-22T12:00:00'),
          isAllDay: true,
          location: 'Various',
          recurrence: undefined,
        }

        const result = eventModelToFormConverter(eventModel)

        expect(result.isAllDay).toBe(true)
        expect(result.startsAt).toBe('2022-01-22')
        expect(result.endsAt).toBe('2022-01-22')
      })

      it('should throw error for invalid event type', () => {
        const invalidModel = {
          id: 'invalid-123',
          title: 'Invalid',
          type: 'task',
        } as any

        expect(() => itemModelToFormConverterMap.event(invalidModel)).toThrow('Invalid item type')
      })
    })

    describe('Timetable Model to Form Converter', () => {
      it('should convert timetable model to form correctly', () => {
        const timetableModel: ItemTimetable = {
          id: 'timetable-123',
          title: 'Advanced Calculus',
          courseId: 'math-301',
          color: '#06b6d4',
          notes: 'Homework due next week',
          tags: ['lecture', 'math'],
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'timetable',
          blockId: '3',
          weekday: 2,
          classroom: 'Math Building 205',
          teacher: 'Dr. Smith',
          activityType: 'Lecture',
        }

        const result = itemModelToFormConverterMap.timetable(timetableModel)

        expect(result).toEqual({
          title: 'Advanced Calculus',
          courseId: 'math-301',
          color: '#06b6d4',
          notes: 'Homework due next week',
          tags: ['lecture', 'math'],
          blockId: '3',
          weekday: 2,
          classroom: 'Math Building 205',
          teacher: 'Dr. Smith',
          activityType: 'Lecture',
        })
      })

      it('should handle empty optional fields in timetable model', () => {
        const timetableModel: ItemTimetable = {
          id: 'timetable-456',
          title: 'Basic Course',
          courseId: undefined,
          color: '#06b6d4',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'timetable',
          blockId: '1',
          weekday: 1,
          classroom: undefined,
          teacher: undefined,
          activityType: 'Seminar',
        }

        const result = itemModelToFormConverterMap.timetable(timetableModel)

        expect(result).toEqual({
          title: 'Basic Course',
          courseId: undefined,
          color: '#06b6d4',
          notes: '',
          tags: [],
          blockId: '1',
          weekday: 1,
          classroom: undefined,
          teacher: undefined,
          activityType: 'Seminar',
        })
      })

      it('should throw error for invalid timetable type', () => {
        const invalidModel = {
          id: 'invalid-123',
          title: 'Invalid',
          type: 'exam',
        } as any

        expect(() => itemModelToFormConverterMap.timetable(invalidModel)).toThrow('Invalid item type')
      })
    })

    describe('convertItemModelToForm', () => {
      it('should route to correct converter based on item type', () => {
        const taskModel: ItemTask = {
          id: 'task-123',
          title: 'Test Task',
          courseId: 'course-123',
          color: '#3b82f6',
          notes: 'Test notes',
          tags: ['test'],
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'task',
          dueAt: new Date('2022-01-15'),
          priority: 'medium',
          isCompleted: false,
        }

        const result = convertItemModelToForm(taskModel) as ItemTaskForm

        expect(result.title).toBe('Test Task')
        expect(result.dueAt).toBe('2022-01-15')
        expect(result.priority).toBe('medium')
      })

      it('should work with all item types', () => {
        // Test task
        const taskModel: ItemTask = {
          id: 'task-123',
          title: 'Task',
          courseId: undefined,
          color: '#3b82f6',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'task',
          dueAt: new Date('2022-01-15'),
          priority: 'medium',
          isCompleted: false,
        }
        const taskResult = convertItemModelToForm(taskModel) as ItemTaskForm
        expect(taskResult.dueAt).toBe('2022-01-15')

        // Test exam
        const examModel: ItemExam = {
          id: 'exam-123',
          title: 'Exam',
          courseId: undefined,
          color: '#ef4444',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'exam',
          startsAt: new Date('2022-01-15T10:00:00'),
          weight: 20,
          isCompleted: false,
        }
        const examResult = convertItemModelToForm(examModel) as ItemExamForm
        expect(examResult.startsAt).toBe('2022-01-15')
        expect(examResult.startsAtTime).toBe('10:00')

        // Test event
        const eventModel: ItemEvent = {
          id: 'event-123',
          title: 'Event',
          courseId: undefined,
          color: '#8b5cf6',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'event',
          startsAt: new Date('2022-01-15T10:00:00'),
          endsAt: new Date('2022-01-15T11:00:00'),
          isAllDay: false,
          location: undefined,
          recurrence: undefined,
        }
        const eventResult = convertItemModelToForm(eventModel) as ItemEventForm
        expect(eventResult.startsAt).toBe('2022-01-15')
        expect(eventResult.endsAt).toBe('2022-01-15')

        // Test timetable
        const timetableModel: ItemTimetable = {
          id: 'timetable-123',
          title: 'Timetable',
          courseId: undefined,
          color: '#06b6d4',
          notes: undefined,
          tags: undefined,
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'timetable',
          blockId: '1',
          weekday: 1,
          classroom: undefined,
          teacher: undefined,
          activityType: 'Lecture',
        }
        const timetableResult = convertItemModelToForm(timetableModel) as ItemTimetableForm
        expect(timetableResult.blockId).toBe('1')
        expect(timetableResult.weekday).toBe(1)
      })

      it('should handle edge cases with timezone and date formatting', () => {
        const taskModel: ItemTask = {
          id: 'task-edge',
          title: 'Edge Case Task',
          courseId: 'edge-course',
          color: '#ff0000',
          notes: 'Edge case notes',
          tags: ['edge'],
          isDeleted: false,
          createdAt: mockDate,
          updatedAt: mockDate,
          type: 'task',
          dueAt: new Date('2022-12-31T23:59:59.999Z'), // End of year
          priority: 'high',
          isCompleted: true,
        }

        const result = convertItemModelToForm(taskModel) as ItemTaskForm
        expect(result.dueAt).toBe('2022-12-31')
      })

      it('should return default task form for unknown item type', () => {
        const invalidModel = {
          id: 'invalid-123',
          title: 'Unknown Type',
          type: 'unknown',
        } as any

        const result = convertItemModelToForm(invalidModel)
        expect(result).toEqual({ ...DEFAULT_ITEM_TASK_FORM })
      })
    })
  })
})
