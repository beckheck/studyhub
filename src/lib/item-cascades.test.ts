import { describe, it, expect } from 'vite-plus/test'
import { cascadeExamDelete, cascadeCourseClear } from './item-cascades'
import type { Item } from '@/items/models'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ExamGrade, StudySession } from '@/types'

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

function makeGrade(examId: string, grade: number): ExamGrade {
  return { examId, grade }
}

function makeSession(courseId: string, id: string): StudySession {
  return {
    id,
    courseId,
    durationMin: 30,
    technique: 'pomodoro',
    startTs: 1640995200000,
    endTs: 1640995200000 + 30 * 60 * 1000,
  }
}

describe('cascadeExamDelete', () => {
  it('removes the exam from items', () => {
    const exam = makeExam({ id: 'exam-1' })
    const task = makeTask({ id: 'task-1' })
    const items: Item[] = [exam, task]
    const examGrades: ExamGrade[] = []

    const result = cascadeExamDelete(items, examGrades, 'exam-1')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('task-1')
  })

  it('removes grades belonging to the deleted exam', () => {
    const exam = makeExam({ id: 'exam-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6), makeGrade('exam-1', 5), makeGrade('exam-2', 7)]

    const result = cascadeExamDelete(items, examGrades, 'exam-1')

    expect(result.examGrades).toHaveLength(1)
    expect(result.examGrades[0].examId).toBe('exam-2')
  })

  it('preserves grades for other exams', () => {
    const exam1 = makeExam({ id: 'exam-1' })
    const exam2 = makeExam({ id: 'exam-2', title: 'Other Exam' })
    const items: Item[] = [exam1, exam2]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6), makeGrade('exam-2', 7), makeGrade('exam-2', 5)]

    const result = cascadeExamDelete(items, examGrades, 'exam-1')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('exam-2')
    expect(result.examGrades).toHaveLength(2)
    expect(result.examGrades.every(g => g.examId === 'exam-2')).toBe(true)
  })

  it('returns unchanged arrays when examId is not found', () => {
    const exam = makeExam({ id: 'exam-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6)]

    const result = cascadeExamDelete(items, examGrades, 'exam-missing')

    expect(result.items).toBe(items)
    expect(result.examGrades).toBe(examGrades)
  })

  it('does not mutate the input arrays', () => {
    const exam = makeExam({ id: 'exam-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6)]

    cascadeExamDelete(items, examGrades, 'exam-1')

    expect(items).toHaveLength(1)
    expect(examGrades).toHaveLength(1)
  })
})

describe('cascadeCourseClear', () => {
  it('removes all items for the course', () => {
    const exam = makeExam({ id: 'exam-1', courseId: 'course-1' })
    const task = makeTask({ id: 'task-1', courseId: 'course-1' })
    const otherExam = makeExam({ id: 'exam-2', courseId: 'course-2', title: 'Other' })
    const items: Item[] = [exam, task, otherExam]
    const examGrades: ExamGrade[] = []
    const sessions: StudySession[] = []

    const result = cascadeCourseClear(items, examGrades, sessions, 'course-1')

    expect(result.items).toHaveLength(1)
    expect(result.items[0].id).toBe('exam-2')
  })

  it('removes exam grades for exams in the deleted course', () => {
    const exam = makeExam({ id: 'exam-1', courseId: 'course-1' })
    const otherExam = makeExam({ id: 'exam-2', courseId: 'course-2', title: 'Other' })
    const items: Item[] = [exam, otherExam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6), makeGrade('exam-2', 7)]
    const sessions: StudySession[] = []

    const result = cascadeCourseClear(items, examGrades, sessions, 'course-1')

    expect(result.examGrades).toHaveLength(1)
    expect(result.examGrades[0].examId).toBe('exam-2')
  })

  it('removes study sessions for the course', () => {
    const exam = makeExam({ id: 'exam-1', courseId: 'course-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = []
    const sessions: StudySession[] = [makeSession('course-1', 's-1'), makeSession('course-2', 's-2')]

    const result = cascadeCourseClear(items, examGrades, sessions, 'course-1')

    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].id).toBe('s-2')
  })

  it('preserves items, grades, and sessions for other courses', () => {
    const exam1 = makeExam({ id: 'exam-1', courseId: 'course-1' })
    const exam2 = makeExam({ id: 'exam-2', courseId: 'course-2', title: 'Other' })
    const task2 = makeTask({ id: 'task-2', courseId: 'course-2' })
    const items: Item[] = [exam1, exam2, task2]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6), makeGrade('exam-2', 7)]
    const sessions: StudySession[] = [makeSession('course-1', 's-1'), makeSession('course-2', 's-2')]

    const result = cascadeCourseClear(items, examGrades, sessions, 'course-1')

    expect(result.items).toHaveLength(2)
    expect(result.items.map(i => i.id)).toEqual(['exam-2', 'task-2'])
    expect(result.examGrades).toHaveLength(1)
    expect(result.examGrades[0].examId).toBe('exam-2')
    expect(result.sessions).toHaveLength(1)
    expect(result.sessions[0].id).toBe('s-2')
  })

  it('returns unchanged arrays when courseId is not found', () => {
    const exam = makeExam({ id: 'exam-1', courseId: 'course-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6)]
    const sessions: StudySession[] = [makeSession('course-1', 's-1')]

    const result = cascadeCourseClear(items, examGrades, sessions, 'course-missing')

    expect(result.items).toBe(items)
    expect(result.examGrades).toBe(examGrades)
    expect(result.sessions).toBe(sessions)
  })

  it('does not mutate the input arrays', () => {
    const exam = makeExam({ id: 'exam-1', courseId: 'course-1' })
    const items: Item[] = [exam]
    const examGrades: ExamGrade[] = [makeGrade('exam-1', 6)]
    const sessions: StudySession[] = [makeSession('course-1', 's-1')]

    cascadeCourseClear(items, examGrades, sessions, 'course-1')

    expect(items).toHaveLength(1)
    expect(examGrades).toHaveLength(1)
    expect(sessions).toHaveLength(1)
  })
})
