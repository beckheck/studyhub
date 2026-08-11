import type { Item } from '@/items/models'
import type { ExamGrade, StudySession } from '@/types'

export function cascadeExamDelete(
  items: Item[],
  examGrades: ExamGrade[],
  examId: string,
): { items: Item[]; examGrades: ExamGrade[] } {
  const itemExists = items.some(item => item.id === examId)
  if (!itemExists) {
    return { items, examGrades }
  }

  return {
    items: items.filter(item => item.id !== examId),
    examGrades: examGrades.filter(grade => grade.examId !== examId),
  }
}

export function cascadeCourseClear(
  items: Item[],
  examGrades: ExamGrade[],
  sessions: StudySession[],
  courseId: string,
): { items: Item[]; examGrades: ExamGrade[]; sessions: StudySession[] } {
  const courseItems = items.filter(item => item.courseId === courseId)
  if (courseItems.length === 0) {
    return { items, examGrades, sessions }
  }

  const examIdsToDelete = courseItems.filter(item => item.type === 'exam').map(item => item.id)

  return {
    items: items.filter(item => item.courseId !== courseId),
    examGrades: examGrades.filter(grade => !examIdsToDelete.includes(grade.examId)),
    sessions: sessions.filter(session => session.courseId !== courseId),
  }
}
