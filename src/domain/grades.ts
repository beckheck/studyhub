import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'
import type { ExamGrade } from '@/types'

export function calculateCourseAverage(exams: readonly ItemExam[], grades: readonly ExamGrade[]): string | null {
  const examsWithGrades = exams.filter(exam => grades.some(grade => grade.examId === exam.id))

  if (examsWithGrades.length === 0) return null

  let totalWeightedScore = 0
  let totalWeight = 0

  examsWithGrades.forEach(exam => {
    const grade = grades.find(g => g.examId === exam.id)
    if (grade && grade.grade >= 1 && grade.grade <= 7) {
      totalWeightedScore += grade.grade * exam.weight
      totalWeight += exam.weight
    }
  })

  return totalWeight > 0 ? (totalWeightedScore / totalWeight).toFixed(1) : null
}

export function computeUpdatedGrades(grades: readonly ExamGrade[], examId: string, gradeInput: string): ExamGrade[] {
  if (gradeInput === '') {
    return grades.filter(g => g.examId !== examId)
  }

  const gradeValue = parseFloat(gradeInput)

  if (isNaN(gradeValue) || gradeValue < 1 || gradeValue > 7) {
    return [...grades]
  }

  const existing = grades.find(g => g.examId === examId)
  if (existing) {
    return grades.map(g => (g.examId === examId ? { ...g, grade: gradeValue } : g))
  }

  return [...grades, { examId, grade: gradeValue }]
}

export function computeCourseStats(
  courses: readonly { id: string }[],
  tasks: readonly ItemTask[],
  exams: readonly ItemExam[],
): Record<string, { openTasks: number; upcomingExams: number }> {
  return courses.reduce<Record<string, { openTasks: number; upcomingExams: number }>>((acc, course) => {
    acc[course.id] = {
      openTasks: tasks.filter(task => task.courseId === course.id && !task.isCompleted).length,
      upcomingExams: exams.filter(exam => exam.courseId === course.id && !exam.isCompleted).length,
    }
    return acc
  }, {})
}
