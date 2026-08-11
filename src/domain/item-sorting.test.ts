import { describe, it, expect } from 'vite-plus/test'
import { sortTasks, sortExamsByDate } from './item-sorting'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'

function makeTask(
  id: string,
  title: string,
  dueAt: Date | null,
  priority: 'low' | 'medium' | 'high',
  isCompleted = false,
): ItemTask {
  return {
    id,
    type: 'task',
    title,
    courseId: 'c1',
    dueAt: dueAt ?? undefined,
    priority,
    isCompleted,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  } as ItemTask
}

function makeExam(id: string, title: string, startsAt: Date): ItemExam {
  return {
    id,
    type: 'exam',
    title,
    courseId: 'c1',
    startsAt,
    weight: 50,
    isCompleted: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  } as ItemExam
}

describe('sortTasks', () => {
  it('sorts by date (earliest first) then priority then title', () => {
    const tasks = [
      makeTask('t2', 'B Task', new Date('2026-01-02'), 'high'),
      makeTask('t1', 'A Task', new Date('2026-01-01'), 'low'),
      makeTask('t3', 'C Task', new Date('2026-01-01'), 'high'),
    ]

    const result = sortTasks(tasks, 'date')

    expect(result.map(t => t.id)).toEqual(['t3', 't1', 't2'])
  })

  it('sorts by priority (high first) then date then title', () => {
    const tasks = [
      makeTask('t1', 'A Task', new Date('2026-01-02'), 'low'),
      makeTask('t2', 'B Task', new Date('2026-01-01'), 'high'),
      makeTask('t3', 'C Task', new Date('2026-01-01'), 'medium'),
    ]

    const result = sortTasks(tasks, 'priority')

    expect(result.map(t => t.id)).toEqual(['t2', 't3', 't1'])
  })

  it('sends tasks without a due date to the end in date mode', () => {
    const tasks = [makeTask('t2', 'No Date', null, 'high'), makeTask('t1', 'Has Date', new Date('2026-01-01'), 'low')]

    const result = sortTasks(tasks, 'date')

    expect(result.map(t => t.id)).toEqual(['t1', 't2'])
  })

  it('breaks ties alphabetically by title', () => {
    const tasks = [
      makeTask('t2', 'Zebra', new Date('2026-01-01'), 'high'),
      makeTask('t1', 'Alpha', new Date('2026-01-01'), 'high'),
    ]

    const result = sortTasks(tasks, 'date')

    expect(result.map(t => t.id)).toEqual(['t1', 't2'])
  })

  it('returns a new array without mutating the input', () => {
    const tasks = [
      makeTask('t2', 'B', new Date('2026-01-02'), 'high'),
      makeTask('t1', 'A', new Date('2026-01-01'), 'low'),
    ]

    const result = sortTasks(tasks, 'date')

    expect(result).not.toBe(tasks)
    expect(tasks.map(t => t.id)).toEqual(['t2', 't1'])
  })

  it('handles an empty array', () => {
    expect(sortTasks([], 'date')).toEqual([])
  })
})

describe('sortExamsByDate', () => {
  it('sorts exams by start date (earliest first)', () => {
    const exams = [
      makeExam('e2', 'B Exam', new Date('2026-01-02')),
      makeExam('e1', 'A Exam', new Date('2026-01-01')),
      makeExam('e3', 'C Exam', new Date('2026-01-03')),
    ]

    const result = sortExamsByDate(exams)

    expect(result.map(e => e.id)).toEqual(['e1', 'e2', 'e3'])
  })

  it('returns a new array without mutating the input', () => {
    const exams = [makeExam('e2', 'B', new Date('2026-01-02')), makeExam('e1', 'A', new Date('2026-01-01'))]

    const result = sortExamsByDate(exams)

    expect(result).not.toBe(exams)
    expect(exams.map(e => e.id)).toEqual(['e2', 'e1'])
  })

  it('handles an empty array', () => {
    expect(sortExamsByDate([])).toEqual([])
  })
})
