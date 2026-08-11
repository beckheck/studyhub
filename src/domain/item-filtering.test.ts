import { describe, it, expect } from 'vite-plus/test'
import { isOverdue, getOverdueItems } from './item-filtering'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'

const now = new Date('2026-01-15T12:00:00')

function makeTask(id: string, dueAt: Date | null, isCompleted = false, projectId = 'p1'): ItemTask {
  return {
    id,
    type: 'task',
    title: `Task ${id}`,
    courseId: 'c1',
    projectId,
    dueAt: dueAt ?? undefined,
    priority: 'medium',
    isCompleted,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  } as ItemTask
}

function makeExam(id: string, startsAt: Date, isCompleted = false): ItemExam {
  return {
    id,
    type: 'exam',
    title: `Exam ${id}`,
    courseId: 'c1',
    startsAt,
    weight: 50,
    isCompleted,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  } as ItemExam
}

describe('isOverdue', () => {
  it('returns true for an uncompleted task with a due date before now', () => {
    const task = makeTask('t1', new Date('2026-01-10'))
    expect(isOverdue(task, now)).toBe(true)
  })

  it('returns false for a completed task', () => {
    const task = makeTask('t1', new Date('2026-01-10'), true)
    expect(isOverdue(task, now)).toBe(false)
  })

  it('returns false for a task with no due date', () => {
    const task = makeTask('t1', null)
    expect(isOverdue(task, now)).toBe(false)
  })

  it('returns true for an uncompleted exam before now', () => {
    const exam = makeExam('e1', new Date('2026-01-10'))
    expect(isOverdue(exam, now)).toBe(true)
  })

  it('returns false for a completed exam', () => {
    const exam = makeExam('e1', new Date('2026-01-10'), true)
    expect(isOverdue(exam, now)).toBe(false)
  })

  it('returns false for a task due in the future', () => {
    const task = makeTask('t1', new Date('2026-01-20'))
    expect(isOverdue(task, now)).toBe(false)
  })
})

describe('getOverdueItems', () => {
  it('returns overdue exams and tasks', () => {
    const exams = [
      makeExam('e1', new Date('2026-01-10')), // overdue
      makeExam('e2', new Date('2026-01-20')), // future
      makeExam('e3', new Date('2026-01-10'), true), // completed
    ]
    const tasks = [
      makeTask('t1', new Date('2026-01-10')), // overdue
      makeTask('t2', new Date('2026-01-20')), // future
    ]

    const result = getOverdueItems(exams, tasks, now)

    expect(result.exams.map(e => e.id)).toEqual(['e1'])
    expect(result.tasks.map(t => t.id)).toEqual(['t1'])
  })

  it('returns empty arrays when nothing is overdue', () => {
    const result = getOverdueItems([], [], now)
    expect(result.exams).toEqual([])
    expect(result.tasks).toEqual([])
  })
})
