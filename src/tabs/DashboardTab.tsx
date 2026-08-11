import CurrentDateTime from '@/components/CurrentDateTime'
import SoundtrackCard from '@/components/SoundtrackCard'
import TipsRow from '@/components/TipsRow'
import TodaySchedule from '@/components/TodaySchedule'
import Upcoming from '@/components/Upcoming'
import WeatherWidget from '@/components/WeatherWidget'
import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { useCourses, useDashboardLayout, useItems, useSoundtrack, useWeather } from '@/hooks/useStore'
import { compareDates, isDateAfterOrEqual, isDateBefore } from '@/lib/date-utils'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  GripVertical,
  Pencil,
  Plus,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface DashboardTabProps {
  onTabChange: (tab: string) => void
  isWidgetEditMode: boolean
}

type DashboardWidgetId =
  | 'weather'
  | 'datetime'
  | 'schedule'
  | 'nextUp'
  | 'soundtrack'
  | 'tips'
  | 'scratchpad'
  | 'mytasks'

const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] = ['schedule', 'scratchpad', 'nextUp', 'mytasks', 'soundtrack', 'tips']

interface DashboardWidgetFrameProps {
  id: DashboardWidgetId
  title: string
  description: string
  isEditMode: boolean
  isVisible: boolean
  isDraggable?: boolean
  isDragging?: boolean
  isDropTarget?: boolean
  onAdd: (id: DashboardWidgetId) => void
  onRemove: (id: DashboardWidgetId) => void
  onDragStart?: (id: DashboardWidgetId) => void
  onDragEnd?: () => void
  onDrop?: (id: DashboardWidgetId) => void
  onDragOver?: (id: DashboardWidgetId) => void
  className?: string
  children: ReactNode
}

interface DashboardBareWidgetFrameProps {
  id: DashboardWidgetId
  title: string
  description: string
  isEditMode: boolean
  isVisible: boolean
  onAdd: (id: DashboardWidgetId) => void
  onRemove: (id: DashboardWidgetId) => void
  children: ReactNode
}

function DashboardWidgetFrame({
  id,
  title,
  description,
  isEditMode,
  isVisible,
  isDraggable = false,
  isDragging = false,
  isDropTarget = false,
  onAdd,
  onRemove,
  onDragStart,
  onDragEnd,
  onDrop,
  onDragOver,
  className,
  children,
}: DashboardWidgetFrameProps) {
  if (!isVisible) {
    if (!isEditMode) {
      return null
    }

    return (
      <Card
        className={`rounded-2xl border-dashed border-amber-300/70 bg-white/55 dark:bg-white/5 backdrop-blur shadow-none ${className ?? ''}`}
      >
        <CardContent className="flex items-center justify-between gap-4 px-5 py-5">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">{description}</div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => onAdd(id)}
            className="rounded-full bg-amber-500 text-white hover:bg-amber-600"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div
      className={`group relative ${className ?? ''} ${isDragging ? 'opacity-60' : ''} ${
        isDropTarget ? 'scale-[1.01] ring-2 ring-amber-400/70 ring-offset-2 ring-offset-transparent' : ''
      }`}
      onDragOver={event => {
        if (!isEditMode || !isDraggable) return
        event.preventDefault()
        onDragOver?.(id)
      }}
      onDrop={event => {
        if (!isEditMode || !isDraggable) return
        event.preventDefault()
        onDrop?.(id)
      }}
    >
      {isEditMode && (
        <>
          {isDraggable && (
            <button
              type="button"
              draggable
              onDragStart={event => {
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', id)
                onDragStart?.(id)
              }}
              onDragEnd={() => onDragEnd?.()}
              aria-label={`Drag ${title}`}
              title={`Drag ${title}`}
              className="absolute left-3 top-3 z-20 flex h-8 w-8 cursor-grab items-center justify-center rounded-full border border-amber-300/40 bg-white/90 text-amber-700 shadow-md transition-colors hover:bg-amber-50 active:cursor-grabbing dark:border-amber-400/20 dark:bg-zinc-950/80 dark:text-amber-200 dark:hover:bg-zinc-900"
            >
              <GripVertical className="w-4 h-4" />
            </button>
          )}
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => onRemove(id)}
            className={`absolute right-3 top-3 z-20 h-8 rounded-full border border-amber-300/40 bg-white/90 px-3 text-xs text-amber-700 shadow-md hover:bg-amber-50 dark:border-amber-400/20 dark:bg-zinc-950/80 dark:text-amber-200 dark:hover:bg-zinc-900 ${
              isDraggable ? 'right-14' : ''
            }`}
          >
            <X className="w-4 h-4" />
            Remove
          </Button>
        </>
      )}
      {children}
    </div>
  )
}

