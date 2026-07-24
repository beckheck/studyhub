import { EventTooltip, EventTypeIndicator } from '@/components/PlannerSharedComponents';
import { type ProgressData } from '@/components/TasksProgressBar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useItems, useWeeklyGoals } from '@/hooks/useStore';
import { Plus, Target, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfetti } from '../hooks/useConfetti';
import Confetti from './ui/confetti';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
type DayName = (typeof DAYS)[number];

interface PlannerWeekViewProps {
  startOfWeek: Date;
  getAllEventsForDate: (date: Date) => any[];
  handleDayClick: (date: Date) => void;
  itemDialog: any;
  editItemDialogOptions?: any;
  handleEventDrop: (itemId: string, itemType: string, targetDate: Date) => void;
}

export function PlannerWeekView({
  startOfWeek,
  getAllEventsForDate,
  handleDayClick,
  itemDialog,
  editItemDialogOptions,
  handleEventDrop,
}: PlannerWeekViewProps) {
  const { getCourseTitle } = useCourses();
  const { weeklyGoals, addGoal, toggleGoal, deleteGoal, clearAllGoals } = useWeeklyGoals();
  const { updateItem } = useItems();
  const { t } = useTranslation('planner');
  const { getShortDayNames } = useLocalization();

  // Helper function to handle content changes for different event types
  const handleEventContentChange = (event: any, newContent: string) => {
    updateItem(event.id, { notes: newContent });
  };

  const [goalForm, setGoalForm] = useState<{ title: string }>({ title: '' });

  // Use gradual confetti hook for goal completion
  const allGoalsCompleted = weeklyGoals.length > 0 && weeklyGoals.every(goal => goal.completed);
  const confetti = useConfetti({
    trigger: allGoalsCompleted,
  });

  // Progress tracking for task-based notes in events
  const [eventNotesProgress, setEventNotesProgress] = useState<Record<string, ProgressData>>({});

  // Calculate goal progress
  const completedGoals = weeklyGoals.filter(goal => goal.completed).length;
  const totalGoals = weeklyGoals.length;
  const fillPercentage = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;

  // Build gradient from completed tasks colors
  const buildGradientFromCompletedTasks = (): string => {
    const completedTasks = weeklyGoals.filter(goal => goal.completed);

    if (completedTasks.length === 0) {
      return 'transparent';
    }

    if (completedTasks.length === 1) {
      // Single color for first completed task - use existing color or a default
      return completedTasks[0].color || '#7c3aed';
    }

    // Multiple colors - create gradient using existing colors or defaults
    const colors = completedTasks.map(task => task.color || '#7c3aed');
    const step = 100 / (colors.length - 1);
    const gradientStops = colors.map((color, index) => `${color} ${Math.round(index * step)}%`).join(', ');

    return `linear-gradient(180deg, ${gradientStops})`;
  };

  const currentGradient = buildGradientFromCompletedTasks();

  // Get border color from first completed task
  const getBorderColor = (): string => {
    const firstCompletedTask = weeklyGoals.find(goal => goal.completed);
    if (firstCompletedTask && firstCompletedTask.color) {
      return firstCompletedTask.color + '40'; // Add transparency
    }
    return '#e5e7eb'; // Default gray border
  };

  function dayNumOfWeek(i: number): number {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d.getDate();
  }

  // Helper: events for weekday name (Mon..Sun), filtered & sorted
  function eventsForWeekdayName(dayName: DayName): any[] {
    const date = new Date(startOfWeek);
    const dayIndex = DAYS.indexOf(dayName);
    date.setDate(date.getDate() + dayIndex);
    return getAllEventsForDate(date);
  }

  // Weekly Goals Management
  function handleAddGoal(): void {
    if (!goalForm.title.trim()) return;
    addGoal(goalForm.title);
    setGoalForm({ title: '' });
  }

  function handleToggleGoal(id: string): void {
    const result = toggleGoal(id);

    // Check if all goals are completed - confetti will be handled by the hook
    if (result?.allCompleted) {
      // Reset all goals after a short delay to allow confetti to play
      setTimeout(() => {
        clearAllGoals();
      }, 3500); // Slightly longer to allow full confetti sequence
    }
  }

  function handleDeleteGoal(id: string): void {
    deleteGoal(id);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-7 gap-4 relative">
        {getShortDayNames().map((dayName, idx) => {
          // Calculate the date for this day
          const dayDate = new Date(startOfWeek);
          dayDate.setDate(startOfWeek.getDate() + idx);
          const dayKey = DAYS[idx]; // Keep original key for logic

          return (
            <Card
              key={dayKey}
              className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur relative cursor-pointer hover:shadow-2xl transition-shadow duration-200"
              onClick={() => handleDayClick(dayDate)}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                try {
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (data && data.itemId) {
                    handleEventDrop(data.itemId, data.itemType, dayDate);
                  }
                } catch (err) {
                  // Ignore invalid drop data
                }
              }}
              title={t('messages.clickToCreate')}
            >
              <CardHeader className="relative z-[1] lg:block hidden">
                <CardTitle className="flex items-center justify-start gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{dayName}</span>
                    <div className="flex items-center gap-1.5">
                      <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium">
                        {dayNumOfWeek(idx)}
                      </div>
                      {eventsForWeekdayName(dayKey).length > 0 && (
                        <Badge variant="secondary" className="h-8 px-2.5 rounded-xl flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-violet-500"></div>
                          <span>{eventsForWeekdayName(dayKey).length}</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardTitle>
                <CardDescription>{t('messages.upcoming')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {/* Mobile & Medium: Horizontal same-row layout for space efficiency */}
                <div className="block lg:hidden">
                  {eventsForWeekdayName(dayKey).length === 0 ? (
                    <div className="flex items-start gap-3 h-12 pt-2">
                      {/* Left: Consistent day name and date layout */}
                      <div className="flex flex-col gap-1 flex-shrink-0 w-20 sm:w-24">
                        {/* Top row: Day name and date */}
                        <div className="flex items-center justify-start gap-2">
                          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 min-w-[2rem] text-left">
                            {dayName}
                          </span>
                          <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium text-lg">
                            {dayNumOfWeek(idx)}
                          </div>
                        </div>
                        {/* Bottom row: Empty space to maintain consistent height */}
                        <div className="h-6"></div>
                      </div>
                      {/* Right: No events message */}
                      <div className="flex-1 text-sm text-zinc-500 dark:text-zinc-400 ml-3">
                        {t('messages.noEvents')}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 pt-2">
                      {eventsForWeekdayName(dayKey).map((e, eventIdx) => (
                        <div key={e.id} className="flex items-start gap-3 min-h-[3rem]">
                          {/* Left: Day name, Date and Counter (only show on first event) */}
                          {eventIdx === 0 && (
                            <div className="flex flex-col gap-1 flex-shrink-0 w-20 sm:w-24">
                              {/* Top row: Day name and date */}
                              <div className="flex items-center justify-start gap-2">
                                <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 min-w-[2rem] text-left">
                                  {dayName}
                                </span>
                                <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/5 backdrop-blur flex items-center justify-center font-medium text-lg">
                                  {dayNumOfWeek(idx)}
                                </div>
                              </div>
                              {/* Bottom row: Events counter badge */}
                              <Badge
                                variant="secondary"
                                className="h-6 px-2 rounded-xl flex items-center gap-1 self-start"
                              >
                                <div className="w-1 h-1 rounded-full bg-violet-500"></div>
                                <span className="text-xs">{eventsForWeekdayName(dayKey).length}</span>
                              </Badge>
                            </div>
                          )}
                          {/* Spacer for subsequent events to align with first event's content */}
                          {eventIdx > 0 && <div className="w-20 sm:w-24 flex-shrink-0"></div>}

                          {/* Right: Event content */}
                          <div
                            draggable
                            onDragStart={(dragEvent) => {
                              dragEvent.stopPropagation();
                              dragEvent.dataTransfer.setData(
                                'application/json',
                                JSON.stringify({ itemId: e.id, itemType: e.type })
                              );
                            }}
                            className="flex-1 group relative bg-white/70 dark:bg-white/5 p-2.5 rounded-xl cursor-pointer hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                            onClick={clickEvent => {
                              clickEvent.stopPropagation();
                              itemDialog.openEditDialog(e, editItemDialogOptions);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 overflow-hidden mb-1">
                                  <EventTypeIndicator event={e} />
                                  <span className="font-medium truncate text-sm">{e.title || e.type}</span>
                                </div>
                                <div className="text-xs text-zinc-500 truncate">
                                  {t(`items:${e.type}.title`)}
                                  {` · `}
                                  {getCourseTitle(e.courseId)}
                                  {e.location && ` · ${e.location}`}
                                  {e.weight && ` · ${e.weight}%`}
                                  {e.priority && ` · ${e.priority} priority`}
                                </div>
                              </div>
                            </div>
                            <EventTooltip
                              event={e}
                              onContentChange={newContent => handleEventContentChange(e, newContent)}
                              progress={eventNotesProgress[e.id]}
                              onProgressChange={progress => {
                                setEventNotesProgress(prev => ({
                                  ...prev,
                                  [e.id]: progress,
                                }));
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Large: Default vertical behavior */}
                <div className="hidden lg:block space-y-2">
                  {eventsForWeekdayName(dayKey).map(e => (
                    <div
                      key={e.id}
                      draggable
                      onDragStart={(dragEvent) => {
                        dragEvent.stopPropagation();
                        dragEvent.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({ itemId: e.id, itemType: e.type })
                        );
                      }}
                      className="group relative flex flex-row items-start justify-between gap-2 bg-white/70 dark:bg-white/5 p-3 rounded-xl mb-2 cursor-pointer hover:bg-white/90 dark:hover:bg-white/10 transition-colors"
                      onClick={clickEvent => {
                        clickEvent.stopPropagation();
                        itemDialog.openEditDialog(e, editItemDialogOptions);
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <EventTypeIndicator event={e} />
                          <span className="font-medium truncate text-sm">{e.title || e.type}</span>
                        </div>
                        <div className="text-xs text-zinc-500 truncate mt-0">
                          {t(`items:${e.type}.title`)}
                          {` · `}
                          {getCourseTitle(e.courseId)}
                          <span className="inline">
                            {e.location && ` · ${e.location}`}
                            {e.weight && ` · ${e.weight}%`}
                            {e.priority && ` · ${e.priority} priority`}
                          </span>
                        </div>
                      </div>
                      <EventTooltip
                        event={e}
                        onContentChange={newContent => handleEventContentChange(e, newContent)}
                        progress={eventNotesProgress[e.id]}
                        onProgressChange={progress => {
                          setEventNotesProgress(prev => ({
                            ...prev,
                            [e.id]: progress,
                          }));
                        }}
                      />
                    </div>
                  ))}
                  {eventsForWeekdayName(dayKey).length === 0 && (
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">{t('messages.noEvents')}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Present Goals Card - Only visible in weekly view */}
      <Card className="mt-6 rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t('goals.weeklyGoals')}
          </CardTitle>
          <CardDescription>{t('goals.weeklyFocusGoals')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left Column - Goals List */}
            <div className="space-y-4">
              {/* Add Goal Form */}
              <div className="space-y-2">
                <Label htmlFor="goalTitle" className="text-gray-700 dark:text-gray-300">
                  {t('goals.addGoal')}
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="goalTitle"
                    value={goalForm.title}
                    onChange={e => setGoalForm({ title: e.target.value })}
                    placeholder={t('goals.goalPlaceholder')}
                    className="rounded-xl"
                    onKeyPress={e => e.key === 'Enter' && handleAddGoal()}
                  />
                  <Button onClick={handleAddGoal} size="sm" className="rounded-xl px-4">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Goals List */}
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {weeklyGoals.length === 0 ? (
                  <div className="text-sm text-zinc-500 dark:text-zinc-400 text-center py-8 whitespace-pre-line">
                    {t('messages.noGoalsSet')}
                  </div>
                ) : (
                  weeklyGoals.map(goal => (
                    <div
                      key={goal.id}
                      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 ${
                        goal.completed
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700'
                      }`}
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleToggleGoal(goal.id)}
                        className={`w-6 h-6 rounded-full border-2 p-0 ${
                          goal.completed
                            ? 'text-white hover:opacity-80'
                            : 'border-zinc-300 dark:border-zinc-600 hover:border-green-400'
                        }`}
                        style={
                          goal.completed
                            ? {
                                backgroundColor: goal.color,
                                borderColor: goal.color,
                              }
                            : {}
                        }
                      >
                        {goal.completed && <span className="text-xs">✓</span>}
                      </Button>

                      <span
                        className={`flex-1 ${
                          goal.completed ? 'line-through text-zinc-500' : 'text-zinc-900 dark:text-zinc-100'
                        }`}
                      >
                        {goal.title}
                      </span>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteGoal(goal.id)}
                        className="w-6 h-6 p-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Right Column - Water Fill Circle */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative w-32 h-32">
                {/* Circle Container */}
                <div
                  className="w-full h-full rounded-full border-4 bg-white dark:bg-zinc-900 overflow-hidden relative transition-all duration-1000"
                  style={{ borderColor: getBorderColor() }}
                >
                  {/* Water Fill Animation */}
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out"
                    style={{
                      height: `${fillPercentage}%`,
                      background: currentGradient,
                    }}
                  >
                    {/* Water Wave Effect */}
                    <div
                      className="absolute top-0 left-0 right-0 h-2 opacity-70"
                      style={{
                        background: 'radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)',
                        animation: fillPercentage > 0 ? 'wave 2s ease-in-out infinite' : 'none',
                      }}
                    />
                  </div>

                  {/* Progress Text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-lg font-bold text-zinc-700 dark:text-zinc-300">
                        {completedGoals}/{totalGoals}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">{t('messages.goals')}</div>
                    </div>
                  </div>
                </div>
              </div>

              {fillPercentage === 100 && totalGoals > 0 && (
                <div className="text-sm font-medium text-green-600 dark:text-green-400 animate-pulse">
                  {t('messages.allGoalsCompletedStatus')}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confetti Animation */}
      <Confetti confetti={confetti} />
    </div>
  );
}
