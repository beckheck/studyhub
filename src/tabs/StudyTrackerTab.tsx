import LevelsSlider from '@/components/LevelsSlider'
import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLocalization } from '@/hooks/useLocalization'
import { useCourses, useFocusTimer, useStudySessions } from '@/hooks/useStore'
import useStudyTimer from '@/hooks/useStudyTimer'
import {
  getPhaseDurationSeconds,
  getPhaseEmoji,
  getTechniqueConfig,
  STUDY_TECHNIQUES,
  TechniqueConfig,
} from '@/lib/technique-utils'
import { StudySession } from '@/types'
import { Edit, Flame, HeartHandshake, ListTodo, Plus, Settings, Timer, TimerReset, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

export default function StudyTrackerTab() {
  // Translation hooks
  const { t } = useTranslation('tracker')
  const { t: tCommon } = useTranslation('common')
  const { formatDate, formatTime, formatDurationSeconds, formatDurationMinutes } = useLocalization()

  // Settings dialog context
  const { openDialog } = useSettingsDialogContext()

  // Mood levels configuration
  const moodLabels = ['💀', '😕', '😐', '🙂', '🔥']

  // Helper function to get mood emoji
  const getMoodEmoji = (moodValue: number): string => {
    return moodLabels[moodValue - 1] || '😐'
  }

  const { courses, selectedCourseId, getCourseTitle, setSelectedCourse } = useCourses()
  const {
    sessions,
    sessionTasks,
    addSession,
    deleteSession,
    updateSession,
    addSessionTask,
    toggleSessionTask,
    deleteSessionTask,
    clearCompletedSessionTasks,
  } = useStudySessions()

  // Study timer with session completion callback
  const studyTimer = useStudyTimer(session => {
    addSession(session)
  }, selectedCourseId)
  const { timerState } = studyTimer

  const { focusTimer, setShowCountdown } = useFocusTimer()

  // Update timer's course ID when selected course changes during running session
  useEffect(() => {
    if (timerState.running && timerState.courseId !== selectedCourseId) {
      studyTimer.setCourseId(selectedCourseId)
    }
  }, [selectedCourseId, timerState.running, timerState.courseId, studyTimer])

  // Get phase duration for progress indication
  const phaseDurationSeconds = getPhaseDurationSeconds(timerState.technique, timerState.phase)
  const statusEmoji = !timerState.running ? '' : getPhaseEmoji(timerState.technique, timerState.phase)

  // Calculate progress with a buffer to ensure it reaches 100%
  const phaseProgress =
    phaseDurationSeconds === Infinity ? 0 : (timerState.phaseElapsed / (phaseDurationSeconds - 1)) * 100

  // Get technique configuration for goal time display
  const techniqueConfig = getTechniqueConfig(timerState.technique)
  const phaseGoalMinutes =
    timerState.phase === 'focus'
      ? techniqueConfig.studyMinutes
      : timerState.phase === 'break'
        ? techniqueConfig.breakMinutes
        : techniqueConfig.longBreakMinutes

  // Session-only tasks
  const [sessionTaskTitle, setSessionTaskTitle] = useState<string>('')

  // Edit session dialog state
  const [editSessionDialog, setEditSessionDialog] = useState<boolean>(false)
  const [editingSession, setEditingSession] = useState<StudySession | null>(null)
  const [editForm, setEditForm] = useState({
    courseId: '',
    technique: '',
    note: '',
    moodStart: 3,
    moodEnd: 3,
    durationMin: 0,
  })

  // Calculate display time (use phase time for techniques with breaks, total time for flow)
  const displayElapsed = techniqueConfig.breakMinutes === 0 ? timerState.elapsed : timerState.phaseElapsed

  // Calculate countdown time (time remaining in current phase)
  const phaseRemainingSeconds =
    phaseDurationSeconds === Infinity ? 0 : Math.max(0, phaseDurationSeconds - timerState.phaseElapsed)

  // Determine what time to show based on mode and conditions
  const timeToShow =
    focusTimer.showCountdown && phaseDurationSeconds !== Infinity && timerState.running
      ? phaseRemainingSeconds
      : displayElapsed

  const elapsedMin = Math.floor(timeToShow / 60)
    .toString()
    .padStart(2, '0')
  const elapsedSec = (timeToShow % 60).toString().padStart(2, '0')
  const elapsedMinSec =
    focusTimer.showCountdown && phaseDurationSeconds !== Infinity && timerState.running
      ? `-${elapsedMin}:${elapsedSec}`
      : `${elapsedMin}:${elapsedSec}`

  // Calculate total session time for display
  const totalMinSec = formatDurationSeconds(timerState.elapsed)

  /**
   * Add a new session task
   */
  const addSessionTaskAndClearInput = useCallback((): void => {
    const title = sessionTaskTitle.trim()
    if (!title) return
    addSessionTask(title)
    setSessionTaskTitle('')
  }, [sessionTaskTitle, addSessionTask])

  /**
   * Get localized technique name
   */
  const getTechniqueDisplayName = useCallback(
    (techniqueConfig: TechniqueConfig): string => {
      const focusEmoji = getPhaseEmoji(techniqueConfig.id, 'focus')
      const breakEmoji = getPhaseEmoji(techniqueConfig.id, 'break')
      const longBreakEmoji = getPhaseEmoji(techniqueConfig.id, 'longBreak')
      return t(techniqueConfig.name, {
        studyMinutes: `${focusEmoji}${techniqueConfig.studyMinutes === Infinity ? '∞' : techniqueConfig.studyMinutes}`,
        breakMinutes: `${breakEmoji}${techniqueConfig.breakMinutes}`,
        longBreakMinutes: `${longBreakEmoji}${techniqueConfig.longBreakMinutes}`,
        longBreakInterval: techniqueConfig.longBreakInterval,
      })
    },
    [t],
  )

  /**
   * Open edit session dialog
   */
  const openEditSession = useCallback((session: StudySession): void => {
    setEditingSession(session)
    setEditForm({
      courseId: session.courseId,
      technique: session.technique,
      note: session.note || '',
      moodStart: session.moodStart || 3,
      moodEnd: session.moodEnd || 3,
      durationMin: session.durationMin,
    })
    setEditSessionDialog(true)
  }, [])

  /**
   * Save edited session
   */
  const saveEditedSession = useCallback((): void => {
    if (!editingSession) return

    updateSession(editingSession.id, {
      courseId: editForm.courseId,
      technique: editForm.technique,
      note: editForm.note.trim() || undefined,
      moodStart: editForm.moodStart,
      moodEnd: editForm.moodEnd,
      durationMin: editForm.durationMin,
    })

    setEditSessionDialog(false)
    setEditingSession(null)
  }, [editingSession, editForm, updateSession])

  /**
   * Cancel editing session
   */
  const cancelEditSession = useCallback((): void => {
    setEditSessionDialog(false)
    setEditingSession(null)
  }, [])

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Focus Timer */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5" />
                {t('focusTimer.title')}
              </CardTitle>
              <CardDescription>{t('focusTimer.description')}</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => openDialog('focusTimer')} className="rounded-xl h-8 w-8">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timer Display with Circular Progress */}
          <div className="text-center p-7 bg-white/70 dark:bg-white/5 rounded-3xl relative">
            {/* Circular Progress Ring */}
            {timerState.running && phaseDurationSeconds !== Infinity && (
              <div className="absolute inset-1 flex items-center justify-center pointer-events-none">
                <svg
                  className="w-full h-full transform -rotate-90 pointer-events-none"
                  viewBox="0 0 200 200"
                  style={{ maxWidth: '500px', maxHeight: '500px' }}
                >
                  {/* Background circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="6"
                    className="text-gray-200 dark:text-gray-700 opacity-30"
                  />
                  {/* Progress circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="90"
                    fill="none"
                    strokeWidth="6"
                    strokeLinecap="round"
                    stroke="currentColor"
                    className={`${phaseProgress > 0 ? 'transition-all duration-1000' : 'transition-none'} ${
                      timerState.phase === 'focus'
                        ? 'text-orange-500'
                        : timerState.phase === 'break'
                          ? 'text-green-500'
                          : 'text-blue-500'
                    }`}
                    strokeDasharray={`${2 * Math.PI * 90}`}
                    strokeDashoffset={`${2 * Math.PI * 90 * (1 - phaseProgress / 100)}`}
                    style={{
                      filter: 'drop-shadow(0 0 8px currentColor)',
                    }}
                  />
                </svg>
              </div>
            )}

            <div className="relative z-10 py-12">
              {/* Completed Study Phases Display */}
              {
                <div className="mb-2">
                  {(() => {
                    const maxEmojisToShow = 4
                    const completedPhases = timerState.studyPhasesCompleted
                    const studyEmojis = Array(Math.min(completedPhases || 0, maxEmojisToShow))
                      .fill(getPhaseEmoji(timerState.technique, 'focus'))
                      .join(' ')

                    if (completedPhases == 0) {
                      return <div className="text-center text-lg">&nbsp;</div>
                    } else if (completedPhases <= maxEmojisToShow) {
                      return <div className="text-center text-lg">{studyEmojis}</div>
                    } else {
                      return (
                        <div className="text-center text-lg">
                          {studyEmojis} +{completedPhases - maxEmojisToShow}
                        </div>
                      )
                    }
                  })()}
                </div>
              }

              <div
                className="text-5xl font-extrabold tracking-wider tabular-nums cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors select-none"
                onClick={() => setShowCountdown(!focusTimer.showCountdown)}
                title={
                  focusTimer.showCountdown
                    ? t('focusTimer.timer.tooltipElapsed')
                    : t('focusTimer.timer.tooltipCountdown')
                }
              >
                {elapsedMinSec}
              </div>
              <div className="text-xs text-zinc-500 mt-1">
                {statusEmoji}{' '}
                {!timerState.running ? (
                  t('focusTimer.status.ready')
                ) : timerState.phase === 'focus' ? (
                  <>
                    {t('focusTimer.status.focus')}
                    {phaseGoalMinutes !== Infinity && (
                      <span className="ml-2 opacity-70">
                        {t('focusTimer.timer.phaseGoal', { minutes: phaseGoalMinutes })}
                      </span>
                    )}
                  </>
                ) : timerState.phase === 'break' ? (
                  <>
                    {t('focusTimer.status.break')}
                    {phaseGoalMinutes !== Infinity && (
                      <span className="ml-2 opacity-70">
                        {t('focusTimer.timer.phaseGoal', { minutes: phaseGoalMinutes })}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    {t('focusTimer.status.longBreak')}
                    {phaseGoalMinutes !== Infinity && (
                      <span className="ml-2 opacity-70">
                        {t('focusTimer.timer.phaseGoal', { minutes: phaseGoalMinutes })}
                      </span>
                    )}
                  </>
                )}
              </div>

              {/* Show total time for multi-phase techniques */}
              {timerState.running && techniqueConfig.breakMinutes > 0 && (
                <div className="text-xs text-zinc-400 mt-1">
                  {t('focusTimer.timer.totalSession')}: {totalMinSec}
                </div>
              )}
            </div>
          </div>

          {/* Control Buttons - Outside the circle */}
          <div className="flex items-center justify-center gap-2">
            {!timerState.running ? (
              <Button onClick={studyTimer.startTimer} className="rounded-xl">
                <Flame className="w-4 h-4 mr-2" />
                {t('focusTimer.buttons.start')}
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => studyTimer.stopTimer(selectedCourseId)}
                  variant="secondary"
                  className="rounded-xl"
                >
                  <HeartHandshake className="w-4 h-4 mr-2" />
                  {t('focusTimer.buttons.stop')}
                </Button>
                <Button onClick={studyTimer.resetTimer} variant="ghost" className="rounded-xl">
                  <TimerReset className="w-4 h-4 mr-2" />
                  {t('focusTimer.buttons.reset')}
                </Button>
              </>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>{t('focusTimer.course')}</Label>
              <Select value={selectedCourseId} onValueChange={v => setSelectedCourse(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('focusTimer.technique')}</Label>
              <Select value={timerState.technique} onValueChange={studyTimer.setTechnique}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDY_TECHNIQUES.map(technique => (
                    <SelectItem key={technique.id} value={technique.id}>
                      {getTechniqueDisplayName(technique)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <LevelsSlider
              label={t('focusTimer.moodStart')}
              labels={moodLabels}
              value={timerState.moodStart}
              onChange={studyTimer.setMoodStart}
            />
            <LevelsSlider
              label={t('focusTimer.moodEnd')}
              labels={moodLabels}
              value={timerState.moodEnd}
              onChange={studyTimer.setMoodEnd}
            />
          </div>

          <div>
            <Label>{t('focusTimer.sessionNotes')}</Label>
            <Textarea
              value={timerState.note}
              onChange={e => studyTimer.setNote(e.target.value)}
              className="rounded-xl"
              placeholder={t('focusTimer.notesPlaceholder')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Session Tasks */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {t('sessionTasks.title')}
          </CardTitle>
          <CardDescription>{t('sessionTasks.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={sessionTaskTitle}
              onChange={e => setSessionTaskTitle(e.target.value)}
              className="rounded-xl"
              placeholder={t('sessionTasks.placeholder')}
            />
            <Button onClick={addSessionTaskAndClearInput} className="rounded-xl">
              <Plus className="w-4 h-4 mr-1" />
              {tCommon('actions.add')}
            </Button>
          </div>
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-zinc-500">{t('sessionTasks.open')}</div>
            {sessionTasks.filter(t => !t.done).length === 0 && (
              <div className="text-sm text-zinc-500">{t('sessionTasks.noTasks')}</div>
            )}
            {sessionTasks
              .filter(task => !task.done)
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
                >
                  <div className="font-medium">{task.title}</div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="rounded-xl"
                      onClick={() => toggleSessionTask(task.id)}
                    >
                      {tCommon('actions.done')}
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => deleteSessionTask(task.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

            {sessionTasks.filter(task => task.done).length > 0 && (
              <div className="text-xs uppercase tracking-wide text-zinc-500 mt-3">{tCommon('status.completed')}</div>
            )}
            {sessionTasks
              .filter(task => task.done)
              .map(task => (
                <div
                  key={task.id}
                  className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl opacity-70"
                >
                  <div className="line-through">{task.title}</div>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteSessionTask(task.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
          </div>
          {sessionTasks.some(task => task.done) && (
            <Button variant="outline" size="sm" onClick={clearCompletedSessionTasks} className="rounded-xl mt-2">
              {t('sessionTasks.clearCompleted')}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Session Log */}
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="w-5 h-5" />
            {t('sessionLog.title')}
          </CardTitle>
          <CardDescription>{t('sessionLog.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 && <div className="text-sm text-zinc-500">{t('sessionLog.noSessions')}</div>}
          <div className="space-y-2 max-h-[420px] overflow-auto pr-1">
            {sessions.map(session => (
              <div
                key={session.id}
                className="flex items-start justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {t('sessionLog.sessionInfo', {
                      course: getCourseTitle(session.courseId),
                      duration: formatDurationMinutes(session.durationMin),
                    })}
                  </div>
                  <div className="text-xs text-zinc-500">
                    {(() => {
                      const startDate = new Date(session.startTs)
                      const endDate = new Date(session.endTs)
                      const startDateStr = formatDate(startDate)
                      const endDateStr = formatDate(endDate)
                      const startTimeStr = formatTime(startDate, { hour: '2-digit', minute: '2-digit' })
                      const endTimeStr = formatTime(endDate, { hour: '2-digit', minute: '2-digit' })

                      // Get mood emojis
                      const startMoodEmoji = getMoodEmoji(session.moodStart || 3)
                      const endMoodEmoji = getMoodEmoji(session.moodEnd || 3)

                      // If same day, show: "date 😐time1 → 🙂time2"
                      // If different days, show: "😐date1 time1 → 🙂date2 time2"
                      return startDateStr === endDateStr
                        ? `${startDateStr} ${startMoodEmoji} ${startTimeStr} → ${endMoodEmoji} ${endTimeStr}`
                        : `${startMoodEmoji} ${startDateStr} ${startTimeStr} → ${endMoodEmoji} ${endDateStr} ${endTimeStr}`
                    })()}
                  </div>
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                    {getTechniqueDisplayName(getTechniqueConfig(session.technique))}
                  </div>
                  {session.note && <div className="text-sm mt-1 whitespace-pre-wrap">{session.note}</div>}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-xl"
                    onClick={() => openEditSession(session)}
                    title={t('sessionLog.editSession.buttons.edit')}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteSession(session.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Session Dialog */}
      <Dialog open={editSessionDialog} onOpenChange={setEditSessionDialog}>
        <DialogContent className="max-w-2xl bg-white dark:bg-black border-zinc-200 dark:border-zinc-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
              <Edit className="w-5 h-5" />
              {t('sessionLog.editSession.title')}
            </DialogTitle>
            <DialogDescription className="text-zinc-600 dark:text-zinc-400">
              {t('sessionLog.editSession.description')}
            </DialogDescription>
          </DialogHeader>

          {editingSession && (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-course">{t('focusTimer.course')}</Label>
                  <Select
                    value={editForm.courseId}
                    onValueChange={value => setEditForm(prev => ({ ...prev, courseId: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="edit-technique">{t('focusTimer.technique')}</Label>
                  <Select
                    value={editForm.technique}
                    onValueChange={value => setEditForm(prev => ({ ...prev, technique: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STUDY_TECHNIQUES.map(technique => (
                        <SelectItem key={technique.id} value={technique.id}>
                          {getTechniqueDisplayName(technique)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="edit-duration">{t('sessionLog.editSession.durationLabel')}</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  min="1"
                  max="480"
                  value={editForm.durationMin}
                  onChange={e => setEditForm(prev => ({ ...prev, durationMin: parseInt(e.target.value) || 0 }))}
                  className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <LevelsSlider
                  label={t('focusTimer.moodStart')}
                  labels={moodLabels}
                  value={editForm.moodStart}
                  onChange={value => setEditForm(prev => ({ ...prev, moodStart: value }))}
                />
                <LevelsSlider
                  label={t('focusTimer.moodEnd')}
                  labels={moodLabels}
                  value={editForm.moodEnd}
                  onChange={value => setEditForm(prev => ({ ...prev, moodEnd: value }))}
                />
              </div>

              <div>
                <Label htmlFor="edit-note">{t('focusTimer.sessionNotes')}</Label>
                <Textarea
                  id="edit-note"
                  value={editForm.note}
                  onChange={e => setEditForm(prev => ({ ...prev, note: e.target.value }))}
                  className="rounded-xl bg-white dark:bg-zinc-900 border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                  placeholder={t('focusTimer.notesPlaceholder')}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                <Button
                  variant="outline"
                  onClick={cancelEditSession}
                  className="rounded-xl border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  {tCommon('actions.cancel')}
                </Button>
                <Button
                  onClick={saveEditedSession}
                  className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-600"
                >
                  {tCommon('actions.save')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
