import type { ItemTask } from '@/items/task/modelSchema'
import type { ItemExam } from '@/items/exam/modelSchema'
import { compareDates } from '@/lib/date-utils'

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function sortTasks(tasks: readonly ItemTask[], sortOrder: 'date' | 'priority'): ItemTask[] {
  return tasks.toSorted((a, b) => {
    if (sortOrder === 'date') {
      if (!a.dueAt && !b.dueAt) {
        const pc = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
        if (pc !== 0) return pc
        return (a.title || '').localeCompare(b.title || '')
      }
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1

      const dc = compareDates(a.dueAt, b.dueAt)
      if (dc !== 0) return dc

      const pc = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pc !== 0) return pc

      return (a.title || '').localeCompare(b.title || '')
    } else {
      const pc = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (pc !== 0) return pc

      if (!a.dueAt && !b.dueAt) {
        return (a.title || '').localeCompare(b.title || '')
      }
      if (!a.dueAt) return 1
      if (!b.dueAt) return -1

      const dc = compareDates(a.dueAt, b.dueAt)
      if (dc !== 0) return dc

      return (a.title || '').localeCompare(b.title || '')
    }
  })
}

export function sortExamsByDate(exams: readonly ItemExam[]): ItemExam[] {
  return exams.toSorted((a, b) => compareDates(a.startsAt, b.startsAt))
}
