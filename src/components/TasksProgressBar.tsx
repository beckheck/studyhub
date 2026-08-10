import { useTranslation } from 'react-i18next'
import { useLocalization } from '../hooks/useLocalization'
import { useConfetti } from '../hooks/useConfetti'
import Confetti from './ui/confetti'

interface ProgressData {
  completed: number
  total: number
  percentage: number
}

interface TaskProgressBarProps {
  progress?: ProgressData | null
  className?: string
  showLabel?: boolean
  labelText?: string
}

// Get progress bar color that transitions from yellow to green with logarithmic progression
const getProgressColor = (percentage: number): string => {
  if (percentage === 0) return '#eab308' // yellow-500
  if (percentage === 100) return '#22c55e' // green-500

  // Use exponential curve to keep it more yellow until near completion
  // This makes the green color only appear prominently in the last 20-30%
  const normalizedProgress = percentage / 100
  const exponentialProgress = Math.pow(normalizedProgress, 2.5) // Exponential curve

  // Color interpolation between yellow and green
  const yellow = { r: 234, g: 179, b: 8 }
  const green = { r: 34, g: 197, b: 94 }

  const r = Math.round(yellow.r + (green.r - yellow.r) * exponentialProgress)
  const g = Math.round(yellow.g + (green.g - yellow.g) * exponentialProgress)
  const b = Math.round(yellow.b + (green.b - yellow.b) * exponentialProgress)

  return `rgb(${r}, ${g}, ${b})`
}

export function TasksProgressBar({ progress, className = 'mb-2', showLabel = true, labelText }: TaskProgressBarProps) {
  const { t } = useTranslation('common')
  const { formatNumber } = useLocalization()

  const confetti = useConfetti({
    trigger: progress?.percentage === 100,
  })

  // Don't render if no progress data or no tasks
  if (!progress || progress.total === 0) {
    return null
  }

  // Use translated "Tasks" as default, but allow override with custom labelText
  const displayLabel = labelText || t('upcoming.tasks')

  return (
    <div className={className}>
      <Confetti confetti={confetti} />
      {showLabel && (
        <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
          <span>
            {displayLabel}: {progress.completed}/{progress.total}
          </span>
          <span>
            {formatNumber(progress.percentage / 100, {
              style: 'percent',
              maximumFractionDigits: 0,
              minimumFractionDigits: 0,
            })}
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${progress.percentage}%`,
            backgroundColor: getProgressColor(progress.percentage),
          }}
        />
      </div>
    </div>
  )
}

export type { ProgressData }
