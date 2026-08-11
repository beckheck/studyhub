import { isDateBefore } from '@/lib/date-utils'
import type { ItemExam } from '@/items/exam/modelSchema'
import type { ItemTask } from '@/items/task/modelSchema'

export function isOverdue(item: ItemTask | ItemExam, now: Date): boolean {
  if (item.isCompleted) return false

  const deadline = item.type === 'task' ? item.dueAt : item.startsAt
  if (!deadline) return false

  return isDateBefore(deadline, now)
}

export function getOverdueItems(
  exams: readonly ItemExam[],
  tasks: readonly ItemTask[],
  now: Date,
): { exams: ItemExam[]; tasks: ItemTask[] } {
  return {
    exams: exams.filter(exam => isOverdue(exam, now)),
    tasks: tasks.filter(task => isOverdue(task, now)),
  }
}
