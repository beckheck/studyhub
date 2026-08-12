import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization } from '@/hooks/useLocalization'
import { useCourseRecords, useCourses, useItems } from '@/hooks/useStore'
import { getItemsOnDate } from '@/lib/calendar-queries'
import { buildCalendarMatrix, getDateString } from '@/lib/date-utils'
import { CourseRecord, Item } from '@/types'
import {
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileText,
  FlaskConical,
  GraduationCap,
  NotebookPen,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

const RECORD_TYPES = [
  { value: 'note', label: 'Note', icon: FileText },
  { value: 'attendance', label: 'Attendance', icon: Users },
  { value: 'homework', label: 'Homework', icon: NotebookPen },
  { value: 'lecture', label: 'Lecture', icon: BookOpen },
  { value: 'lab', label: 'Lab', icon: FlaskConical },
  { value: 'other', label: 'Other', icon: GraduationCap },
] as const

const MOOD_OPTIONS = [
  { value: 1, emoji: '😫', label: 'Terrible' },
  { value: 2, emoji: '😕', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😊', label: 'Great' },
]

interface CourseRecordCalendarProps {
  courseId: string
}

export default function CourseRecordCalendar({ courseId }: CourseRecordCalendarProps) {
  const { t } = useTranslation('common')
  const { getShortDayNames, formatDateDDMMYYYY } = useLocalization()
  const { getCourseTitle } = useCourses()
  const { items } = useItems()
  const { courseRecords, addRecord, updateRecord, deleteRecord } = useCourseRecords()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<CourseRecord | null>(null)

  // Form state
  const [recordType, setRecordType] = useState<CourseRecord['type']>('note')
  const [recordContent, setRecordContent] = useState('')
  const [recordMood, setRecordMood] = useState<number | undefined>(undefined)

  // Get records for this course
  const courseRecordsFiltered = courseRecords.filter(r => r.courseId === courseId)

  // Generate calendar matrix
  const matrix = useMemo(
    () => buildCalendarMatrix({ year: currentDate.getFullYear(), month: currentDate.getMonth() }).flat(),
    [currentDate],
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get events for a specific date
  const getDateInfo = (date: Date) => {
    const dateStr = getDateString(date)
    const entries = getItemsOnDate([...items] as Item[], date, { courseFilter: courseId })
    const courseItems = entries.map(e => e.item)
    const tasks = courseItems.filter(item => item.type === 'task')
    const exams = courseItems.filter(item => item.type === 'exam')
    const records = courseRecordsFiltered.filter(r => r.date === dateStr)
    return { tasks, exams, records }
  }

  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setDialogOpen(true)
    setEditingRecord(null)
    setRecordType('note')
    setRecordContent('')
    setRecordMood(undefined)
  }

  const handleEditRecord = (record: CourseRecord) => {
    setEditingRecord(record)
    setRecordType(record.type)
    setRecordContent(record.content)
    setRecordMood(record.mood)
  }

  const handleSaveRecord = () => {
    if (!selectedDate || !recordContent.trim()) return

    const dateStr = getDateString(selectedDate)

    if (editingRecord) {
      updateRecord(editingRecord.id, {
        content: recordContent.trim(),
        type: recordType,
        mood: recordMood,
      })
    } else {
      addRecord({
        courseId,
        date: dateStr,
        content: recordContent.trim(),
        type: recordType,
        mood: recordMood,
      })
    }

    setEditingRecord(null)
    setRecordContent('')
    setRecordType('note')
    setRecordMood(undefined)
  }

  const handleDeleteRecord = (recordId: string) => {
    deleteRecord(recordId)
    if (editingRecord?.id === recordId) {
      setEditingRecord(null)
      setRecordContent('')
      setRecordType('note')
      setRecordMood(undefined)
    }
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

  const getRecordTypeIcon = (type: CourseRecord['type']) => {
    const recordType = RECORD_TYPES.find(rt => rt.value === type)
    return recordType?.icon || FileText
  }

  return (
    <>
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            {t('courseManager.courseRecord.title', 'Course Record')}
          </CardTitle>
          <CardDescription>
            {t('courseManager.courseRecord.description', 'Track daily activities, notes, and attendance')}
          </CardDescription>

          {/* Month navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" size="sm" onClick={goToPreviousMonth} className="h-8 w-8 p-0 hover:bg-white/20">
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <div className="text-sm font-medium">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </div>

            <Button variant="ghost" size="sm" onClick={goToNextMonth} className="h-8 w-8 p-0 hover:bg-white/20">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1">
            {getShortDayNames().map((dayName, idx) => (
              <div key={idx} className="text-center text-xs font-medium text-zinc-600 dark:text-zinc-400 py-1">
                {dayName.slice(0, 2)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {matrix.slice(0, 35).map((date, i) => {
              const inMonth = date.getMonth() === currentDate.getMonth()
              const isToday = date.toDateString() === today.toDateString()
              const { tasks, exams, records } = getDateInfo(date)
              const hasContent = tasks.length > 0 || exams.length > 0 || records.length > 0
              const isHovered = hoveredDate?.toDateString() === date.toDateString()
              const row = Math.floor(i / 7)
              const showTooltipBelow = row < 2 // First 2 rows show tooltip below

              return (
                <div key={i} className="relative">
                  <div
                    role="gridcell"
                    tabIndex={0}
                    onClick={() => handleDateClick(date)}
                    onKeyDown={e => e.key === 'Enter' && handleDateClick(date)}
                    onMouseEnter={() => (hasContent ? setHoveredDate(date) : setHoveredDate(null))}
                    onMouseLeave={() => setHoveredDate(null)}
                    className={`
                      relative flex flex-col items-center justify-start p-1 text-xs rounded-lg w-full
                      transition-all cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-700 hover:scale-105
                      min-h-[3.5rem]
                      ${
                        isToday
                          ? 'bg-zinc-200 dark:bg-zinc-700 ring-2 ring-zinc-400 dark:ring-zinc-500'
                          : inMonth
                            ? 'bg-white dark:bg-zinc-800'
                            : 'bg-zinc-50 dark:bg-zinc-900 opacity-40'
                      }
                    `}
                  >
                    <span
                      className={`
                      text-xs font-medium mb-1
                      ${
                        isToday
                          ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                          : inMonth
                            ? 'text-zinc-800 dark:text-zinc-200'
                            : 'text-zinc-400 dark:text-zinc-600'
                      }
                    `}
                    >
                      {date.getDate()}
                    </span>

                    {/* Indicators */}
                    {hasContent && (
                      <div className="flex flex-wrap justify-center gap-0.5">
                        {exams.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        {tasks.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                        {records.length > 0 && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      </div>
                    )}
                  </div>

                  {/* Hover Preview Tooltip */}
                  {isHovered && hasContent && (
                    <div
                      className={`absolute z-50 left-1/2 -translate-x-1/2 w-48 p-2 rounded-lg shadow-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs pointer-events-none ${
                        showTooltipBelow ? 'top-full mt-2' : 'bottom-full mb-2'
                      }`}
                      style={{ minWidth: '180px' }}
                    >
                      {/* Arrow */}
                      <div
                        className={`absolute left-1/2 -translate-x-1/2 ${
                          showTooltipBelow ? 'bottom-full mb-px' : 'top-full -mt-px'
                        }`}
                      >
                        <div
                          className={`w-2 h-2 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 transform rotate-45 ${
                            showTooltipBelow ? 'border-t border-l' : 'border-r border-b'
                          }`}
                        />
                      </div>

                      <div className="space-y-1.5">
                        {/* Exams */}
                        {exams.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-medium mb-0.5">
                              <GraduationCap className="w-3 h-3" />
                              <span>Exams</span>
                            </div>
                            {exams.slice(0, 2).map(exam => (
                              <div key={exam.id} className="text-zinc-600 dark:text-zinc-300 truncate pl-4">
                                • {exam.title}
                              </div>
                            ))}
                            {exams.length > 2 && <div className="text-zinc-400 pl-4">+{exams.length - 2} more</div>}
                          </div>
                        )}

                        {/* Tasks */}
                        {tasks.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium mb-0.5">
                              <NotebookPen className="w-3 h-3" />
                              <span>Tasks Due</span>
                            </div>
                            {tasks.slice(0, 2).map(task => (
                              <div
                                key={task.id}
                                className="text-zinc-600 dark:text-zinc-300 truncate pl-4 flex items-center gap-1"
                              >
                                • {task.title}
                                {task.isCompleted && <span className="text-green-500">✓</span>}
                              </div>
                            ))}
                            {tasks.length > 2 && <div className="text-zinc-400 pl-4">+{tasks.length - 2} more</div>}
                          </div>
                        )}

                        {/* Records */}
                        {records.length > 0 && (
                          <div>
                            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium mb-0.5">
                              <FileText className="w-3 h-3" />
                              <span>Records</span>
                            </div>
                            {records.slice(0, 2).map(record => {
                              const TypeIcon = RECORD_TYPES.find(rt => rt.value === record.type)?.icon || FileText
                              return (
                                <div
                                  key={record.id}
                                  className="text-zinc-600 dark:text-zinc-300 truncate pl-4 flex items-center gap-1"
                                >
                                  <TypeIcon className="w-2.5 h-2.5 shrink-0" />
                                  <span className="truncate">
                                    {record.content.slice(0, 30)}
                                    {record.content.length > 30 ? '...' : ''}
                                  </span>
                                </div>
                              )
                            })}
                            {records.length > 2 && <div className="text-zinc-400 pl-4">+{records.length - 2} more</div>}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 pt-2 text-xs text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Exams</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              <span>Tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span>Records</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl bg-white dark:bg-zinc-950 border-none shadow-xl backdrop-blur">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {selectedDate && formatDateDDMMYYYY(getDateString(selectedDate))}
            </DialogTitle>
            <DialogDescription>{getCourseTitle(courseId)} - View and add records for this day</DialogDescription>
          </DialogHeader>

          {selectedDate && (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Exams for this day */}
              {(() => {
                const { exams } = getDateInfo(selectedDate)
                if (exams.length === 0) return null
                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Exams
                    </h4>
                    {exams.map(exam => (
                      <div
                        key={exam.id}
                        className="p-2 rounded-lg bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
                      >
                        <div className="font-medium text-sm">{exam.title}</div>
                        <div className="text-xs text-zinc-500">{exam.weight}% weight</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Tasks for this day */}
              {(() => {
                const { tasks } = getDateInfo(selectedDate)
                if (tasks.length === 0) return null
                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2">
                      <NotebookPen className="w-4 h-4" />
                      Tasks Due
                    </h4>
                    {tasks.map(task => (
                      <div
                        key={task.id}
                        className={`p-2 rounded-lg border-l-4 ${
                          task.isCompleted
                            ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                            : 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                        }`}
                      >
                        <div className={`font-medium text-sm ${task.isCompleted ? 'line-through opacity-60' : ''}`}>
                          {task.title}
                        </div>
                        <div className="text-xs text-zinc-500">{task.priority} priority</div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* Existing Records */}
              {(() => {
                const { records } = getDateInfo(selectedDate)
                if (records.length === 0) return null
                return (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Records
                    </h4>
                    {records.map(record => {
                      const TypeIcon = getRecordTypeIcon(record.type)
                      const isEditing = editingRecord?.id === record.id
                      return (
                        <div
                          key={record.id}
                          className={`p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 
                            ${isEditing ? 'ring-2 ring-blue-400' : 'cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30'}
                          `}
                          onClick={() => !isEditing && handleEditRecord(record)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <TypeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              <span className="text-xs font-medium capitalize text-blue-600 dark:text-blue-400">
                                {record.type}
                              </span>
                              {record.mood && (
                                <span className="text-xs">
                                  {MOOD_OPTIONS.find(m => m.value === record.mood)?.emoji}
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                              onClick={e => {
                                e.stopPropagation()
                                handleDeleteRecord(record.id)
                              }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{record.content}</p>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}

              {/* Add/Edit Record Form */}
              <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  {editingRecord ? 'Edit Record' : 'Add New Record'}
                </h4>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Type</Label>
                    <Select value={recordType} onValueChange={v => setRecordType(v as CourseRecord['type'])}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECORD_TYPES.map(rt => (
                          <SelectItem key={rt.value} value={rt.value}>
                            <div className="flex items-center gap-2">
                              <rt.icon className="w-3 h-3" />
                              {rt.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Mood (optional)</Label>
                    <Select
                      value={recordMood?.toString() || 'none'}
                      onValueChange={v => setRecordMood(v === 'none' ? undefined : parseInt(v))}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select mood" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No mood</SelectItem>
                        {MOOD_OPTIONS.map(m => (
                          <SelectItem key={m.value} value={m.value.toString()}>
                            <div className="flex items-center gap-2">
                              {m.emoji} {m.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea
                    value={recordContent}
                    onChange={e => setRecordContent(e.target.value)}
                    placeholder="What happened in class today? Any notes or observations..."
                    className="min-h-[80px] text-sm resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  {editingRecord && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingRecord(null)
                        setRecordContent('')
                        setRecordType('note')
                        setRecordMood(undefined)
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                  )}
                  <Button
                    size="sm"
                    onClick={handleSaveRecord}
                    disabled={!recordContent.trim()}
                    className="flex-1"
                    style={{
                      backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                      color: 'white',
                    }}
                  >
                    {editingRecord ? 'Update' : 'Add'} Record
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export a simpler version for quick recording from Dashboard
export interface QuickRecordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseName: string
  date?: Date
}

export function QuickRecordDialog({
  open,
  onOpenChange,
  courseId,
  courseName,
  date = new Date(),
}: QuickRecordDialogProps) {
  const { addRecord } = useCourseRecords()
  const { formatDateDDMMYYYY } = useLocalization()

  const [recordType, setRecordType] = useState<CourseRecord['type']>('note')
  const [recordContent, setRecordContent] = useState('')
  const [recordMood, setRecordMood] = useState<number | undefined>(undefined)

  const handleSave = () => {
    if (!recordContent.trim()) return

    addRecord({
      courseId,
      date: getDateString(date),
      content: recordContent.trim(),
      type: recordType,
      mood: recordMood,
    })

    setRecordContent('')
    setRecordType('note')
    setRecordMood(undefined)
    onOpenChange(false)
  }

  const handleClose = () => {
    setRecordContent('')
    setRecordType('note')
    setRecordMood(undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md rounded-xl bg-white dark:bg-zinc-950 border-none shadow-xl backdrop-blur">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <NotebookPen className="w-5 h-5" />
            Quick Record
          </DialogTitle>
          <DialogDescription>
            Add a record for {courseName} on {formatDateDDMMYYYY(getDateString(date))}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Type</Label>
              <Select value={recordType} onValueChange={v => setRecordType(v as CourseRecord['type'])}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECORD_TYPES.map(rt => (
                    <SelectItem key={rt.value} value={rt.value}>
                      <div className="flex items-center gap-2">
                        <rt.icon className="w-4 h-4" />
                        {rt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">How was it?</Label>
              <Select
                value={recordMood?.toString() || 'none'}
                onValueChange={v => setRecordMood(v === 'none' ? undefined : parseInt(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Mood" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Skip</SelectItem>
                  {MOOD_OPTIONS.map(m => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.emoji} {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">What happened?</Label>
            <Textarea
              value={recordContent}
              onChange={e => setRecordContent(e.target.value)}
              placeholder="Topics covered, notes, thoughts..."
              className="min-h-[100px] resize-none"
              autoFocus
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!recordContent.trim()}
              className="flex-1"
              style={{
                backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                color: 'white',
              }}
            >
              Save Record
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
