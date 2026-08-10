import { useItems } from '@/hooks/useStore'
import { ItemTask } from '@/items/task/modelSchema'
import { ItemExam } from '@/items/exam/modelSchema'
import { calculateDDay, compareDates, isDateAfterOrEqual, isDateBefore } from '@/lib/date-utils'
import { AnimatePresence } from 'framer-motion'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import SwipeableExam from './SwipeableExam'
import SwipeableTask from './SwipeableTask'

interface UpcomingProps {
  expanded: number
  hidePending?: boolean
  showOnlyPending?: boolean
  onTaskComplete?: (taskId: string) => void
  onExamComplete?: (examId: string) => void
  onTaskClick?: (task: any) => void
  onTabChange?: (tab: string) => void
  onCourseSelect?: (courseId: string) => void
}

export default function Upcoming({
  expanded,
  hidePending = false,
  showOnlyPending = false,
  onTaskComplete,
  onExamComplete,
  onTaskClick,
  onTabChange,
  onCourseSelect,
}: UpcomingProps) {
  const { t } = useTranslation('common')
  const { getItemsByType, updateItem } = useItems()

  // Get items by type
  const tasks = getItemsByType('task') as ItemTask[]
  const exams = getItemsByType('exam') as ItemExam[]

  // Helper functions for item updates
  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      updateItem(taskId, { isCompleted: !task.isCompleted } as any)
    }
  }

  const toggleExamComplete = (examId: string) => {
    const exam = exams.find(e => e.id === examId)
    if (exam) {
      updateItem(examId, { isCompleted: !exam.isCompleted } as any)
    }
  }

  const upcomingExams = useMemo(() => {
    const today = new Date()

    let filtered = [...exams].filter(e => !e.isCompleted)

    if (showOnlyPending) {
      // Show only overdue exams
      filtered = filtered.filter(e => {
        const examDate = new Date(e.startsAt)
        return isDateBefore(examDate, today)
      })
    } else if (hidePending) {
      // Hide overdue exams
      filtered = filtered.filter(e => {
        const examDate = new Date(e.startsAt)
        return isDateAfterOrEqual(examDate, today)
      })
    }

    const sorted = filtered.sort((a, b) => compareDates(a.startsAt, b.startsAt))
    const baseCount = showOnlyPending ? 50 : 5 // Changed from 3 to 5 to match tasks
    const additionalCount = expanded * 3
    return sorted.slice(0, baseCount + additionalCount)
  }, [exams, expanded, hidePending, showOnlyPending])

  const upcomingTasks: ItemTask[] = useMemo(() => {
    const today = new Date()

    let filtered = [...tasks].filter(t => !t.isCompleted)

    if (showOnlyPending) {
      // Show only overdue tasks
      filtered = filtered.filter(t => {
        if (!t.dueAt) return false
        const taskDate = new Date(t.dueAt)
        return isDateBefore(taskDate, today)
      })
    } else if (hidePending) {
      // Hide overdue tasks
      filtered = filtered.filter(t => {
        if (!t.dueAt) return true // Tasks without due date are not overdue
        const taskDate = new Date(t.dueAt)
        return isDateAfterOrEqual(taskDate, today)
      })
    }

    const sorted = filtered.sort((a, b) => compareDates(a.dueAt, b.dueAt))
    const baseCount = showOnlyPending ? 50 : 5 // Show more pending items when expanded
    const additionalCount = expanded * 3
    return sorted.slice(0, baseCount + additionalCount)
  }, [tasks, expanded, hidePending, showOnlyPending])

  // Check if there are more items to show
  const allExams = useMemo(
    () => [...exams].filter(e => !e.isCompleted).sort((a, b) => compareDates(a.startsAt, b.startsAt)),
    [exams],
  )
  const allTasks = useMemo(
    () => [...tasks].filter(t => !t.isCompleted).sort((a, b) => compareDates(a.dueAt, b.dueAt)),
    [tasks],
  )

  const hasMoreExams = allExams.length > upcomingExams.length
  const hasMoreTasks = allTasks.length > upcomingTasks.length
  const _hasMore = hasMoreExams || hasMoreTasks

  // Helper function to calculate D-Day
  const calculateDDayLocal = (dateString: string): string | null => {
    return calculateDDay(dateString)
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{t('upcoming.exams')}</div>
        <div className="space-y-2">
          {upcomingExams.length === 0 && <div className="text-sm text-zinc-500">{t('upcoming.noExams')}</div>}
          <AnimatePresence mode="popLayout">
            {upcomingExams.map((e, index) => (
              <SwipeableExam
                key={e.id}
                exam={e}
                index={index}
                expanded={expanded}
                calculateDDay={calculateDDayLocal}
                onComplete={onExamComplete || toggleExamComplete}
                onClick={() => {
                  onTabChange?.('courses')
                  if (e.courseId) onCourseSelect?.(e.courseId)
                }}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>
      <div>
        <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">{t('upcoming.tasks')}</div>
        <div className="space-y-2">
          {upcomingTasks.length === 0 && <div className="text-sm text-zinc-500">{t('upcoming.noTasks')}</div>}
          <AnimatePresence mode="popLayout">
            {upcomingTasks.map((t, index) => {
              return (
                <SwipeableTask
                  key={t.id}
                  task={t}
                  index={index}
                  expanded={expanded}
                  calculateDDay={calculateDDayLocal}
                  onComplete={onTaskComplete || toggleTask}
                  onClick={() => onTaskClick && onTaskClick(t)}
                />
              )
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
