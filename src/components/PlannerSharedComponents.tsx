import { TasksProgressBar, type ProgressData } from '@/components/TasksProgressBar'
import { RichTextDisplay } from '@/components/ui/rich-text-editor'
import { useCourses } from '@/hooks/useStore'
import { useTranslation } from 'react-i18next'

// Shared event type indicator component
export const EventTypeIndicator = ({ event, size = 'sm' }: { event: any; size?: 'sm' | 'md' }) => {
  const sizeClass = size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2'

  if (event.type === 'exam') {
    return <span className={`flex-shrink-0 inline-block rounded-full bg-rose-500 ${sizeClass}`}></span>
  }
  if (event.type === 'task') {
    return <span className={`flex-shrink-0 inline-block rounded-full bg-amber-500 ${sizeClass}`}></span>
  }
  if (event.type === 'event') {
    return (
      <span
        className={`flex-shrink-0 rounded-full ${sizeClass}`}
        style={{ backgroundColor: event.color || '#6366f1' }}
      ></span>
    )
  }
  return null
}

// Shared event tooltip component
export const EventTooltip = ({
  event,
  onContentChange,
  progress,
  onProgressChange,
}: {
  event: any
  onContentChange?: (newContent: string) => void
  progress?: ProgressData
  onProgressChange?: (progress: ProgressData) => void
}) => {
  const { getCourseTitle } = useCourses()
  const { t } = useTranslation('planner')
  return (
    <div
      style={{
        backgroundColor: 'var(--background, white)',
        zIndex: 99999,
        position: 'fixed',
        transform: 'translateY(-100%)',
        marginBottom: '8px',
        left: '50%',
        marginLeft: '-8rem', // half of w-64 (16rem)
      }}
      className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 w-64 p-3 rounded-xl shadow-xl border border-white/20 dark:border-white/10"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <EventTypeIndicator event={event} />
          <span className="font-medium text-zinc-900 dark:text-zinc-100">{event.title || event.type}</span>
        </div>
        <div className="space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <div>{getCourseTitle(event.courseId)}</div>
          <div>{t(`items:${event.type}.title`)}</div>
          {event.location && <div>{t('tooltip.location', { location: event.location })}</div>}
          {event.weight && <div>{t('tooltip.weight', { weight: event.weight })}</div>}
          {event.priority && (
            <div>{t('tooltip.priority', { priority: t(`items:task.priority.${event.priority}`) })}</div>
          )}
          {event.notes && (
            <div className="mt-2">
              <TasksProgressBar progress={progress} className="mb-2" />
              <RichTextDisplay
                content={event.notes}
                className="text-sm"
                onContentChange={onContentChange}
                onProgressChange={onProgressChange}
              />
            </div>
          )}
        </div>
      </div>
      {/* Arrow */}
      <div className="absolute bottom-0 left-4 transform translate-y-full">
        <div
          style={{ backgroundColor: 'var(--background, white)' }}
          className="w-2 h-2 rotate-45 transform -translate-y-1 border-r border-b border-white/20 dark:border-white/10"
        ></div>
      </div>
    </div>
  )
}