function DashboardBareWidgetFrame({
  id,
  title,
  description,
  isEditMode,
  isVisible,
  onAdd,
  onRemove,
  children,
}: DashboardBareWidgetFrameProps) {
  if (!isVisible) {
    if (!isEditMode) {
      return null
    }

    return (
      <button
        type="button"
        onClick={() => onAdd(id)}
        className="flex min-h-20 w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-amber-300/70 bg-white/40 px-4 py-3 text-left backdrop-blur transition-colors hover:bg-white/60 dark:border-amber-400/20 dark:bg-white/5 dark:hover:bg-white/10"
      >
        <div className="space-y-1">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
          <div className="text-sm text-zinc-600 dark:text-zinc-400">{description}</div>
        </div>
        <div className="rounded-full bg-amber-500 px-3 py-1.5 text-xs font-medium text-white shadow-md">
          <Plus className="mr-1 inline-flex w-4 h-4" />
          Add
        </div>
      </button>
    )
  }

  return (
    <div className="relative group">
      {isEditMode && (
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => onRemove(id)}
          className="absolute right-0 top-0 z-20 h-8 rounded-full border border-amber-300/40 bg-white/90 px-3 text-xs text-amber-700 shadow-md hover:bg-amber-50 dark:border-amber-400/20 dark:bg-zinc-950/80 dark:text-amber-200 dark:hover:bg-zinc-900"
        >
          <X className="w-4 h-4" />
          Remove
        </Button>
      )}
      {children}
    </div>
  )
}

/**
 * Dashboard Tab Component
 */
