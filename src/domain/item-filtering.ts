import { isDateBefore } from '@/lib/date-utils'
import type { ItemEvent } from '@/items/event/modelSchema'
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

export function getUpcomingItems(
  events: readonly ItemEvent[],
  tasks: readonly ItemTask[],
  projectId: string,
  now: Date,
): { meetings: ItemEvent[]; tasks: ItemTask[] } {
  return {
    meetings: events.filter(event => event.projectId === projectId && !isDateBefore(event.endsAt, now)),
    tasks: tasks.filter(
      task => task.projectId === projectId && !task.isCompleted && !!task.dueAt && !isDateBefore(task.dueAt, now),
    ),
  }
}
