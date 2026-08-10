import { Badge } from '@/components/ui/badge'
import SwipeableItem from '@/components/ui/swipeable-item'
import { useLocalization } from '@/hooks/useLocalization'
import { useCourses } from '@/hooks/useStore'
import { ItemExam } from '@/items/exam/modelSchema'
import { AlertTriangle } from 'lucide-react'
import React from 'react'

interface SwipeableExamProps {
  key: string // Unique key for React
  exam: ItemExam
  index: number
  expanded: number
  calculateDDay: (dateString: string) => string | null
  onComplete: (examId: string) => void
  onClick?: () => void
}

const SwipeableExam = React.forwardRef<HTMLDivElement, SwipeableExamProps>(function SwipeableExam(
  { exam, index, expanded, calculateDDay, onComplete, onClick },
  ref,
) {
  const { getCourseTitle } = useCourses()
  const { formatDateDDMMYYYY } = useLocalization()

  // Convert timestamp to date string for compatibility with existing functions
  const examDateString = new Date(exam.startsAt).toISOString().split('T')[0]

  return (
    <SwipeableItem ref={ref} index={index} expanded={expanded} onComplete={() => onComplete(exam.id)} onClick={onClick}>
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="font-medium">{exam.title}</span>
          <span className="text-xs text-zinc-500">
            {getCourseTitle(exam.courseId)} · {exam.weight || 0}%
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="rounded-full">
            {formatDateDDMMYYYY(examDateString)}
          </Badge>
          <Badge
            variant="outline"
            className={`rounded-full text-xs font-mono flex items-center gap-1 ${
              calculateDDay(examDateString)?.startsWith('D+')
                ? 'border-yellow-400 text-yellow-700 bg-yellow-50 dark:border-yellow-500 dark:text-yellow-400 dark:bg-yellow-900/20'
                : ''
            }`}
          >
            {calculateDDay(examDateString)?.startsWith('D+') && <AlertTriangle className="w-3 h-3" />}
            {calculateDDay(examDateString)}
          </Badge>
        </div>
      </div>
    </SwipeableItem>
  )
})

export default SwipeableExam
