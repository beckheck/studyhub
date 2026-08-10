import { Card, CardContent } from '@/components/ui/card';
import { QuickRecordDialog } from '@/components/CourseRecordCalendar';
import { useCourses, useItems, useSemesterDates } from '@/hooks/useStore';
import { ItemTimetable, TIME_BLOCKS } from '@/items/timetable/modelSchema';
import { Clock, NotebookPen, Palmtree } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface TodayScheduleProps {
  onTabChange?: (tab: string) => void;
}

/**
 * A wide, compact horizontal card displaying today's schedule
 */
export default function TodaySchedule({ onTabChange }: TodayScheduleProps) {
  const { t } = useTranslation('common');
  const { getCourseTitle } = useCourses();
  const { getItemsByType } = useItems();
  const { semesterDates } = useSemesterDates();

  const timetableEvents = getItemsByType('timetable') as ItemTimetable[];

  // Check if today is during an active semester or on break
  const isDuringSemester = (() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inRange = (start: string, end: string) =>
      start && end && todayStr >= start && todayStr <= end;

    if (inRange(semesterDates.firstSemesterStart, semesterDates.firstSemesterEnd)) return true;
    if (inRange(semesterDates.secondSemesterStart, semesterDates.secondSemesterEnd)) return true;
    return false;
  })();

  const isOnBreak = (() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const inRange = (start: string, end: string) =>
      start && end && todayStr >= start && todayStr <= end;

    if (inRange(semesterDates.recessWeekStart, semesterDates.recessWeekEnd)) return true;
    if (inRange(semesterDates.winterBreakStart, semesterDates.winterBreakEnd)) return true;
    return false;
  })();

  // If dates are configured but user is not in an active semester, hide schedule
  const hasAnyDates = semesterDates.firstSemesterStart || semesterDates.secondSemesterStart;
  if (hasAnyDates && !isDuringSemester) {
    return (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Palmtree className="w-4 h-4" />
            <span className="text-sm">
              {isOnBreak
                ? t('dashboard.onBreak', 'You\'re on break — enjoy your time off!')
                : t('dashboard.notInSemester', 'No active semester — enjoy your break!')}
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Quick record dialog state
  const [quickRecordOpen, setQuickRecordOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<{ id: string; name: string } | null>(null);

  // Get today's weekday (0 = Sunday, 1 = Monday, etc.)
  const today = new Date();
  const todayWeekday = today.getDay();

  // Filter events for today and sort by time block
  const todayEvents = timetableEvents
    .filter(event => event.weekday === todayWeekday)
    .sort((a, b) => {
      const blockA = TIME_BLOCKS.find(block => block.id === a.blockId);
      const blockB = TIME_BLOCKS.find(block => block.id === b.blockId);
      if (!blockA || !blockB) return 0;
      return blockA.startsAt.localeCompare(blockB.startsAt);
    });

  // Get current time to highlight current/upcoming classes
  const currentTime = `${String(today.getHours()).padStart(2, '0')}:${String(today.getMinutes()).padStart(2, '0')}`;

  const getBlockTime = (blockId: string) => {
    const block = TIME_BLOCKS.find(b => b.id === blockId);
    return block ? { startsAt: block.startsAt, endsAt: block.endsAt } : null;
  };

  const isCurrentBlock = (blockId: string) => {
    const block = getBlockTime(blockId);
    if (!block) return false;
    return currentTime >= block.startsAt && currentTime <= block.endsAt;
  };

  const isPastBlock = (blockId: string) => {
    const block = getBlockTime(blockId);
    if (!block) return false;
    return currentTime > block.endsAt;
  };

  const handleOpenQuickRecord = (courseId: string, courseName: string) => {
    setSelectedCourse({ id: courseId, name: courseName });
    setQuickRecordOpen(true);
  };

  if (todayEvents.length === 0) {
    return (
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-3 text-zinc-500 dark:text-zinc-400">
            <Clock className="w-4 h-4" />
            <span className="text-sm">{t('dashboard.noClassesToday', 'No classes scheduled for today')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="rounded-2xl border-none shadow-xl bg-white/80 dark:bg-white/10 backdrop-blur">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-2 shrink-0 pr-3 border-r border-zinc-200 dark:border-zinc-700">
              <Clock className="w-4 h-4 text-zinc-500" />
              <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                {t('dashboard.todaySchedule', "Today's Schedule")}
              </span>
            </div>
            
            <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto scrollbar-hide py-1 pr-4">
              {todayEvents.map((event, index) => {
                const blockTime = getBlockTime(event.blockId);
                const isCurrent = isCurrentBlock(event.blockId);
                const isPast = isPastBlock(event.blockId);
                const courseName = getCourseTitle(event.courseId);
                
                return (
                  <div key={event.id} className="flex items-center gap-2">
                    {index > 0 && (
                      <div className="w-4 h-px bg-zinc-300 dark:bg-zinc-600 shrink-0" />
                    )}
                    <button
                      onClick={() => handleOpenQuickRecord(event.courseId, courseName)}
                      title={t('dashboard.addRecord', 'Click to add a record for this class')}
                      className={`
                        group flex items-center gap-2 px-3 py-1.5 rounded-lg shrink-0 transition-all duration-200
                        ${isCurrent 
                          ? 'ring-2 ring-offset-1 ring-offset-white dark:ring-offset-zinc-900' 
                          : ''
                        }
                        ${isPast 
                          ? 'opacity-50' 
                          : 'hover:scale-105 cursor-pointer'
                        }
                      `}
                      style={{
                        backgroundColor: event.color ? `${event.color}20` : 'rgba(124, 58, 237, 0.1)',
                        borderLeft: `3px solid ${event.color || '#7c3aed'}`,
                        ...(isCurrent && { ringColor: event.color || '#7c3aed' }),
                      }}
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
                          {courseName}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {blockTime ? `${blockTime.startsAt} - ${blockTime.endsAt}` : ''}
                        </span>
                      </div>
                      {event.classroom && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-white/50 dark:bg-white/10 rounded text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
                          {event.classroom}
                        </span>
                      )}
                      {/* Record icon - visible on hover */}
                      <NotebookPen className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Record Dialog */}
      {selectedCourse && (
        <QuickRecordDialog
          open={quickRecordOpen}
          onOpenChange={setQuickRecordOpen}
          courseId={selectedCourse.id}
          courseName={selectedCourse.name}
          date={today}
        />
      )}
    </>
  );
}
