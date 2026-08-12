import { EventTypeIndicator } from '@/components/PlannerSharedComponents'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocalization } from '@/hooks/useLocalization'
import { useCourses, useItems } from '@/hooks/useStore'
import { getItemsOnDate } from '@/lib/calendar-queries'
import { buildCalendarMatrix } from '@/lib/date-utils'
import type { Item } from '@/types'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface MiniCalendarProps {
  onTabChange: (tab: string) => void
  onCourseSelect?: (courseId: string) => void
  isExpanded?: boolean // New prop to control layout
}

export default function MiniCalendar({ onTabChange, isExpanded = false }: MiniCalendarProps) {
  const { t: _t } = useTranslation('planner')
  const { getShortDayNames, formatDate: localizedFormatDate } = useLocalization()
  const { getCourseTitle } = useCourses()
  const { items } = useItems()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Generate calendar matrix
  const matrix = useMemo(
    () => buildCalendarMatrix({ year: currentDate.getFullYear(), month: currentDate.getMonth() }).flat(),
    [currentDate],
  )

  // Helper to get all items for a specific date, applying the view's display filters:
  // - completed tasks hidden on non-past dates (show on past dates for history)
  // - completed exams always shown (a taken exam still belongs on its date)
  const getAllEventsForDate = (date: Date) => {
    const entries = getItemsOnDate([...items] as Item[], date)
    const isPastDate = date < today
    return entries
      .filter(e => isPastDate || !(e.item.type === 'task' && (e.item as { isCompleted: boolean }).isCompleted))
      .map(e => e.item)
  }

  // Helper to count events for a specific date
  const getEventCountForDate = (date: Date) => {
    return getAllEventsForDate(date).length
  }

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const goToPlanner = () => {
    onTabChange('planner')
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  return (
    <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            Calendar Preview
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={goToPlanner} className="h-6 px-2 text-xs hover:bg-white/20">
            View Full
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={goToPreviousMonth} className="h-6 w-6 p-0 hover:bg-white/20">
            <ChevronLeft className="w-3 h-3" />
          </Button>

          <div className="text-sm font-medium">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </div>

          <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-6 w-6 p-0 hover:bg-white/20">
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-2">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1">
          {getShortDayNames().map((dayName, idx) => (
            <div key={idx} className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 py-1">
              {dayName.slice(0, 1)}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className={`grid grid-cols-7 gap-1 ${isExpanded ? 'gap-2' : 'gap-1'}`}>
          {matrix.map((date, i) => {
            const inMonth = date.getMonth() === currentDate.getMonth()
            const isToday = date.toDateString() === today.toDateString()
            const isPastDate = date < today
            const eventCount = getEventCountForDate(date)
            const dayEvents = getAllEventsForDate(date)
            const isHovered = hoveredDate?.toDateString() === date.toDateString()
            const row = Math.floor(i / 7)
            const showTooltipBelow = row < 2

            return (
              <div key={i} className="relative">
                <div
                  className={`
                    flex flex-col items-center justify-center text-xs rounded-md
                    transition-colors cursor-pointer hover:bg-white/20
                    ${
                      isExpanded
                        ? 'h-12 w-full' // Rectangular when expanded
                        : 'aspect-square' // Square when not expanded
                    }
                    ${
                      isToday
                        ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 font-bold'
                        : isPastDate
                          ? 'text-zinc-400 dark:text-zinc-500 opacity-60' // Grey out past dates
                          : inMonth
                            ? 'text-zinc-800 dark:text-zinc-200'
                            : 'text-zinc-400 dark:text-zinc-600'
                    }
                  `}
                  onClick={goToPlanner}
                  onMouseEnter={() => (dayEvents.length > 0 ? setHoveredDate(date) : setHoveredDate(null))}
                  onMouseLeave={() => setHoveredDate(null)}
                >
                  <span className="text-xs leading-none">{date.getDate()}</span>
                  {eventCount > 0 && (
                    <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2">
                      <div
                        className={`w-1 h-1 rounded-full ${
                          isToday
                            ? 'bg-violet-600 dark:bg-violet-400'
                            : isPastDate
                              ? 'bg-zinc-400 dark:bg-zinc-500 opacity-60' // Grey dot for past dates
                              : 'bg-blue-500 dark:bg-blue-400'
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Tooltip */}
                {isHovered && dayEvents.length > 0 && (
                  <div
                    className={`absolute left-1/2 z-50 w-64 -translate-x-1/2 transform rounded-xl border p-3 shadow-xl pointer-events-none ${
                      showTooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                    } ${
                      isPastDate
                        ? 'bg-zinc-100 dark:bg-zinc-700 border-zinc-300 dark:border-zinc-600' // Muted colors for past dates
                        : 'bg-white dark:bg-zinc-800 border-white/20 dark:border-white/10'
                    }`}
                  >
                    <div className="mb-2">
                      <div
                        className={`font-bold text-sm ${
                          isPastDate
                            ? 'text-zinc-600 dark:text-zinc-300' // Muted text for past dates
                            : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {localizedFormatDate(date, { weekday: 'long', month: 'long', day: 'numeric' })}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">
                        {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {dayEvents.slice(0, 5).map((event, idx) => (
                        <div
                          key={idx}
                          className={`space-y-1 rounded-lg p-2 transition-colors ${
                            isPastDate
                              ? 'bg-zinc-100 dark:bg-zinc-600/50 hover:bg-zinc-200 dark:hover:bg-zinc-600/70' // Muted event styling for past dates
                              : 'bg-zinc-50 dark:bg-zinc-700/50 hover:bg-blue-100 dark:hover:bg-blue-900/50'
                          }`}
                          onClick={clickEvent => {
                            clickEvent.stopPropagation()
                            goToPlanner()
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <EventTypeIndicator event={event} size="sm" />
                            <span
                              className={`truncate text-xs font-medium ${
                                isPastDate
                                  ? 'text-zinc-600 dark:text-zinc-300' // Muted text for past events
                                  : 'text-zinc-900 dark:text-zinc-100'
                              }`}
                            >
                              {event.title || `${event.type.charAt(0).toUpperCase() + event.type.slice(1)}`}
                              {'isCompleted' in event && event.isCompleted && (
                                <span className="ml-1 text-green-600">✓</span>
                              )}
                            </span>
                          </div>
                          <div
                            className={`ml-4 text-xs ${
                              isPastDate
                                ? 'text-zinc-500 dark:text-zinc-400' // Muted details for past events
                                : 'text-zinc-600 dark:text-zinc-300'
                            }`}
                          >
                            <div className="font-medium">{getCourseTitle(event.courseId) || 'No course'}</div>
                            {'startsAt' in event && (
                              <div>
                                {new Date(event.startsAt).toLocaleTimeString([], {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {dayEvents.length > 5 && (
                        <div className="py-1 text-center text-xs text-zinc-500 dark:text-zinc-400">
                          +{dayEvents.length - 5} more events
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
