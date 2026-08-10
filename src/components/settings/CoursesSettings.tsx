import { Button } from '@/components/ui/button'
import { DeferredInput } from '@/components/ui/deferred-input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useCourses } from '@/hooks/useStore'
import type { Course } from '@/types'
import { Reorder } from 'framer-motion'
import { GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function CoursesSettings() {
  const { t } = useTranslation('settings')
  const { t: tCommon } = useTranslation('common')
  const { courses, renameCourse, addCourse, removeCourse, setCourses, updateCourseEmoji } = useCourses()
  const [newCourseTitle, setNewCourseTitle] = useState('')
  const [courseToDelete, setCourseToDelete] = useState<{ id: string; title: string } | null>(null)

  const getFirstGrapheme = (value: string): string => {
    const trimmed = value.trim()
    if (!trimmed) {
      return ''
    }

    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
      const segmenter = new (Intl as any).Segmenter(undefined, { granularity: 'grapheme' })
      const iterator = segmenter.segment(trimmed)[Symbol.iterator]()
      const first = iterator.next()
      return first.done ? '' : first.value.segment
    }

    return Array.from(trimmed)[0] || ''
  }

  const handleAddCourse = () => {
    if (newCourseTitle.trim()) {
      addCourse(newCourseTitle.trim())
      setNewCourseTitle('')
    }
  }

  const handleRemoveCourse = (courseId: string) => {
    const courseToRemove = courses.find(c => c.id === courseId)
    if (!courseToRemove) return

    if (courses.length <= 1) {
      // Could show a toast or notification here
      alert(t('courses.cannotRemoveLastCourse'))
      return
    }

    // Show confirmation dialog
    setCourseToDelete(courseToRemove)
  }

  const confirmRemoveCourse = () => {
    if (courseToDelete) {
      removeCourse(courseToDelete.id)
      setCourseToDelete(null)
    }
  }

  const handleReorder = (newOrder: typeof courses) => {
    setCourses([...newOrder] as Course[])
  }

  return (
    <>
      <div className="space-y-4">
        {/* Add new course input */}
        <div className="flex gap-2">
          <Input
            value={newCourseTitle}
            onChange={e => setNewCourseTitle(e.target.value)}
            placeholder={t('courses.newCoursePlaceholder')}
            className="rounded-xl"
            onKeyDown={e => {
              if (e.key === 'Enter') {
                handleAddCourse()
              }
            }}
          />
          <Button onClick={handleAddCourse} size="sm" className="rounded-xl px-3" disabled={!newCourseTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Reorderable course list */}
        <div className="space-y-2">
          <Reorder.Group values={[...courses]} onReorder={handleReorder} className="space-y-2">
            {courses.map(course => (
              <Reorder.Item
                key={course.id}
                value={course}
                className="flex items-center gap-3 p-3 bg-white/50 dark:bg-white/5 rounded-xl border border-white/20 dark:border-white/10 group hover:bg-white/70 dark:hover:bg-white/10 transition-colors"
                whileDrag={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.8)' }}
                dragMomentum={false}
              >
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors">
                  <GripVertical className="w-4 h-4" />
                </div>

                {/* Course input */}
                <div className="flex-1">
                  <DeferredInput
                    value={course.title}
                    onDeferredChange={value => renameCourse(course.id, value)}
                    className="rounded-lg border-none bg-transparent focus:bg-white/50 dark:focus:bg-white/10"
                  />
                </div>

                <div className="flex flex-col items-end gap-1">
                  <Input
                    value={course.emoji || ''}
                    onChange={e => updateCourseEmoji(course.id, getFirstGrapheme(e.target.value))}
                    placeholder={t('courses.emojiPlaceholder')}
                    aria-label={t('courses.emojiLabel')}
                    className="w-16 h-8 text-center rounded-lg"
                  />
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-none">
                    {t('courses.emojiHint')}
                  </span>
                </div>

                {/* Remove button */}
                <Button
                  onClick={() => handleRemoveCourse(course.id)}
                  size="sm"
                  variant="ghost"
                  className="opacity-0 group-hover:opacity-100 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                  disabled={courses.length <= 1}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {courses.length > 0 && (
          <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center pt-2">{t('courses.dragToReorder')}</div>
        )}
      </div>

      {/* Course Deletion Confirmation Dialog */}
      <Dialog open={!!courseToDelete} onOpenChange={() => setCourseToDelete(null)}>
        <DialogContent className="rounded-xl bg-white dark:bg-zinc-950 border-none shadow-xl backdrop-blur">
          <DialogHeader className="">
            <DialogTitle className="text-red-600 dark:text-red-400">
              {t('courses.deleteConfirmation.title')}
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              <p>{t('courses.deleteConfirmation.description', { courseName: courseToDelete?.title })}</p>
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-900/30">
                <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                  {t('courses.deleteConfirmation.warning')}
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 ml-4 list-disc">
                  <li>{t('courses.deleteConfirmation.consequences.tasks')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.exams')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.grades')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.timetable')}</li>
                  <li>{t('courses.deleteConfirmation.consequences.sessions')}</li>
                </ul>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setCourseToDelete(null)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              onClick={confirmRemoveCourse}
              className="sp-red-button bg-red-600 hover:bg-red-700 text-white border-0 shadow-sm"
            >
              {t('courses.deleteConfirmation.confirmDelete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