export default function DashboardTab({ onTabChange, isWidgetEditMode }: DashboardTabProps) {
  const { t } = useTranslation('common')
  const { setSelectedCourse } = useCourses()
  const { getItemsByType, updateTask, updateExam } = useItems()
  const {
    dashboard,
    missionText,
    missionLink,
    setMissionText,
    setWidgetVisibility,
    moveWidgetBefore,
    moveWidgetToEnd,
  } = useDashboardLayout()

  const tasks = getItemsByType('task')
  const exams = getItemsByType('exam')

  const { weather } = useWeather()
  const { soundtrack, setSoundtrackPosition } = useSoundtrack()
  const { openDialog } = useSettingsDialogContext()
  const normalizedMissionLink = missionLink.trim()
  const missionLinkHref = normalizedMissionLink
    ? /^https?:\/\//i.test(normalizedMissionLink)
      ? normalizedMissionLink
      : `https://${normalizedMissionLink}`
    : ''

  const [nextUpExpanded, setNextUpExpanded] = useState<number>(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [hidePending, setHidePending] = useState(false)
  const [pendingExpanded, setPendingExpanded] = useState(false)
  const [draggedWidgetId, setDraggedWidgetId] = useState<DashboardWidgetId | null>(null)
  const [dropTargetWidgetId, setDropTargetWidgetId] = useState<DashboardWidgetId | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  const widgetOrder = (() => {
    if (!dashboard.widgetOrder?.length) return DEFAULT_WIDGET_ORDER
    const validWidgetIds = new Set<DashboardWidgetId>(DEFAULT_WIDGET_ORDER)
    const stored = (dashboard.widgetOrder as string[]).filter((widgetId): widgetId is DashboardWidgetId =>
      validWidgetIds.has(widgetId as DashboardWidgetId),
    )
    const pinnedOrder: DashboardWidgetId[] = ['schedule', 'scratchpad', 'nextUp']

    // Keep the schedule, mission, and next-up widgets locked together at the top.
    const pinnedWidgets = pinnedOrder.filter(
      widgetId => stored.includes(widgetId) || DEFAULT_WIDGET_ORDER.includes(widgetId),
    )
    const remainingWidgets = stored.filter(widgetId => !pinnedOrder.includes(widgetId))
    const missingWidgets = DEFAULT_WIDGET_ORDER.filter(
      widgetId => !pinnedWidgets.includes(widgetId) && !remainingWidgets.includes(widgetId),
    )

    return [...pinnedWidgets, ...remainingWidgets, ...missingWidgets]
  })()

  useEffect(() => {
    if (!isWidgetEditMode) {
      setDraggedWidgetId(null)
      setDropTargetWidgetId(null)
    }
  }, [isWidgetEditMode])

  const toggleTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) {
      updateTask(taskId, { isCompleted: !task.isCompleted })
    }
  }

  const toggleExamComplete = (examId: string) => {
    const exam = exams.find(e => e.id === examId)
    if (exam) {
      updateExam(examId, { isCompleted: !exam.isCompleted })
    }
  }

  const animateToExpanded = (newValue: number) => {
    setIsAnimating(true)
    setTimeout(() => {
      setNextUpExpanded(newValue)
      setTimeout(() => setIsAnimating(false), 300)
    }, 50)
  }

  const animateToCollapsed = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setNextUpExpanded(0)
      setTimeout(() => setIsAnimating(false), 300)
    }, 50)
  }

  const isWidgetVisible = (widgetId: DashboardWidgetId) => dashboard.widgetVisibility[widgetId] !== false

  const setWidgetVisible = (widgetId: DashboardWidgetId, visible: boolean) => {
    setWidgetVisibility(widgetId, visible)
    if (widgetId === 'soundtrack' && !visible) {
      setSoundtrackPosition('off')
    }
    if (widgetId === 'soundtrack' && visible) {
      setSoundtrackPosition('dashboard')
    }
  }

  const handleDragStart = (widgetId: DashboardWidgetId) => {
    setDraggedWidgetId(widgetId)
    setDropTargetWidgetId(widgetId)
  }

  const handleDragEnd = () => {
    setDraggedWidgetId(null)
    setDropTargetWidgetId(null)
  }

  const handleDropOnWidget = (targetWidgetId: DashboardWidgetId) => {
    if (!draggedWidgetId || draggedWidgetId === targetWidgetId) {
      handleDragEnd()
      return
    }

    moveWidgetBefore(draggedWidgetId, targetWidgetId)
    handleDragEnd()
  }

  const handleDropOnBoard = () => {
    if (!draggedWidgetId) {
      return
    }

    moveWidgetToEnd(draggedWidgetId)
    handleDragEnd()
  }

  const renderOrderableWidget = (widgetId: DashboardWidgetId) => {
    const draggableWidgetProps = {
      isDraggable: true,
      isDragging: draggedWidgetId === widgetId,
      isDropTarget: dropTargetWidgetId === widgetId,
      onDragStart: handleDragStart,
      onDragEnd: handleDragEnd,
      onDrop: handleDropOnWidget,
      onDragOver: (targetWidgetId: DashboardWidgetId) => setDropTargetWidgetId(targetWidgetId),
    }

    switch (widgetId) {
      case 'schedule':
        return (
          <DashboardWidgetFrame
            key={widgetId}
            id={widgetId}
            title="Today schedule"
            description="Your timetable for the current day."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible(widgetId)}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
            className="xl:col-span-12"
            {...draggableWidgetProps}
          >
            <TodaySchedule />
          </DashboardWidgetFrame>
        )
      case 'nextUp':
        return <Fragment key={widgetId}>{renderNextUpWidget()}</Fragment>
      case 'soundtrack':
        return (
          <DashboardWidgetFrame
            key={widgetId}
            id={widgetId}
            title="Soundtrack"
            description="A focus mix you can move around the app."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible(widgetId) && soundtrack.position === 'dashboard'}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
            className="xl:col-span-12"
            {...draggableWidgetProps}
          >
            <SoundtrackCard
              visible={true}
              embed={soundtrack.embed}
              position="dashboard"
              onPositionChange={setSoundtrackPosition}
            />
          </DashboardWidgetFrame>
        )
      case 'tips':
        return (
          <DashboardWidgetFrame
            key={widgetId}
            id={widgetId}
            title="Tips"
            description="Small study nudges and reminders."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible(widgetId)}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
            className="xl:col-span-12"
            {...draggableWidgetProps}
          >
            <TipsRow />
          </DashboardWidgetFrame>
        )
      case 'scratchpad':
        return (
          <DashboardWidgetFrame
            key={widgetId}
            id={widgetId}
            title="This week's mission"
            description="A tiny freeform note area for the week ahead."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible(widgetId)}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
            className="xl:col-span-12"
            {...draggableWidgetProps}
          >
            <Card className="rounded-2xl border-none shadow-xl bg-yellow-50/80 dark:bg-yellow-950/20 backdrop-blur">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <div className="min-w-28 shrink-0">
                    <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      This week's mission
                    </div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">Write freely here.</div>
                  </div>
                  <textarea
                    value={missionText}
                    onChange={e => setMissionText(e.target.value)}
                    placeholder="Type your mission for the week..."
                    rows={1}
                    className="h-40 min-h-40 max-h-16 w-full resize-none rounded-lg border border-yellow-200/40 bg-white/60 p-2.5 text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 dark:border-yellow-400/20 dark:bg-white/5 dark:text-white dark:placeholder-zinc-500"
                  />
                  {missionLinkHref && (
                    <a
                      href={missionLinkHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Open this week's mission link"
                      title="Open this week's mission link"
                      className="mt-2 inline-flex self-start items-center justify-center text-amber-700 transition-colors hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          </DashboardWidgetFrame>
        )
      case 'mytasks':
        return (
          <DashboardWidgetFrame
            key={widgetId}
            id={widgetId}
            title="My Tasks"
            description="Your upcoming tasks."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible(widgetId)}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
            className="xl:col-span-6"
            {...draggableWidgetProps}
          >
            <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
              <CardContent className="p-5">
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {tasks
                    .filter(t => !t.isCompleted)
                    .sort((a, b) => compareDates(a.dueAt, b.dueAt))
                    .slice(0, 10)
                    .map(task => (
                      <div
                        key={task.id}
                        className="flex items-start gap-3 pb-3 border-b border-zinc-200/50 dark:border-zinc-700/50 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={task.isCompleted}
                          onChange={() => toggleTask(task.id)}
                          className="mt-1 rounded cursor-pointer accent-amber-500"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {task.title}
                          </div>
                          {task.dueAt && (
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                              Due {new Date(task.dueAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  {tasks.filter(t => !t.isCompleted).length === 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-6">No pending tasks</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </DashboardWidgetFrame>
        )
    }
  }

  const renderNextUpWidget = () => {
    const today = new Date()

    let filteredExams = exams.slice().filter(e => !e.isCompleted)
    let filteredTasks = tasks.slice().filter(t => !t.isCompleted)

    if (hidePending) {
      filteredExams = filteredExams.filter(e => {
        const examDate = new Date(e.startsAt)
        return isDateAfterOrEqual(examDate, today)
      })

      filteredTasks = filteredTasks.filter(t => {
        if (!t.dueAt) return true
        const taskDate = new Date(t.dueAt)
        return isDateAfterOrEqual(taskDate, today)
      })
    }

    const allExams = filteredExams.sort((a, b) => compareDates(a.startsAt, b.startsAt))
    const allTasks = filteredTasks.sort((a, b) => compareDates(a.dueAt, b.dueAt))

    const currentExamCount = 5 + nextUpExpanded * 3
    const currentTaskCount = 5 + nextUpExpanded * 3

    const hasMoreExams = allExams.length > currentExamCount
    const hasMoreTasks = allTasks.length > currentTaskCount
    const hasMore = hasMoreExams || hasMoreTasks
    const showButton = hasMore || nextUpExpanded > 0

    return (
      <DashboardWidgetFrame
        id="nextUp"
        title={t('dashboard.nextUp')}
        description={t('dashboard.upcomingExamsAndTasks')}
        isEditMode={isWidgetEditMode}
        isVisible={isWidgetVisible('nextUp')}
        isDraggable
        isDragging={draggedWidgetId === 'nextUp'}
        isDropTarget={dropTargetWidgetId === 'nextUp'}
        onAdd={widgetId => setWidgetVisible(widgetId, true)}
        onRemove={widgetId => setWidgetVisible(widgetId, false)}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDrop={handleDropOnWidget}
        onDragOver={targetWidgetId => setDropTargetWidgetId(targetWidgetId)}
        className="xl:col-span-12"
      >
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  {t('dashboard.nextUp')}
                </CardTitle>
                <CardDescription>{t('dashboard.upcomingExamsAndTasks')}</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-zinc-600 dark:text-zinc-400">Hide Pending</span>
                <Switch
                  checked={hidePending}
                  onCheckedChange={setHidePending}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {hidePending && (
              <div className="border-b border-zinc-200 pb-4 dark:border-zinc-700">
                <Button
                  variant="ghost"
                  onClick={() => setPendingExpanded(!pendingExpanded)}
                  className="h-auto w-full justify-start rounded-xl p-2 hover:bg-white/50 dark:hover:bg-white/5"
                >
                  <div className="flex items-center gap-2">
                    {pendingExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">Pending Items</span>
                    <span className="ml-2 text-xs text-zinc-500">
                      (
                      {(() => {
                        const today = new Date()

                        const overdueExams = exams.filter(e => {
                          if (e.isCompleted) return false
                          const examDate = new Date(e.startsAt)
                          return isDateBefore(examDate, today)
                        }).length

                        const overdueTasks = tasks.filter(t => {
                          if (t.isCompleted || !t.dueAt) return false
                          const taskDate = new Date(t.dueAt)
                          return isDateBefore(taskDate, today)
                        }).length

                        return overdueExams + overdueTasks
                      })()}
                      )
                    </span>
                  </div>
                </Button>

                {pendingExpanded && (
                  <div className="mt-3">
                    <Upcoming
                      expanded={0}
                      hidePending={false}
                      showOnlyPending={true}
                      onTaskComplete={toggleTask}
                      onExamComplete={toggleExamComplete}
                      onTabChange={onTabChange}
                      onCourseSelect={setSelectedCourse}
                      onTaskClick={task => {
                        setSelectedCourse(task.courseId)
                        onTabChange('courses')
                      }}
                    />
                  </div>
                )}
              </div>
            )}

            <div
              ref={contentRef}
              className={`transition-all duration-300 ease-in-out ${isAnimating ? 'opacity-80' : 'opacity-100'}`}
              style={{
                transform: isAnimating ? 'translateY(-2px)' : 'translateY(0)',
              }}
            >
              <Upcoming
                expanded={nextUpExpanded}
                hidePending={hidePending}
                showOnlyPending={false}
                onTaskComplete={toggleTask}
                onExamComplete={toggleExamComplete}
                onTabChange={onTabChange}
                onCourseSelect={setSelectedCourse}
                onTaskClick={task => {
                  setSelectedCourse(task.courseId)
                  onTabChange('courses')
                }}
              />
            </div>
          </CardContent>
          {showButton && (
            <div className="flex justify-center gap-2 pb-4">
              {nextUpExpanded > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => animateToCollapsed()}
                  disabled={isAnimating}
                  className="h-8 w-8 rounded-full p-0 transition-all duration-300 ease-in-out hover:bg-white/20 disabled:opacity-50"
                  title="Collapse"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-all duration-300 ease-in-out transform rotate-180 ${
                      isAnimating ? 'scale-90' : 'scale-100'
                    }`}
                  />
                </Button>
              )}

              {hasMore && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => animateToExpanded(nextUpExpanded + 1)}
                  disabled={isAnimating}
                  className="h-8 w-8 rounded-full p-0 transition-all duration-300 ease-in-out hover:bg-white/20 disabled:opacity-50"
                  title="Show more"
                >
                  <ChevronDown
                    className={`h-4 w-4 transition-all duration-300 ease-in-out ${
                      isAnimating ? 'scale-90' : 'scale-100'
                    }`}
                  />
                </Button>
              )}
            </div>
          )}
        </Card>
      </DashboardWidgetFrame>
    )
  }

  const _soundtrackVisible = isWidgetVisible('soundtrack') && soundtrack.position === 'dashboard'

  return (
    <div className="space-y-6">
      {isWidgetEditMode && (
        <Card className="rounded-2xl border-dashed border-amber-300/70 bg-amber-50/70 shadow-none backdrop-blur dark:border-amber-500/20 dark:bg-amber-500/5">
          <CardContent className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
                <Pencil className="w-4 h-4" />
                Widget editor active
              </div>
              <div className="text-sm text-amber-800/80 dark:text-amber-200/80">
                Remove any widget now, or bring it back with the add tiles.
              </div>
            </div>
            <div className="text-xs font-medium uppercase tracking-wide text-amber-700/70 dark:text-amber-200/70">
              Inspired by a pinned-board layout
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-6">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
          <DashboardBareWidgetFrame
            id="weather"
            title="Weather widget"
            description="Live weather at a glance."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible('weather')}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
          >
            <WeatherWidget
              apiKey={weather.apiKey}
              location={weather.location}
              onWeatherClick={() => openDialog('weatherApi')}
            />
          </DashboardBareWidgetFrame>

          <DashboardBareWidgetFrame
            id="datetime"
            title="Date and time"
            description="A compact clock and date display."
            isEditMode={isWidgetEditMode}
            isVisible={isWidgetVisible('datetime')}
            onAdd={widgetId => setWidgetVisible(widgetId, true)}
            onRemove={widgetId => setWidgetVisible(widgetId, false)}
          >
            <CurrentDateTime />
          </DashboardBareWidgetFrame>
        </div>
      </div>

      <div
        className="grid grid-cols-1 gap-6 xl:grid-cols-12"
        onDragOver={event => {
          if (!isWidgetEditMode || !draggedWidgetId) return
          event.preventDefault()
          setDropTargetWidgetId(null)
        }}
        onDrop={event => {
          if (!isWidgetEditMode || !draggedWidgetId) return
          event.preventDefault()
          handleDropOnBoard()
        }}
      >
        {widgetOrder.map(widgetId => renderOrderableWidget(widgetId))}
      </div>
    </div>
  )
}
