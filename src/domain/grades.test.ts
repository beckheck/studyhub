import { describe, it, expect } from 'vite-plus/test'
import { calculateCourseAverage, computeUpdatedGrades, computeCourseStats } from './grades'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'
import type { Course, ExamGrade } from '@/types'

function makeExam(id: string, courseId: string, weight: number, isCompleted = false): ItemExam {
  return {
    id,
    type: 'exam',
    title: `Exam ${id}`,
    courseId,
    startsAt: new Date('2026-01-01'),
    weight,
    isCompleted,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  }
}

function makeTask(id: string, courseId: string, isCompleted = false): ItemTask {
  return {
    id,
    type: 'task',
    title: `Task ${id}`,
    courseId,
    dueAt: new Date('2026-01-01'),
    priority: 'medium',
    isCompleted,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    isDeleted: false,
  }
}

function makeCourse(id: string, title: string): Course {
  return { id, title }
}

function makeGrade(examId: string, grade: number): ExamGrade {
  return { examId, grade }
}

describe('calculateCourseAverage', () => {
  it('returns null when no exams have grades', () => {
    const exams = [makeExam('e1', 'c1', 50)]
    const grades: ExamGrade[] = []

    expect(calculateCourseAverage(exams, grades)).toBeNull()
  })

  it('returns the weighted average for a single exam with a grade', () => {
    const exams = [makeExam('e1', 'c1', 100)]
    const grades = [makeGrade('e1', 6)]

    expect(calculateCourseAverage(exams, grades)).toBe('6.0')
  })

  it('returns the weighted average across multiple exams', () => {
    const exams = [makeExam('e1', 'c1', 50), makeExam('e2', 'c1', 50)]
    const grades = [makeGrade('e1', 4), makeGrade('e2', 6)]

    // (4*50 + 6*50) / (50+50) = 500/100 = 5.0
    expect(calculateCourseAverage(exams, grades)).toBe('5.0')
  })

  it('weights exams by their weight property', () => {
    const exams = [makeExam('e1', 'c1', 30), makeExam('e2', 'c1', 70)]
    const grades = [makeGrade('e1', 7), makeGrade('e2', 3)]

    // (7*30 + 3*70) / (30+70) = (210 + 210) / 100 = 4.2
    expect(calculateCourseAverage(exams, grades)).toBe('4.2')
  })

  it('ignores grades outside the 1-7 range', () => {
    const exams = [makeExam('e1', 'c1', 50), makeExam('e2', 'c1', 50)]
    const grades = [makeGrade('e1', 0), makeGrade('e2', 6)]

    // e1 grade 0 is out of range, only e2 counts: 6*50/50 = 6.0
    expect(calculateCourseAverage(exams, grades)).toBe('6.0')
  })

  it('returns null when all grades are out of range', () => {
    const exams = [makeExam('e1', 'c1', 100)]
    const grades = [makeGrade('e1', 8)]

    expect(calculateCourseAverage(exams, grades)).toBeNull()
  })

  it('only counts exams that have a matching grade', () => {
    const exams = [makeExam('e1', 'c1', 50), makeExam('e2', 'c1', 50)]
    const grades = [makeGrade('e1', 5)]

    // Only e1 has a grade: 5*50/50 = 5.0
    expect(calculateCourseAverage(exams, grades)).toBe('5.0')
  })
})

describe('computeUpdatedGrades', () => {
  it('removes the grade when the new value is an empty string', () => {
    const grades = [makeGrade('e1', 5), makeGrade('e2', 6)]

    const result = computeUpdatedGrades(grades, 'e1', '')

    expect(result).toEqual([makeGrade('e2', 6)])
  })

  it('updates an existing grade', () => {
    const grades = [makeGrade('e1', 5)]

    const result = computeUpdatedGrades(grades, 'e1', '6')

    expect(result).toEqual([makeGrade('e1', 6)])
  })

  it('appends a new grade when it does not exist', () => {
    const grades: ExamGrade[] = []

    const result = computeUpdatedGrades(grades, 'e1', '5')

    expect(result).toEqual([makeGrade('e1', 5)])
  })

  it('ignores non-numeric strings', () => {
    const grades: ExamGrade[] = []

    const result = computeUpdatedGrades(grades, 'e1', 'abc')

    expect(result).toEqual([])
  })

  it('ignores values outside the 1-7 range', () => {
    const grades: ExamGrade[] = []

    const result = computeUpdatedGrades(grades, 'e1', '8')

    expect(result).toEqual([])
  })

  it('does not mutate the input array', () => {
    const grades = [makeGrade('e1', 5)]

    computeUpdatedGrades(grades, 'e1', '6')

    expect(grades).toEqual([makeGrade('e1', 5)])
  })
})

describe('computeCourseStats', () => {
  it('counts open tasks and upcoming exams per course', () => {
    const courses = [makeCourse('c1', 'Course 1'), makeCourse('c2', 'Course 2')]
    const tasks = [makeTask('t1', 'c1', false), makeTask('t2', 'c1', true), makeTask('t3', 'c2', false)]
    const exams = [makeExam('e1', 'c1', 50, false), makeExam('e2', 'c1', 50, true), makeExam('e3', 'c2', 50, false)]

    const result = computeCourseStats(courses, tasks, exams)

    expect(result['c1']).toEqual({ openTasks: 1, upcomingExams: 1 })
    expect(result['c2']).toEqual({ openTasks: 1, upcomingExams: 1 })
  })

  it('returns zero counts for a course with no items', () => {
    const courses = [makeCourse('c1', 'Course 1')]
    const tasks: ItemTask[] = []
    const exams: ItemExam[] = []

    const result = computeCourseStats(courses, tasks, exams)

    expect(result['c1']).toEqual({ openTasks: 0, upcomingExams: 0 })
  })
})
