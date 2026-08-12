import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { useItems } from './useStore'
import { store } from '@/stores/app'
import type { Item } from '@/items/models'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemEvent } from '@/items/event/modelSchema'
import type { ItemTimetable } from '@/items/timetable/modelSchema'
import type { ExamGrade } from '@/types'

function makeTask(overrides: Partial<ItemTask> = {}): ItemTask {
  return {
    id: 'task-1',
    type: 'task',
    title: 'Test Task',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    dueAt: new Date('2024-01-10T23:59:00.000Z'),
    priority: 'medium',
    isCompleted: false,
    ...overrides,
  } as ItemTask
}

function makeExam(overrides: Partial<ItemExam> = {}): ItemExam {
  return {
    id: 'exam-1',
    type: 'exam',
    title: 'Test Exam',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    startsAt: new Date('2024-01-10T09:00:00.000Z'),
    weight: 30,
    isCompleted: false,
    ...overrides,
  } as ItemExam
}

function makeEvent(overrides: Partial<ItemEvent> = {}): ItemEvent {
  return {
    id: 'event-1',
    type: 'event',
    title: 'Test Event',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    startsAt: new Date('2024-01-10T14:00:00.000Z'),
    endsAt: new Date('2024-01-10T15:00:00.000Z'),
    isAllDay: false,
    ...overrides,
  } as ItemEvent
}

function makeTimetable(overrides: Partial<ItemTimetable> = {}): ItemTimetable {
  return {
    id: 'tt-1',
    type: 'timetable',
    title: 'Test Timetable',
    courseId: 'course-1',
    isDeleted: false,
    createdAt: new Date('2024-01-01T00:00:00.000Z'),
    updatedAt: new Date('2024-01-01T00:00:00.000Z'),
    blockId: '1',
    weekday: 1,
    classroom: 'Room 101',
    teacher: 'Prof. Smith',
    activityType: 'lecture',
    ...overrides,
  } as ItemTimetable
}

function seedStore(items: Item[], examGrades: ExamGrade[] = []) {
  store.items = [...items] as any
  store.examGrades = [...examGrades] as any
}

describe('useItems', () => {
  beforeEach(() => {
    seedStore([])
  })

  describe('getItemsByType', () => {
    it('returns ItemTask[] when passed "task"', () => {
      const task = makeTask({ id: 't-1' })
      const exam = makeExam({ id: 'e-1' })
      seedStore([task, exam])

      const { result } = renderHook(() => useItems())

      const tasks = result.current.getItemsByType('task')
      expect(tasks).toHaveLength(1)
      expect(tasks[0].id).toBe('t-1')
    })

    it('returns ItemExam[] when passed "exam"', () => {
      const task = makeTask({ id: 't-1' })
      const exam = makeExam({ id: 'e-1' })
      seedStore([task, exam])

      const { result } = renderHook(() => useItems())

      const exams = result.current.getItemsByType('exam')
      expect(exams).toHaveLength(1)
      expect(exams[0].id).toBe('e-1')
    })
  })

  describe('per-type mutators', () => {
    it('updateTask updates a task and stamps updatedAt', () => {
      const task = makeTask({ id: 't-1', isCompleted: false })
      seedStore([task])

      const { result } = renderHook(() => useItems())

      act(() => {
        result.current.updateTask('t-1', { isCompleted: true })
      })

      const updated = store.items[0] as ItemTask
      expect(updated.isCompleted).toBe(true)
      expect(updated.updatedAt).toBeInstanceOf(Date)
    })

    it('updateExam updates an exam', () => {
      const exam = makeExam({ id: 'e-1', weight: 30 })
      seedStore([exam])

      const { result } = renderHook(() => useItems())

      act(() => {
        result.current.updateExam('e-1', { weight: 50 })
      })

      const updated = store.items[0] as ItemExam
      expect(updated.weight).toBe(50)
    })

    it('updateEvent updates an event', () => {
      const event = makeEvent({ id: 'ev-1', location: 'Room A' })
      seedStore([event])

      const { result } = renderHook(() => useItems())

      act(() => {
        result.current.updateEvent('ev-1', { location: 'Room B' })
      })

      const updated = store.items[0] as ItemEvent
      expect(updated.location).toBe('Room B')
    })

    it('updateTimetable updates a timetable item', () => {
      const tt = makeTimetable({ id: 'tt-1', classroom: 'Room 101' })
      seedStore([tt])

      const { result } = renderHook(() => useItems())

      act(() => {
        result.current.updateTimetable('tt-1', { classroom: 'Room 202' })
      })

      const updated = store.items[0] as ItemTimetable
      expect(updated.classroom).toBe('Room 202')
    })
  })

  describe('dead code removed', () => {
    it('does not expose getItemById', () => {
      const { result } = renderHook(() => useItems())

      expect(result.current).not.toHaveProperty('getItemById')
    })

    it('does not expose clearCourseItems', () => {
      const { result } = renderHook(() => useItems())

      expect(result.current).not.toHaveProperty('clearCourseItems')
    })
  })
})
