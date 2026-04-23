import CourseRecordCalendar from '@/components/CourseRecordCalendar';
import { useSettingsDialogContext } from '@/components/settings/SettingsDialogProvider';
import SyllabusUpload from '@/components/SyllabusUpload';
import { TasksProgressBar, type ProgressData } from '@/components/TasksProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Confetti from '@/components/ui/confetti';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RichTextDisplay } from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConfetti } from '@/hooks/useConfetti';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useExamGrades, useItems } from '@/hooks/useStore';
import { ItemDialog } from '@/items/base/dialog';
import { ItemExam } from '@/items/exam/modelSchema';
import { getItemTaskPriorityColor } from '@/items/task/methods';
import { ItemTask } from '@/items/task/modelSchema';
import { useItemDialog } from '@/items/useItemDialog';
import { compareDates } from '@/lib/date-utils';
import { motion } from 'framer-motion';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Edit,
  ListTodo,
  Plus,
  Settings,
  Trash2,
  Undo,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_COURSE_EMOJI = '📚';

export default function CourseManagerTab() {
  const { t: tCourse } = useTranslation('courseManager');
  const { t: tCommon } = useTranslation('common');
  const { formatDateDDMMYYYY } = useLocalization();
  const { courses, selectedCourseId, getCourseTitle, setSelectedCourse, clearCourseData, updateCourseSyllabus } = useCourses();
  const { getItemsByType, updateItem, deleteItem } = useItems();

  // Get items by type
  const tasks = getItemsByType('task') as ItemTask[];
  const exams = getItemsByType('exam') as ItemExam[];

  // Access exam grades separately (still managed in the old way)
  const { examGrades, setExamGrades } = useExamGrades();

  const itemDialog = useItemDialog();
  const { openDialog: openSettingsDialog } = useSettingsDialogContext();
  const [clearConfirmOpen, setClearConfirmOpen] = useState<boolean>(false);
  const [taskSortOrder, setTaskSortOrder] = useState<'date' | 'priority'>('date');
  const [showCompletedTasks, setShowCompletedTasks] = useState<boolean>(false);
  const [examNotesProgress, setExamNotesProgress] = useState<Record<string, ProgressData>>({});
  const [expandedExamNotes, setExpandedExamNotes] = useState<Record<string, boolean>>({});
  const courseTasks = tasks.filter(t => t.courseId === selectedCourseId);
  const courseExams = exams.filter(e => e.courseId === selectedCourseId);
  const upcomingExams = courseExams.filter(e => !e.isCompleted);
  const completedExams = courseExams.filter(e => e.isCompleted);
  const selectedCourse = courses.find(course => course.id === selectedCourseId);

  const courseStats = useMemo(() => {
    return courses.reduce<Record<string, { openTasks: number; upcomingExams: number }>>((acc, course) => {
      acc[course.id] = {
        openTasks: tasks.filter(task => task.courseId === course.id && !task.isCompleted).length,
        upcomingExams: exams.filter(exam => exam.courseId === course.id && !exam.isCompleted).length,
      };
      return acc;
    }, {});
  }, [courses, exams, tasks]);

  // Toggle expanded state for exam notes
  const toggleExamNotesExpanded = (examId: string) => {
    setExpandedExamNotes(prev => ({
      ...prev,
      [examId]: !prev[examId],
    }));
  };

  // Toggle all exam notes
  const toggleAllExamNotes = () => {
    const examsWithNotes = [...upcomingExams, ...completedExams].filter(e => e.notes);
    const allExpanded = examsWithNotes.every(e => expandedExamNotes[e.id]);

    const newState: Record<string, boolean> = {};
    examsWithNotes.forEach(e => {
      newState[e.id] = !allExpanded;
    });

    setExpandedExamNotes(prev => ({
      ...prev,
      ...newState,
    }));
  };

  // Check if all notes are expanded
  const areAllNotesExpanded = () => {
    const examsWithNotes = [...upcomingExams, ...completedExams].filter(e => e.notes);
    return examsWithNotes.length > 0 && examsWithNotes.every(e => expandedExamNotes[e.id]);
  };

  // Sort tasks based on selected order
  const sortTasks = (taskList: typeof courseTasks) => {
    return [...taskList].sort((a, b) => {
      if (taskSortOrder === 'date') {
        // Sort by due date (earliest first), then by priority, then alphabetically
        if (!a.dueAt && !b.dueAt) {
          // Both have no due date, sort by priority then alphabetically
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          const priorityComparison =
            priorityOrder[a.priority as keyof typeof priorityOrder] -
            priorityOrder[b.priority as keyof typeof priorityOrder];
          if (priorityComparison !== 0) return priorityComparison;
          return (a.title || '').localeCompare(b.title || '');
        }
        if (!a.dueAt) return 1; // Tasks without due date go to end
        if (!b.dueAt) return -1;

        const dateComparison = compareDates(a.dueAt, b.dueAt);
        if (dateComparison !== 0) return dateComparison;

        // If dates are same, sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityComparison =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityComparison !== 0) return priorityComparison;

        // If both date and priority are same, sort alphabetically
        return (a.title || '').localeCompare(b.title || '');
      } else {
        // Sort by priority (high > medium > low), then by due date, then alphabetically
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        const priorityComparison =
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder];
        if (priorityComparison !== 0) return priorityComparison;

        // If priorities are same, sort by due date
        if (!a.dueAt && !b.dueAt) {
          // Both have no due date, sort alphabetically
          return (a.title || '').localeCompare(b.title || '');
        }
        if (!a.dueAt) return 1;
        if (!b.dueAt) return -1;

        const dateComparison = compareDates(a.dueAt, b.dueAt);
        if (dateComparison !== 0) return dateComparison;

        // If both priority and date are same, sort alphabetically
        return (a.title || '').localeCompare(b.title || '');
      }
    });
  };

  // Create sorted task lists
  const openTasks = sortTasks(courseTasks.filter(t => !t.isCompleted));
  const completedTasks = sortTasks(courseTasks.filter(t => t.isCompleted));

  // Grade calculation logic
  const courseGrades = examGrades.filter(g => {
    const exam = exams.find(e => e.id === g.examId);
    return exam && exam.courseId === selectedCourseId;
  });

  const calculateCourseAverage = (): string | null => {
    const examsWithGrades = courseExams.filter(exam => courseGrades.some(grade => grade.examId === exam.id));

    if (examsWithGrades.length === 0) return null;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    examsWithGrades.forEach(exam => {
      const grade = courseGrades.find(g => g.examId === exam.id);
      if (grade && grade.grade >= 1 && grade.grade <= 7) {
        totalWeightedScore += grade.grade * exam.weight;
        totalWeight += exam.weight;
      }
    });

    return totalWeight > 0 ? (totalWeightedScore / totalWeight).toFixed(1) : null;
  };

  const updateExamGrade = (examId: string, grade: string): void => {
    // Allow empty string to clear the grade
    if (grade === '') {
      const filtered = examGrades.filter(g => g.examId !== examId);
      setExamGrades(filtered);
      return;
    }

    const gradeValue = parseFloat(grade);

    // Always allow numeric input for better UX, but validate before saving
    if (!isNaN(gradeValue) && gradeValue >= 1 && gradeValue <= 7) {
      const existing = examGrades.find(g => g.examId === examId);
      if (existing) {
        setExamGrades(examGrades.map(g => (g.examId === examId ? { ...g, grade: gradeValue } : g)));
      } else {
        setExamGrades([...examGrades, { examId, grade: gradeValue }]);
      }
    }
  };

  const progress = useMemo(() => {
    const completed = courseTasks.filter(t => t.isCompleted).length;
    const total = courseTasks.length || 1;
    return Math.round((completed / total) * 100);
  }, [courseTasks]);

  const confetti = useConfetti({
    trigger: progress === 100 && courseTasks.length > 0,
  });

  return (
    <div className="space-y-6">
      <Confetti confetti={confetti} />
      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <CardTitle>{tCourse('courseMenu.title')}</CardTitle>
                  <CardDescription>{tCourse('courseMenu.description')}</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => openSettingsDialog('courses')}
                  title={tCourse('courseMenu.manageCourses')}
                >
                  <Settings className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {courses.map(course => {
                const isSelected = course.id === selectedCourseId;
                const stats = courseStats[course.id] || { openTasks: 0, upcomingExams: 0 };

                return (
                  <button
                    type="button"
                    key={course.id}
                    onClick={() => setSelectedCourse(course.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-emerald-300/80 bg-emerald-50/80 dark:bg-emerald-900/20 ring-2 ring-emerald-400/70'
                        : 'border-white/20 bg-white/60 hover:bg-white/80 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/80 text-xl shadow-sm dark:bg-zinc-900/60">
                        {course.emoji || DEFAULT_COURSE_EMOJI}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{course.title}</div>
                        <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {tCourse('courseMenu.openTasks', { count: stats.openTasks })}
                        </div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          {tCourse('courseMenu.upcomingExams', { count: stats.upcomingExams })}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950"
                onClick={() => setClearConfirmOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {tCourse('actions.clearCourseData')}
              </Button>
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 lg:hidden">
          <Select value={selectedCourseId} onValueChange={v => setSelectedCourse(v)}>
            <SelectTrigger className="w-56 rounded-xl">
              <SelectValue placeholder={selectedCourse?.title || tCourse('courseMenu.title')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  <span className="mr-2">{c.emoji || DEFAULT_COURSE_EMOJI}</span>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            onClick={() => openSettingsDialog('courses')}
            title={tCourse('courseMenu.manageCourses')}
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 dark:border-red-900 dark:hover:bg-red-950"
            onClick={() => setClearConfirmOpen(true)}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {tCourse('actions.clearCourseData')}
          </Button>
        </div>
        <div className="text-sm text-zinc-600 dark:text-zinc-400">{tCourse('tasks.taskProgress')}</div>
      </div>
      <Progress value={progress} className="h-3 rounded-xl" />

      <div className="grid md:grid-cols-2 gap-6">
        {/* Tasks */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="w-5 h-5" />
                  {tCourse('tasks.title')}
                </CardTitle>
                <CardDescription>{tCourse('tasks.description')}</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={taskSortOrder} onValueChange={(value: 'date' | 'priority') => setTaskSortOrder(value)}>
                  <SelectTrigger className="w-36 h-8 text-xs rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">{tCourse('tasks.sortByDate')}</SelectItem>
                    <SelectItem value="priority">{tCourse('tasks.sortByPriority')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  onClick={() =>
                    itemDialog.openAddDialog('task', {
                      courseId: selectedCourseId,
                    })
                  }
                  size="sm"
                  className="rounded-xl"
                  style={{
                    backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                    color: 'white',
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {tCourse('actions.addTask')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-wide text-zinc-500">{tCourse('tasks.sections.open')}</div>
              {openTasks.length === 0 && (
                <div className="text-sm text-zinc-500">{tCourse('tasks.empty.noPending')}</div>
              )}
              {openTasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between bg-white/70 dark:bg-white/5 p-3 rounded-xl group border-l-4"
                  style={{ borderLeftColor: getItemTaskPriorityColor(t.priority) }}
                >
                  <div
                    className="flex-1 cursor-pointer"
                    onClick={() => {
                      // Edit task using the item dialog
                      itemDialog.openEditDialog(t);
                    }}
                  >
                    <div className="font-medium">{t.title}</div>
                    <div className="text-xs text-zinc-500">
                      {t.dueAt ? formatDateDDMMYYYY(new Date(t.dueAt).toISOString().split('T')[0]) : '—'} · {t.priority}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={e => {
                        e.stopPropagation();
                        itemDialog.openEditDialog(t);
                      }}
                      title={tCourse('actions.edit')}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="rounded-xl"
                      onClick={() => {
                        updateItem(t.id, { isCompleted: true } as any);
                      }}
                    >
                      {tCourse('actions.done')}
                    </Button>
                    <Button size="icon" variant="ghost" className="rounded-xl" onClick={() => deleteItem(t.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {completedTasks.length > 0 && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full mt-4 px-2 h-auto py-2 justify-between rounded-lg"
                    onClick={() => setShowCompletedTasks(prev => !prev)}
                    aria-expanded={showCompletedTasks}
                  >
                    <span className="text-xs uppercase tracking-wide text-zinc-100 dark:text-zinc-100">
                      {tCommon('status.completed')} ({completedTasks.length})
                      
                    </span>
                    <span className="text-xs text-zinc-700 dark:text-zinc-200 normal-case tracking-normal flex items-center gap-1 font-medium">
                      {showCompletedTasks ? tCourse('tasks.hideCompleted') : tCourse('tasks.showCompleted')}
                      {showCompletedTasks ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                  </Button>
                  {showCompletedTasks && (
                    <div className="space-y-2">
                      {completedTasks.map(t => (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={t.id}
                          className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl group border-l-4"
                          style={{ borderLeftColor: getItemTaskPriorityColor(t.priority) }}
                        >
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => {
                              // Edit completed task using the item dialog
                              itemDialog.openEditDialog(t);
                            }}
                          >
                            <div className="line-through group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                              {t.title}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {t.dueAt ? formatDateDDMMYYYY(new Date(t.dueAt).toISOString().split('T')[0]) : '—'} ·{' '}
                              {t.priority}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={e => {
                                e.stopPropagation();
                                itemDialog.openEditDialog(t);
                              }}
                              title={tCourse('actions.edit')}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => updateItem(t.id, { isCompleted: false } as any)}
                              title={tCourse('actions.undo')}
                            >
                              <Undo className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => deleteItem(t.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Evaluations */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="w-5 h-5" />
                  {tCourse('exams.upcoming.title')}
                </CardTitle>
                <CardDescription>{tCourse('exams.upcoming.description')}</CardDescription>
              </div>
              <Button
                onClick={() =>
                  itemDialog.openAddDialog('exam', {
                    courseId: selectedCourseId,
                  })
                }
                size="sm"
                className="rounded-xl"
                style={{
                  backgroundColor: `hsl(var(--accent-h) var(--accent-s) var(--accent-l))`,
                  color: 'white',
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                {tCourse('actions.addExam')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pl-1">
            {upcomingExams.length === 0 && (
              <div className="text-sm text-zinc-500">{tCourse('exams.upcoming.empty')}</div>
            )}

            {/* Main chevron for expand/collapse all - positioned above the items */}
            {[...upcomingExams, ...completedExams].some(e => e.notes) ? (
              <div className="flex items-start gap-1 mb-2 cursor-pointer" onClick={toggleAllExamNotes}>
                <div className="flex-shrink-0 w-5 flex justify-center">
                  <div
                    className="h-6 w-6 flex items-center justify-center hover:opacity-70 transition-opacity"
                    title={areAllNotesExpanded() ? tCourse('actions.hideAllNotes') : tCourse('actions.showAllNotes')}
                  >
                    {areAllNotesExpanded() ? (
                      <ChevronDown className="w-4 h-4 text-zinc-500 font-bold" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-zinc-500 font-bold" />
                    )}
                  </div>
                </div>
                <div className="flex-1 text-xs text-zinc-500 pt-1">
                  {areAllNotesExpanded() ? tCourse('actions.hideAllNotes') : tCourse('actions.showAllNotes')}
                </div>
              </div>
            ) : (
              <div className="p-3"> </div>
            )}

            <div className="space-y-2 max-h-[420px] overflow-auto">
              {upcomingExams
                .sort((a, b) => compareDates(a.startsAt, b.startsAt))
                .map(e => (
                  <div key={e.id} className="flex items-start gap-1">
                    {/* Chevron positioned outside the card */}
                    <div className="flex-shrink-0 w-5 flex justify-center pt-3">
                      {e.notes ? (
                        <div
                          className="h-6 w-6 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                          title={expandedExamNotes[e.id] ? tCourse('actions.hideNotes') : tCourse('actions.showNotes')}
                          onClick={ev => {
                            ev.stopPropagation();
                            toggleExamNotesExpanded(e.id);
                          }}
                        >
                          {expandedExamNotes[e.id] ? (
                            <ChevronDown className="w-4 h-4 text-zinc-500" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* Exam card */}
                    <div className="flex-1 bg-white/70 dark:bg-white/5 rounded-xl hover:bg-white/80 dark:hover:bg-white/10 transition-colors">
                      <div
                        className="flex items-start justify-between p-3 cursor-pointer"
                        onClick={() => {
                          // Edit exam using the item dialog
                          itemDialog.openEditDialog(e);
                        }}
                      >
                        <div className="w-full">
                          <Badge variant="secondary" className="rounded-full self-start float-right">
                            {(() => {
                              const examDate = new Date(e.startsAt);
                              const today = new Date();
                              const diffTime = compareDates(examDate, today);
                              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                              return diffDays <= 0
                                ? tCommon('fields.today')
                                : diffDays === 1
                                ? tCommon('fields.tomorrow')
                                : tCourse('exams.timing.days', { count: diffDays });
                            })()}
                          </Badge>
                          <div className="font-medium">{e.title}</div>
                          <div className="text-xs text-zinc-500">
                            {formatDateDDMMYYYY(new Date(e.startsAt).toISOString().split('T')[0])} · {e.weight}%
                          </div>
                        </div>
                      </div>

                      {e.notes && expandedExamNotes[e.id] && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3">
                            <TasksProgressBar progress={examNotesProgress[e.id]} />
                            <RichTextDisplay
                              content={e.notes}
                              className="text-xs"
                              onContentChange={newContent => {
                                // Update the exam with the new notes content
                                updateItem(e.id, {
                                  notes: newContent,
                                } as any);
                              }}
                              onProgressChange={progress => {
                                setExamNotesProgress(prev => ({
                                  ...prev,
                                  [e.id]: progress,
                                }));
                              }}
                            />
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                ))}
            </div>

            {/* Completed Exams Section */}
            {completedExams.length > 0 && (
              <>
                <div className="text-xs uppercase tracking-wide text-zinc-500 mt-4">{tCommon('status.completed')}</div>
                <div className="space-y-2">
                  {completedExams
                    .sort((a, b) => compareDates(b.startsAt, a.startsAt))
                    .map(e => (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={e.id}
                        className="flex items-start gap-1"
                      >
                        {/* Chevron positioned outside the card */}
                        <div className="flex-shrink-0 w-5 flex justify-center pt-3">
                          {e.notes ? (
                            <div
                              className="h-6 w-6 flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                              onClick={ev => {
                                ev.stopPropagation();
                                toggleExamNotesExpanded(e.id);
                              }}
                            >
                              {expandedExamNotes[e.id] ? (
                                <ChevronDown className="w-4 h-4 text-zinc-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-zinc-400" />
                              )}
                            </div>
                          ) : null}
                        </div>

                        {/* Exam card */}
                        <div className="flex-1 bg-white/40 dark:bg-white/5 rounded-xl group hover:bg-white/50 dark:hover:bg-white/8 transition-colors">
                          <div
                            className="flex items-start justify-between p-3 cursor-pointer"
                            onClick={() => {
                              // Edit completed exam using the item dialog
                              itemDialog.openEditDialog(e);
                            }}
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Check className="w-4 h-4 text-green-600" />
                                <span className="font-medium text-green-700 dark:text-green-400">{e.title}</span>
                              </div>
                              <div className="text-xs text-zinc-500 ml-6">
                                {formatDateDDMMYYYY(new Date(e.startsAt).toISOString().split('T')[0])} · {e.weight}% ·
                                {tCommon('status.completed')}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                className="rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={ev => {
                                  ev.stopPropagation();
                                  updateItem(e.id, { isCompleted: false } as any);
                                }}
                                title={tCourse('exams.upcoming.title')}
                              >
                                <Undo className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          {e.notes && expandedExamNotes[e.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: 'easeInOut' }}
                              className="overflow-hidden"
                            >
                              <div className="px-3 pb-3">
                                <RichTextDisplay
                                  content={e.notes}
                                  className="text-xs"
                                  onContentChange={newContent => {
                                    // Update the exam with the new notes content
                                    updateItem(e.id, {
                                      notes: newContent,
                                    } as any);
                                  }}
                                />
                              </div>
                            </motion.div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Grade Calculator & Course Record Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Grade Calculator Card */}
        <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 002 2z"
              />
            </svg>
            {tCourse('grades.title')}
          </CardTitle>
          <CardDescription>{tCourse('grades.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {courseExams.length === 0 ? (
            <div className="text-sm text-zinc-500 text-center py-6">{tCourse('grades.addExamsFirst')}</div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Left Column - Exam Grades Input */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300 mb-3">
                  {tCourse('grades.examGrades')}
                </h4>
                {courseExams
                  .sort((a, b) => {
                    // First sort by date (earliest first)
                    const dateComparison = compareDates(a.startsAt, b.startsAt);
                    if (dateComparison !== 0) return dateComparison;

                    // If dates are the same, sort alphabetically by title
                    return (a.title || '').localeCompare(b.title || '');
                  })
                  .map(exam => {
                    const currentGrade = courseGrades.find(g => g.examId === exam.id);
                    return (
                      <div
                        key={exam.id}
                        className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-3 rounded-xl cursor-pointer hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
                        onClick={() => {
                          // Edit exam using the item dialog
                          itemDialog.openEditDialog(exam);
                        }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{exam.title}</div>
                          <div className="text-xs text-zinc-500">
                            {tCourse('grades.weight', { weight: exam.weight })}
                          </div>
                        </div>
                        <div className="ml-3">
                          <Input
                            type="number"
                            min="1"
                            max="7"
                            step="0.1"
                            placeholder={tCourse('tasks.placeholders.grade')}
                            value={currentGrade?.grade?.toString() || ''}
                            onChange={e => updateExamGrade(exam.id, e.target.value)}
                            onClick={e => e.stopPropagation()} // Prevent opening dialog when clicking input
                            className="w-20 h-8 text-center rounded-lg"
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Right Column - Course Average Display */}
              <div className="flex flex-col justify-center items-center bg-white/40 dark:bg-white/5 p-6 rounded-xl">
                <h4 className="font-medium text-sm text-zinc-700 dark:text-zinc-300 mb-4">
                  {tCourse('grades.courseAverage')}
                </h4>
                <div className="text-center">
                  {calculateCourseAverage() ? (
                    <div
                      className={`text-4xl font-bold mb-2 ${
                        parseFloat(calculateCourseAverage()) >= 4.0
                          ? 'text-green-600 dark:text-green-400'
                          : parseFloat(calculateCourseAverage()) >= 3.0
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {calculateCourseAverage()}
                    </div>
                  ) : (
                    <div className="text-4xl font-bold text-zinc-400 mb-2">--</div>
                  )}
                  <div className="text-sm text-zinc-500 mb-3">{tCourse('grades.outOf')}</div>

                  {calculateCourseAverage() && (
                    <div className="text-xs text-zinc-600 dark:text-zinc-400">
                      {tCourse('grades.examsSummary', { graded: courseGrades.length, total: courseExams.length })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Syllabus Upload Section */}
          <div className="border-t pt-4">
            <SyllabusUpload
              courseId={selectedCourseId}
              syllabusFileId={courses.find(c => c.id === selectedCourseId)?.syllabusFileId}
              onSyllabusChange={(fileId) => updateCourseSyllabus(selectedCourseId, fileId)}
            />
          </div>
        </CardContent>
      </Card>

        {/* Course Record Calendar Card */}
        <CourseRecordCalendar courseId={selectedCourseId} />
      </div>
        </main>
      </div>

      {/* Confirmation Dialog for clearing course data */}
      <Dialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}>
        <DialogContent className="rounded-xl bg-white dark:bg-zinc-950 border-none shadow-xl backdrop-blur">
          <DialogHeader className="">
            <DialogTitle>
              {tCourse('confirmations.clearData.title', { course: getCourseTitle(selectedCourseId) })}
            </DialogTitle>
            <DialogDescription>
              {tCourse('confirmations.clearData.description', { course: getCourseTitle(selectedCourseId) })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setClearConfirmOpen(false)}>
              {tCommon('actions.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                clearCourseData(selectedCourseId);
                setClearConfirmOpen(false);
              }}
            >
              <Trash2 className="w-4 h-4 mr-1" /> {tCourse('confirmations.clearData.clearButton')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Item Dialog for editing tasks and exams */}
      <ItemDialog
        open={itemDialog.open}
        onOpenChange={itemDialog.onOpenChange}
        editingItem={itemDialog.editingItem}
        itemType={itemDialog.itemType}
        form={itemDialog.form}
        hidden={itemDialog.hidden}
        disabled={itemDialog.disabled}
        availableItemTypes={itemDialog.availableItemTypes}
        onTypeChange={itemDialog.handleChangeItemType}
        onSave={itemDialog.handleSave}
        onDelete={itemDialog.handleDelete}
      />
    </div>
  );
}
