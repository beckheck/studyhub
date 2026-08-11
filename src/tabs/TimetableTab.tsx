import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLocalization } from '@/hooks/useLocalization'
import { useCourses, useItems } from '@/hooks/useStore'
import { ITEM_TIMETABLE_ACTIVITY_TYPES, ItemTimetable, TIME_BLOCKS } from '@/items/timetable/modelSchema'
import { useItemDialog } from '@/items/ItemDialogProvider'
import { Plus } from 'lucide-react'
import React, { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function TimetableTab() {
  const { t } = useTranslation('timetable')
  const { getDayNames, getShortDayNames } = useLocalization()
  const { getCourseTitle } = useCourses()
  const { getItemsByType, updateTimetable } = useItems()
  const itemDialog = useItemDialog()

  // Get timetable events from the unified item system
  const timetableEvents = getItemsByType('timetable')

  const [draggedEvent, setDraggedEvent] = useState<ItemTimetable | null>(null)
  const [dragOverCell, setDragOverCell] = useState<{ day: string; block: string } | null>(null)
  const dragCounter = useRef(0)

  // Days of the week - use English as keys, translate for display
  const weekDays: string[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']

  // Get localized day and short day names using useLocalization
  const dayNames = getDayNames()
  const shortDayNames = getShortDayNames()

  // Helper function to convert to title case
  const toTitleCase = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
  }

  // Helper function to get translated day name in title case
  const getTranslatedDayName = (englishDay: string): string => {
    const dayIndex = weekDays.indexOf(englishDay)
    return dayIndex !== -1 ? toTitleCase(dayNames[dayIndex]) : englishDay
  }

  // Helper function to get translated short day name in title case
  const getTranslatedShortDayName = (englishDay: string): string => {
    const dayIndex = weekDays.indexOf(englishDay)
    return dayIndex !== -1 ? toTitleCase(shortDayNames[dayIndex]) : englishDay.slice(0, 3)
  }

  // Time blocks - use the unified TIME_BLOCKS but convert to legacy format for UI compatibility
  const timeBlocks = TIME_BLOCKS.map(block => ({
    block: block.id,
    time: `${block.startsAt} - ${block.endsAt}`,
  }))

  // Helper function to convert English day name to weekday number
  const getWeekdayNumber = (dayName: string): number => {
    const dayMapping = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 }
    return dayMapping[dayName as keyof typeof dayMapping] || 1
  }

  // Handle empty cell click to add new event
  const handleCellClick = (day: string, block: string): void => {
    // Open the item dialog with pre-filled values
    itemDialog.openAddDialog('timetable', {
      weekday: getWeekdayNumber(day),
      blockId: block,
      activityType: ITEM_TIMETABLE_ACTIVITY_TYPES[0],
      classroom: '',
      teacher: '',
    })
  }

  // Start editing an event
  const editEvent = (event: ItemTimetable): void => {
    itemDialog.openEditDialog(event)
  }

  // Helper function to get time display for an event
  const getEventTimeDisplay = (event: ItemTimetable): string => {
    const block = TIME_BLOCKS.find(b => b.id === event.blockId)
    return block ? `${block.startsAt} - ${block.endsAt}` : ''
  }

  // Helper function to get activity type display
  const getActivityTypeDisplay = (activityType: string): string => {
    return t(`items:timetable.activityTypes.${activityType}`)
  }

  // Filter events for a specific day and block
  const getEventForDayAndBlock = (day: string, block: string): ItemTimetable[] => {
    const weekday = getWeekdayNumber(day)
    return timetableEvents.filter(event => event.weekday === weekday && event.blockId === block)
  }

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, event: ItemTimetable) => {
    setDraggedEvent(event)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', event.id)
  }

  const handleDragEnd = () => {
    setDraggedEvent(null)
    setDragOverCell(null)
    dragCounter.current = 0
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, day: string, block: string) => {
    e.preventDefault()
    dragCounter.current++
    setDragOverCell({ day, block })
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    dragCounter.current--
    if (dragCounter.current === 0) {
      setDragOverCell(null)
    }
  }

  const handleDrop = (e: React.DragEvent, targetDay: string, targetBlock: string) => {
    e.preventDefault()

    if (!draggedEvent) return

    const targetWeekday = getWeekdayNumber(targetDay)

    // Check if the event is being dropped in a different cell
    if (draggedEvent.weekday !== targetWeekday || draggedEvent.blockId !== targetBlock) {
      // Update the event with new weekday and block
      updateTimetable(draggedEvent.id, {
        weekday: targetWeekday,
        blockId: targetBlock,
      })
    }

    setDraggedEvent(null)
    setDragOverCell(null)
    dragCounter.current = 0
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex justify-between items-center">
            <div>
              <span>{t('title')}</span>
              <CardDescription className="text-base font-normal mt-1 dark:text-zinc-100">
                {t('description')}
              </CardDescription>
            </div>
            <Button onClick={() => itemDialog.openAddDialog('timetable')} className="rounded-xl">
              <Plus className="w-4 h-4 mr-2" />
              {t('items:timetable.actions.add')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-2 mb-4">
            <div className="font-medium text-zinc-500 dark:text-zinc-400"></div>
            {weekDays.map(day => (
              <div key={day} className="font-medium text-center text-zinc-800 dark:text-zinc-200">
                <span className="hidden sm:inline">{getTranslatedDayName(day)}</span>
                <span className="sm:hidden">{getTranslatedShortDayName(day)}</span>
              </div>
            ))}
          </div>

          {timeBlocks.map(({ block, time }) => (
            <div key={block} className="grid grid-cols-6 gap-2 mb-3">
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center">
                {t('items:timetable.block')} {block}
                <br />
                {time}
              </div>

              {weekDays.map(day => {
                const eventsInCell = getEventForDayAndBlock(day, block)
                const isEmpty = eventsInCell.length === 0
                const isDragOver = dragOverCell?.day === day && dragOverCell?.block === block

                return (
                  <div
                    key={`${day}-${block}`}
                    className={`min-h-[70px] rounded-lg p-1 transition-all duration-200 ${
                      isEmpty
                        ? 'bg-white/30 dark:bg-white/5 hover:bg-white/50 dark:hover:bg-white/10 cursor-pointer'
                        : 'bg-white/50 dark:bg-white/5'
                    } ${
                      isDragOver
                        ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-300 dark:border-blue-600 border-dashed'
                        : ''
                    }`}
                    onClick={isEmpty ? () => handleCellClick(day, block) : undefined}
                    onDragOver={handleDragOver}
                    onDragEnter={e => handleDragEnter(e, day, block)}
                    onDragLeave={handleDragLeave}
                    onDrop={e => handleDrop(e, day, block)}
                  >
                    {eventsInCell.map(event => (
                      <div
                        key={event.id}
                        className={`relative group cursor-pointer rounded-md shadow-sm p-2 h-full transition-all duration-200 ${
                          draggedEvent?.id === event.id ? 'opacity-50 scale-95' : ''
                        }`}
                        style={{
                          backgroundColor: event.color ? `${event.color}20` : 'rgba(255, 255, 255, 0.9)',
                          borderLeft: `4px solid ${event.color || '#7c3aed'}`,
                          color: event.color ? undefined : undefined,
                        }}
                        draggable
                        onDragStart={e => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        onClick={e => {
                          e.stopPropagation()
                          editEvent(event)
                        }}
                      >
                        <div className="text-xs sm:text-sm font-medium text-zinc-800 dark:text-zinc-200">
                          {getCourseTitle(event.courseId)}
                        </div>
                        <div className="text-xs sm:text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                          {getActivityTypeDisplay(event.activityType)}
                        </div>

                        {/* Hover details popup */}
                        <div className="absolute left-0 bottom-full mb-2 w-56 bg-white dark:bg-zinc-800 shadow-lg rounded-lg p-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: event.color || '#7c3aed' }}
                            ></div>
                            <div className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                              {getCourseTitle(event.courseId)}
                            </div>
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">{t('items:common.fields.type')}:</span>{' '}
                            {getActivityTypeDisplay(event.activityType)}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">{t('items:timetable.fields.timeBlock')}:</span>{' '}
                            {getEventTimeDisplay(event)}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400 mb-1">
                            <span className="font-medium">{t('items:timetable.fields.classroom')}:</span>{' '}
                            {event.classroom}
                          </div>
                          <div className="text-xs text-zinc-600 dark:text-zinc-400">
                            <span className="font-medium">{t('items:timetable.fields.teacher')}:</span> {event.teacher}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Empty cell hint */}
                    {isEmpty && (
                      <div className="flex items-center justify-center h-full opacity-0 hover:opacity-50 transition-opacity duration-200">
                        <div className="text-center">
                          <div className="text-xl text-zinc-400 dark:text-zinc-600">+</div>
                          <div className="text-xs text-zinc-400 dark:text-zinc-600">
                            {isDragOver ? t('dropHere') : t('addEventHint')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
