import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useDegreePlan } from '@/hooks/useStore'
import { uid } from '@/lib/utils'
import { DegreeCourse } from '@/types'
import { ArrowLeft, ArrowRight, Check, Edit, GraduationCap, Plus, Trash2, X } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface SemesterForm {
  acronym: string
  name: string
  credits: string
  prerequisites: string
  corequisites: string
  finalGrade: string
}

export default function DegreePlanTab() {
  const { t } = useTranslation('degreePlan')
  const { t: tCommon } = useTranslation('common')

  // State management
  const {
    degreePlan,
    setDegreePlan,
    setDegreePlanName,
    setSemesters,
    addCompletedCourse,
    removeCompletedCourse,
    removeSemester,
  } = useDegreePlan()
  const [degreePlanDialog, setDegreePlanDialog] = useState<boolean>(false)
  const [degreePlanStep, setDegreePlanStep] = useState<'setup' | 'courses' | 'view'>('setup')
  const [currentSemester, setCurrentSemester] = useState<number>(1)
  const [editingCourse, setEditingCourse] = useState<DegreeCourse | null>(null)
  const [resetConfirmDialog, setResetConfirmDialog] = useState<boolean>(false)
  const [clearConfirmDialog, setClearConfirmDialog] = useState<boolean>(false)
  const [deleteSemesterDialog, setDeleteSemesterDialog] = useState<boolean>(false)
  const [semesterToDelete, setSemesterToDelete] = useState<number | null>(null)
  const [draggedCourse, setDraggedCourse] = useState<DegreeCourse | null>(null)
  const [draggedFromSemester, setDraggedFromSemester] = useState<number | null>(null)
  const [totalSemestersInput, setTotalSemestersInput] = useState<number>(0)
  const [degreePlanNameInput, setDegreePlanNameInput] = useState<string>('')
  const [nameHasChanged, setNameHasChanged] = useState<boolean>(false)
  const [semesterForm, setSemesterForm] = useState<SemesterForm>({
    acronym: '',
    name: '',
    credits: '',
    prerequisites: '',
    corequisites: '',
    finalGrade: '',
  })

  // Degree Plan Management Functions
  function setupDegreePlan(totalSemesters: number): void {
    const semesters = Array.from({ length: totalSemesters }, (_, i) => ({
      id: i + 1,
      number: i + 1,
      courses: [],
    }))

    setSemesters(semesters)

    setDegreePlanStep('courses')
    setCurrentSemester(1)
  }

  function addCourseToSemester(semesterNumber: number, courseData: Omit<DegreeCourse, 'id' | 'completed'>): void {
    const newSemesters = degreePlan.semesters.map(sem =>
      sem.number === semesterNumber
        ? {
            ...sem,
            courses: [
              ...sem.courses,
              {
                id: uid(),
                ...courseData,
                completed: false,
              },
            ],
          }
        : sem,
    )
    setSemesters(newSemesters)
  }

  function toggleCourseCompletion(courseAcronym: string): void {
    const isCompleted = degreePlan.completedCourses.includes(courseAcronym)
    if (isCompleted) {
      removeCompletedCourse(courseAcronym)
    } else {
      addCompletedCourse(courseAcronym)
    }
  }

  function checkPrerequisites(course: DegreeCourse, _semester: any): boolean {
    if (!course.prerequisites) return true

    const prereqAcronyms = course.prerequisites.split(',').map(p => p.trim())
    const completedCourses = degreePlan.completedCourses

    // Check if ALL prerequisites are completed
    return prereqAcronyms.every(prereq => completedCourses.includes(prereq))
  }

  function getCourseColor(course: DegreeCourse, semester: any): string {
    const isCompleted = degreePlan.completedCourses.includes(course.acronym)
    const prerequisitesMet = checkPrerequisites(course, semester)

    if (isCompleted) {
      return '#10ac84' // Green for completed
    } else if (prerequisitesMet) {
      return '#3b82f6' // Blue for available
    } else {
      return 'transparent' // No color for unavailable
    }
  }

  function resetDegreePlan(): void {
    setDegreePlan({
      name: 'Degree Plan',
      semesters: [],
      completedCourses: [],
    })
    setDegreePlanStep('setup')
    setCurrentSemester(1)
    setEditingCourse(null)
    setDegreePlanNameInput('')
    setNameHasChanged(false)
    setSemesterForm({
      acronym: '',
      name: '',
      credits: '',
      prerequisites: '',
      corequisites: '',
      finalGrade: '',
    })
    setDegreePlanDialog(false)
  }

  // Drag and Drop Functions for Course Management
  function handleDragStart(course: DegreeCourse, sourceSemester: number): void {
    setDraggedCourse(course)
    setDraggedFromSemester(sourceSemester)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>): void {
    e.preventDefault()
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>, targetSemester: number): void {
    e.preventDefault()

    if (!draggedCourse || !draggedFromSemester) return

    // Don't allow dropping on the same semester
    if (draggedFromSemester === targetSemester) {
      setDraggedCourse(null)
      setDraggedFromSemester(null)
      return
    }

    // Check if target semester has space (max 8 courses)
    const targetSemesterData = degreePlan.semesters.find(s => s.number === targetSemester)
    if (targetSemesterData && targetSemesterData.courses.length >= 8) {
      setDraggedCourse(null)
      setDraggedFromSemester(null)
      return
    }

    // Move course from source to target semester
    const newSemesters = degreePlan.semesters.map(semester => {
      if (semester.number === draggedFromSemester) {
        // Remove course from source semester
        return {
          ...semester,
          courses: semester.courses.filter(c => c.id !== draggedCourse.id),
        }
      } else if (semester.number === targetSemester) {
        // Add course to target semester
        return {
          ...semester,
          courses: [...semester.courses, draggedCourse],
        }
      }
      return semester
    })

    setSemesters(newSemesters)

    // Clear drag state
    setDraggedCourse(null)
    setDraggedFromSemester(null)
  }

  // Credit calculation functions
  const getTotalCredits = (): number => {
    return degreePlan.semesters.reduce((total, semester) => {
      return (
        total +
        semester.courses.reduce((semesterTotal, course) => {
          return semesterTotal + parseInt(course.credits || '0')
        }, 0)
      )
    }, 0)
  }

  const getCompletedCredits = (): number => {
    return degreePlan.semesters.reduce((total, semester) => {
      return (
        total +
        semester.courses.reduce((semesterTotal, course) => {
          const isCompleted = degreePlan.completedCourses.includes(course.acronym)
          return semesterTotal + (isCompleted ? parseInt(course.credits || '0') : 0)
        }, 0)
      )
    }, 0)
  }

  // Add new semester function
  const addNewSemester = (): void => {
    const newSemesterNumber = degreePlan.semesters.length + 1
    const newSemester = {
      id: uid(),
      number: newSemesterNumber,
      courses: [],
    }

    setSemesters([...degreePlan.semesters, newSemester])
  }

  // Handle degree plan name changes
  const handleNameChange = (value: string): void => {
    setDegreePlanNameInput(value)
    setNameHasChanged(value !== degreePlan.name)
  }

  const handleNameSave = (): void => {
    setDegreePlanName(degreePlanNameInput.trim() || 'Degree Plan')
    setNameHasChanged(false)
  }

  const handleNameReset = (): void => {
    setDegreePlanNameInput(degreePlan.name || 'Degree Plan')
    setNameHasChanged(false)
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                <span>{degreePlan.name || t('title')}</span>
                <span className="text-sm font-normal text-gray-500">Overview</span>
              </CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {degreePlan.semesters.length > 0 && (
                <div className="text-right">
                  <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('progress.creditsProgress', { completed: getCompletedCredits(), total: getTotalCredits() })}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {t('progress.percentComplete', {
                      percent:
                        getTotalCredits() > 0 ? Math.round((getCompletedCredits() / getTotalCredits()) * 100) : 0,
                    })}
                  </div>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="rounded-xl"
                onClick={() => {
                  // Initialize the name input when opening the dialog
                  setDegreePlanNameInput(degreePlan.name || 'Degree Plan')
                  setNameHasChanged(false)

                  // If degree plan already exists, go to view step, otherwise start setup
                  if (degreePlan.semesters.length > 0) {
                    setDegreePlanStep('view')
                  } else {
                    setDegreePlanStep('setup')
                  }
                  setDegreePlanDialog(true)
                }}
                title={t('actions.customize')}
              >
                <Edit className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {degreePlan.semesters.length > 0 ? (
            <div className="space-y-6">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p
                  className="text-sm text-blue-700 dark:text-blue-300"
                  dangerouslySetInnerHTML={{ __html: t('tips.dragAndDrop') }}
                />
              </div>
              <div className="grid gap-4 lg:gap-6 grid-cols-2 md:grid-cols-3">
                {degreePlan.semesters.map(semester => (
                  <div key={semester.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-center text-sm px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex-1">
                        {t('semester.title', { number: semester.number })}
                      </h3>
                    </div>
                    <div
                      className={`space-y-2 min-h-[200px] p-3 border-2 border-dashed rounded-lg transition-colors ${
                        draggedCourse && draggedFromSemester !== semester.number
                          ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20 dark:border-blue-600'
                          : 'border-zinc-200 dark:border-zinc-700'
                      }`}
                      onDragOver={handleDragOver}
                      onDrop={e => handleDrop(e, semester.number)}
                    >
                      {semester.courses.map(course => {
                        const isCompleted = degreePlan.completedCourses.includes(course.acronym)
                        const prerequisitesMet = checkPrerequisites(course, semester)
                        const bgColor = getCourseColor(course, semester)

                        return (
                          <div
                            key={course.id}
                            draggable
                            onDragStart={() => handleDragStart(course, semester.number)}
                            className={`p-3 rounded-lg border-2 transition-all hover:shadow-md group ${
                              draggedCourse?.id === course.id ? 'opacity-50 cursor-grabbing' : 'cursor-grab'
                            } ${
                              isCompleted
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600'
                                : prerequisitesMet
                                  ? 'bg-blue-50 border-blue-300 dark:bg-blue-900/20 dark:border-blue-600'
                                  : 'bg-gray-50 border-dashed border-gray-300 dark:bg-gray-800/50 dark:border-gray-500 opacity-60'
                            }`}
                            style={
                              bgColor !== 'transparent'
                                ? {
                                    backgroundColor: bgColor + '15',
                                    borderColor: bgColor + '60',
                                  }
                                : {}
                            }
                            title={`${
                              isCompleted
                                ? t('actions.markAsIncomplete')
                                : prerequisitesMet
                                  ? t('actions.markAsCompleted')
                                  : t('course.prerequisitesNotMet')
                            } • ${t('actions.dragToMove')}`}
                          >
                            <div className="flex items-start justify-between">
                              <div
                                className="flex-1"
                                onClick={() => prerequisitesMet && toggleCourseCompletion(course.acronym)}
                              >
                                <div
                                  className={`text-xs font-mono font-bold ${
                                    isCompleted
                                      ? 'line-through text-green-700 dark:text-green-400'
                                      : prerequisitesMet
                                        ? 'text-blue-700 dark:text-blue-400'
                                        : 'text-gray-500'
                                  }`}
                                >
                                  {course.acronym}
                                </div>
                                <div
                                  className={`text-xs mt-1 ${
                                    isCompleted
                                      ? 'line-through text-green-600 dark:text-green-300'
                                      : prerequisitesMet
                                        ? 'text-blue-600 dark:text-blue-300'
                                        : 'text-gray-400'
                                  }`}
                                >
                                  {course.name}
                                </div>
                                <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
                                  <span>{t('course.creditsShort', { count: parseInt(course.credits || '0') })}</span>
                                  <div className="flex items-center gap-1">
                                    {course.finalGrade && (
                                      <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                                        {course.finalGrade}
                                      </span>
                                    )}
                                    {isCompleted && <Check className="w-3 h-3 text-green-600" />}
                                  </div>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={e => {
                                  e.stopPropagation()
                                  // Set up editing mode for this course
                                  setEditingCourse(course)
                                  setSemesterForm({
                                    acronym: course.acronym,
                                    name: course.name,
                                    credits: course.credits,
                                    prerequisites: course.prerequisites || '',
                                    corequisites: course.corequisites || '',
                                    finalGrade: course.finalGrade || '',
                                  })
                                  setCurrentSemester(semester.number)
                                  setDegreePlanStep('courses')
                                  setDegreePlanDialog(true)
                                }}
                                className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                                title={t('course.editCourse')}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}
                      {semester.courses.length === 0 && !draggedCourse && (
                        <div className="text-center text-zinc-400 py-8 text-sm">{t('semester.noCourses')}</div>
                      )}
                      {draggedCourse && draggedFromSemester !== semester.number && (
                        <div className="text-center text-blue-500 py-4 text-sm border-2 border-dashed border-blue-300 rounded-lg bg-blue-50/20 dark:bg-blue-900/10">
                          {semester.courses.length >= 8
                            ? t('dropZone.semesterFull')
                            : t('dropZone.dropHere', { count: semester.courses.length })}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-center border-t pt-4">
                <div className="text-sm text-zinc-500 mb-3">
                  {t('progress.coursesProgress', {
                    completed: degreePlan.completedCourses.length,
                    total: degreePlan.semesters.flatMap(s => s.courses).length,
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setClearConfirmDialog(true)}
                  className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-800"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t('actions.clearDegreePlan')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-zinc-500">{t('semester.noCourses')}</div>
          )}
        </CardContent>
      </Card>

      {/* Degree Plan Dialog */}
      <Dialog open={degreePlanDialog} onOpenChange={setDegreePlanDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="">
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <GraduationCap className="w-5 h-5" />
              {degreePlanStep === 'setup' && t('setup.title')}
              {degreePlanStep === 'courses' &&
                (editingCourse
                  ? t('editing.title', { number: currentSemester })
                  : t('semester.courses', { number: currentSemester }))}
              {degreePlanStep === 'view' && t('view.title')}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {degreePlanStep === 'setup' && t('setup.description')}
              {degreePlanStep === 'courses' &&
                (editingCourse
                  ? t('editing.description', { acronym: editingCourse.acronym, number: currentSemester })
                  : `${t('semester.courses', { number: currentSemester })}. Maximum 8 courses per semester.`)}
              {degreePlanStep === 'view' && t('view.description')}
            </DialogDescription>

            {/* Degree Plan Name Section - Only show when not editing a course */}
            {degreePlanStep !== 'courses' && (
              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="space-y-2">
                  <Label
                    htmlFor="degree-plan-name-dialog"
                    className="text-sm font-medium text-zinc-900 dark:text-zinc-100"
                  >
                    {t('settings.degreePlanName')}
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="degree-plan-name-dialog"
                      value={degreePlanNameInput}
                      onChange={e => handleNameChange(e.target.value)}
                      placeholder="Enter degree plan name"
                      className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                    />
                    {nameHasChanged && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleNameReset}
                          className="rounded-xl px-3"
                          title={tCommon('actions.cancel')}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleNameSave}
                          className="rounded-xl px-3"
                          title={tCommon('actions.save')}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500">{t('settings.degreePlanNameDescription')}</p>
                </div>
              </div>
            )}

            {/* Final Grade Section - Only show when editing a course */}
            {degreePlanStep === 'courses' && editingCourse && (
              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <div className="space-y-2">
                  <Label htmlFor="final-grade-input" className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    Final Grade for {editingCourse.acronym}
                  </Label>
                  <Input
                    id="final-grade-input"
                    value={semesterForm.finalGrade}
                    onChange={e => setSemesterForm(prev => ({ ...prev, finalGrade: e.target.value }))}
                    placeholder="e.g., A+, 95, 4.0"
                    className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  />
                  <p className="text-xs text-zinc-500">Enter the final grade received for this course</p>
                </div>
              </div>
            )}
          </DialogHeader>

          {degreePlanStep === 'setup' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <Label className="text-zinc-900 dark:text-zinc-100">{t('setup.numberOfSemesters')}</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  placeholder={t('setup.semesterPlaceholder')}
                  value={totalSemestersInput || ''}
                  onChange={e => setTotalSemestersInput(parseInt(e.target.value) || 0)}
                  className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setDegreePlanDialog(false)}
                  className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {tCommon('actions.cancel')}
                </Button>
                <Button
                  onClick={() => setupDegreePlan(totalSemestersInput)}
                  disabled={!totalSemestersInput || totalSemestersInput < 1}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {tCommon('actions.next')} <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {degreePlanStep === 'courses' && (
            <div className="space-y-6">
              <div className="text-sm text-zinc-600 dark:text-zinc-400">
                {t('semester.ofTotal', { current: currentSemester, total: degreePlan.semesters.length })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {editingCourse ? t('course.editCourse') : t('course.addCourse')}
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">{t('course.acronym')}</Label>
                      <Input
                        placeholder={t('placeholders.courseAcronym')}
                        value={semesterForm.acronym}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            acronym: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">{t('course.name')}</Label>
                      <Input
                        placeholder={t('placeholders.courseName')}
                        value={semesterForm.name}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">{t('course.credits')}</Label>
                      <Input
                        type="number"
                        min="1"
                        max="12"
                        placeholder={t('placeholders.credits')}
                        value={semesterForm.credits}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            credits: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">{t('course.prerequisites')}</Label>
                      <Input
                        placeholder={t('placeholders.prerequisites')}
                        value={semesterForm.prerequisites}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            prerequisites: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <Label className="text-zinc-900 dark:text-zinc-100">{t('course.corequisites')}</Label>
                      <Input
                        placeholder={t('placeholders.corequisites')}
                        value={semesterForm.corequisites}
                        onChange={e =>
                          setSemesterForm(prev => ({
                            ...prev,
                            corequisites: e.target.value,
                          }))
                        }
                        className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    {editingCourse && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingCourse(null)
                          setSemesterForm({
                            acronym: '',
                            name: '',
                            credits: '',
                            prerequisites: '',
                            corequisites: '',
                            finalGrade: '',
                          })
                        }}
                        className="rounded-xl w-full border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 mb-2"
                      >
                        {t('actions.cancelEditing')}
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        if (semesterForm.acronym && semesterForm.name && semesterForm.credits) {
                          const currentSemesterData = degreePlan.semesters.find(s => s.number === currentSemester)

                          if (editingCourse) {
                            // Update existing course
                            const updatedSemesters = degreePlan.semesters.map(sem =>
                              sem.number === currentSemester
                                ? {
                                    ...sem,
                                    courses: sem.courses.map(c =>
                                      c.id === editingCourse.id ? { ...c, ...semesterForm } : c,
                                    ),
                                  }
                                : sem,
                            )
                            setSemesters(updatedSemesters)
                            setEditingCourse(null)
                          } else {
                            // Add new course
                            if (currentSemesterData && currentSemesterData.courses.length < 7) {
                              addCourseToSemester(currentSemester, semesterForm)
                            }
                          }

                          setSemesterForm({
                            acronym: '',
                            name: '',
                            credits: '',
                            prerequisites: '',
                            corequisites: '',
                            finalGrade: '',
                          })
                        }
                      }}
                      disabled={
                        !semesterForm.acronym ||
                        !semesterForm.name ||
                        !semesterForm.credits ||
                        (!editingCourse &&
                          (degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length ?? 0) >= 8)
                      }
                      className="rounded-xl w-full bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {editingCourse ? t('course.updateCourse') : t('course.addCourse')}
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                    {t('semester.coursesWithCount', {
                      number: currentSemester,
                      count: degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length || 0,
                      max: 7,
                    })}
                  </h3>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {degreePlan.semesters
                      .find(s => s.number === currentSemester)
                      ?.courses.map(course => (
                        <div
                          key={course.id}
                          className="p-3 border rounded-lg bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono text-sm font-bold text-zinc-900 dark:text-zinc-100">
                                {course.acronym}
                              </div>
                              <div className="text-sm text-zinc-700 dark:text-zinc-300">{course.name}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {t('course.creditsShort', { count: parseInt(course.credits || '0') })}
                              </div>
                              {course.prerequisites && (
                                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                  {t('course.prereq', { prerequisites: course.prerequisites })}
                                </div>
                              )}
                              {course.corequisites && (
                                <div className="text-xs text-zinc-400 dark:text-zinc-500">
                                  {t('course.coreq', { corequisites: course.corequisites })}
                                </div>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const updatedSemesters = degreePlan.semesters.map(sem =>
                                  sem.number === currentSemester
                                    ? {
                                        ...sem,
                                        courses: sem.courses.filter(c => c.id !== course.id),
                                      }
                                    : sem,
                                )
                                setSemesters(updatedSemesters)
                              }}
                              className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    {!degreePlan.semesters.find(s => s.number === currentSemester)?.courses.length && (
                      <div className="text-center text-zinc-500 dark:text-zinc-400 py-8">
                        {t('semester.noCoursesYet')}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingCourse(null)
                    setSemesterForm({
                      acronym: '',
                      name: '',
                      credits: '',
                      prerequisites: '',
                      corequisites: '',
                      finalGrade: '',
                    })
                    if (currentSemester > 1) {
                      setCurrentSemester(currentSemester - 1)
                    } else {
                      setDegreePlanStep('setup')
                    }
                  }}
                  className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {currentSemester > 1 ? t('semester.previousSemester') : t('semester.backToSetup')}
                </Button>

                {currentSemester < degreePlan.semesters.length ? (
                  <Button
                    onClick={() => {
                      setEditingCourse(null)
                      setSemesterForm({
                        acronym: '',
                        name: '',
                        credits: '',
                        prerequisites: '',
                        corequisites: '',
                        finalGrade: '',
                      })
                      setCurrentSemester(currentSemester + 1)
                    }}
                    className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                  >
                    {t('semester.nextSemester')} <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      setEditingCourse(null)
                      setSemesterForm({
                        acronym: '',
                        name: '',
                        credits: '',
                        prerequisites: '',
                        corequisites: '',
                        finalGrade: '',
                      })
                      setDegreePlanStep('view')
                      setDegreePlanDialog(false)
                    }}
                    className="rounded-xl bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {t('actions.finishSetup')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {degreePlanStep === 'view' && (
            <div className="space-y-6">
              <div className="grid gap-4 lg:gap-6 grid-cols-2 md:grid-cols-3">
                {degreePlan.semesters.map(semester => (
                  <div
                    key={semester.id}
                    className="space-y-3 border rounded-lg p-4 bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {t('semester.title', { number: semester.number })}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingCourse(null)
                            setSemesterForm({
                              acronym: '',
                              name: '',
                              credits: '',
                              prerequisites: '',
                              corequisites: '',
                              finalGrade: '',
                            })
                            setCurrentSemester(semester.number)
                            setDegreePlanStep('courses')
                          }}
                          className="rounded-xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          title={t('actions.editSemester')}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setSemesterToDelete(semester.number)
                            setDeleteSemesterDialog(true)
                          }}
                          className="rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title={t('actions.deleteSemester')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {semester.courses.map(course => {
                        const isCompleted = degreePlan.completedCourses.includes(course.acronym)
                        const prerequisitesMet = checkPrerequisites(course, semester)

                        return (
                          <div
                            key={course.id}
                            className={`p-2 text-xs border rounded cursor-pointer transition-all hover:shadow-sm ${
                              isCompleted
                                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700'
                                : prerequisitesMet
                                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
                                  : 'border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-zinc-800'
                            }`}
                            onClick={() => toggleCourseCompletion(course.acronym)}
                          >
                            <div
                              className={`font-mono font-bold flex items-center justify-between ${
                                isCompleted
                                  ? 'line-through text-green-700 dark:text-green-400'
                                  : prerequisitesMet
                                    ? 'text-blue-700 dark:text-blue-400'
                                    : 'text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {course.acronym}
                              {isCompleted && <Check className="w-3 h-3" />}
                            </div>
                            <div
                              className={`${
                                isCompleted
                                  ? 'line-through text-green-600 dark:text-green-300'
                                  : prerequisitesMet
                                    ? 'text-blue-600 dark:text-blue-300'
                                    : 'text-gray-400 dark:text-gray-500'
                              }`}
                            >
                              {course.name}
                            </div>
                            <div className="text-zinc-500 dark:text-zinc-400 mt-1">
                              {t('course.creditsShort', { count: parseInt(course.credits || '0') })}
                            </div>
                          </div>
                        )
                      })}
                      {semester.courses.length === 0 && (
                        <div className="text-center text-zinc-400 dark:text-zinc-500 py-4">
                          {t('semester.noCourses')}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 border-zinc-200 dark:border-zinc-800">
                <div className="text-center text-sm text-zinc-600 dark:text-zinc-400 mb-4">
                  {t('progress.overallProgress', {
                    completed: degreePlan.completedCourses.length,
                    total: degreePlan.semesters.flatMap(s => s.courses).length,
                    percent: Math.round(
                      (degreePlan.completedCourses.length /
                        Math.max(1, degreePlan.semesters.flatMap(s => s.courses).length)) *
                        100,
                    ),
                  })}
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setResetConfirmDialog(true)}
                    className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {t('actions.resetPlan')}
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={addNewSemester}
                      className="rounded-xl border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {t('actions.addNewSemester')}
                    </Button>
                    <Button
                      onClick={() => setDegreePlanDialog(false)}
                      className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                    >
                      {tCommon('actions.close')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetConfirmDialog} onOpenChange={setResetConfirmDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="">
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('confirmations.reset.title')}</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {t('confirmations.reset.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setResetConfirmDialog(false)}
              className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDegreePlan()
                setResetConfirmDialog(false)
              }}
              className="rounded-xl"
            >
              {t('confirmations.resetEverything')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear Confirmation Dialog */}
      <Dialog open={clearConfirmDialog} onOpenChange={setClearConfirmDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="">
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">{t('confirmations.clear.title')}</DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {t('confirmations.clear.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => setClearConfirmDialog(false)}
              className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                resetDegreePlan()
                setClearConfirmDialog(false)
              }}
              className="rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('confirmations.clearEverything')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Semester Confirmation Dialog */}
      <Dialog open={deleteSemesterDialog} onOpenChange={setDeleteSemesterDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader className="">
            <DialogTitle className="text-zinc-900 dark:text-zinc-100">
              {t('confirmations.deleteSemester.title')}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {semesterToDelete &&
              (degreePlan.semesters.find(s => s.number === semesterToDelete)?.courses.length ?? 0) > 0
                ? t('confirmations.deleteSemester.descriptionWithCourses', { number: semesterToDelete })
                : t('confirmations.deleteSemester.description', { number: semesterToDelete })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteSemesterDialog(false)
                setSemesterToDelete(null)
              }}
              className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (semesterToDelete) {
                  removeSemester(semesterToDelete)
                }
                setDeleteSemesterDialog(false)
                setSemesterToDelete(null)
              }}
              className="rounded-xl"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('actions.deleteSemester')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
