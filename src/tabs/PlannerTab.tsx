import { PlannerMonthView } from '@/components/PlannerMonthView';
import { PlannerWeekView } from '@/components/PlannerWeekView';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLocalization } from '@/hooks/useLocalization';
import { useCourses, useItems } from '@/hooks/useStore';
import { ItemDialogOptions, useItemDialog } from '@/items/ItemDialogProvider';
import { getItemsOnDate, type CalendarEntry } from '@/lib/calendar-queries';
import { getDateString, isMultiDayEvent } from '@/lib/date-utils';
import { CalendarView, Item } from '@/types';
import { CalendarDays, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

// -----------------------------
// Planner (Week + Month views)
// -----------------------------

const addItemDialogOptions: ItemDialogOptions = {
  hidden: { type: false },
  availableItemTypes: ['event', 'exam', 'task'],
};

export default function PlannerTab() {
  const { courses } = useCourses();
  const { items, getItemsByType, updateItem } = useItems();

  // Localization hooks
  const { t } = useTranslation('planner');
  const { t: tCommon } = useTranslation('common');
  const { getShortMonthNames, getMonthNames, formatDate: localizedFormatDate } = useLocalization();

  const [showMultiDayEvents, setShowMultiDayEvents] = useState<boolean>(false);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [view, setView] = useState<'week' | 'month'>('month');
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Item dialog hook
  const itemDialog = useItemDialog();

  // Month data
  const now = new Date();
  const [monthView, setMonthView] = useState<CalendarView>({ year: now.getFullYear(), month: now.getMonth() });

  function monthMatrix(y: number, m: number): Date[] {
    const first = new Date(y, m, 1);
    const offset = (first.getDay() + 6) % 7; // Mon=0
    const start = new Date(y, m, 1 - offset);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }
  const matrix = useMemo(() => monthMatrix(monthView.year, monthView.month), [monthView]);
  function shiftMonth(delta: number): void {
    const d = new Date(monthView.year, monthView.month + delta, 1);
    setMonthView({ year: d.getFullYear(), month: d.getMonth() });
  }

  // Weekly dates (show numbered days on headers)
  const startOfWeek = useMemo(() => {
    const d = new Date();
    const w = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - w + weekOffset * 7);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [weekOffset]);

  // Handle day click to create new event with pre-filled date
  const handleDayClick = (date: Date): void => {
    const dateString = getDateString(date);
    itemDialog.openAddDialog(
      'event',
      {
        startsAt: dateString,
        startsAtTime: '10:00',
        endsAt: dateString,
        endsAtTime: '11:00',
      },
      addItemDialogOptions
    );
  };

  // Helper: get all events for a specific date
  // Query returns occurrences (including recurrence expansion). View applies display filters.
  function getAllEventsForDate(date: Date): Item[] {
    const entries = getItemsOnDate([...items] as Item[], date, { courseFilter: filterCourse });
    return filterEntries(entries).map(e => e.item);
  }

  // Helper: get all events for tooltip (including hidden multi-day events)
  function getAllEventsForTooltip(date: Date): Item[] {
    const entries = getItemsOnDate([...items] as Item[], date, { courseFilter: filterCourse });
    return filterEntries(entries, true).map(e => e.item);
  }

  // Apply the view's display filters to query entries:
  // - completed tasks always hidden
  // - multi-day events hidden unless includeMultiDay (the showMultiDayEvents toggle)
  function filterEntries(entries: CalendarEntry[], includeMultiDay = showMultiDayEvents): CalendarEntry[] {
    return entries.filter(e => {
      if (e.item.type === 'task' && (e.item as { isCompleted: boolean }).isCompleted) return false;
      if (e.item.type === 'event' && e.endsAt) {
        if (isMultiDayEvent(e.item.startsAt, e.item.endsAt) && !includeMultiDay) return false;
      }
      return true;
    });
  }

  const handleEventDrop = (itemId: string, itemType: string, targetDate: Date) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.type === 'event') {
      const oldStart = new Date(item.startsAt);
      const startOfDay = new Date(oldStart.getFullYear(), oldStart.getMonth(), oldStart.getDate());
      const targetOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      const daysDiff = Math.round((targetOfDay.getTime() - startOfDay.getTime()) / (1000 * 60 * 60 * 24));

      const newStart = new Date(item.startsAt);
      newStart.setDate(newStart.getDate() + daysDiff);
      const newEnd = new Date(item.endsAt);
      newEnd.setDate(newEnd.getDate() + daysDiff);

      updateItem(itemId, { startsAt: newStart, endsAt: newEnd } as any);
    } else if (item.type === 'exam') {
      const oldDate = new Date(item.startsAt);
      const newDate = new Date(oldDate);
      newDate.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      updateItem(itemId, { startsAt: newDate } as any);
    } else if (item.type === 'task') {
      const oldDate = new Date(item.dueAt);
      const newDate = new Date(oldDate);
      newDate.setFullYear(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
      updateItem(itemId, { dueAt: newDate } as any);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Select value={filterCourse} onValueChange={setFilterCourse}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder={t('planner:filters.filterByCourse')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('planner:filters.allCourses')}</SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={view === 'week' ? 'default' : 'outline'}
            onClick={() => setView('week')}
            className="rounded-xl"
          >
            {t('planner:views.week')}
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'outline'}
            onClick={() => setView('month')}
            className="rounded-xl"
          >
            {t('planner:views.month')}
          </Button>
          {view === 'week' ? (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={() => setWeekOffset(offset => offset - 1)} className="rounded-xl">
                <CalendarDays className="w-4 h-4 mr-2" />
                {tCommon('actions.previous')}
              </Button>
              <div className="font-medium">
                {localizedFormatDate(startOfWeek, { month: 'short', day: 'numeric' })} -{' '}
                {localizedFormatDate(new Date(startOfWeek.getTime() + 6 * 24 * 60 * 60 * 1000), {
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <Button variant="outline" onClick={() => setWeekOffset(offset => offset + 1)} className="rounded-xl">
                {tCommon('actions.next')}
                <CalendarDays className="w-4 h-4 ml-2" />
              </Button>
              {weekOffset !== 0 && (
                <Button variant="ghost" onClick={() => setWeekOffset(0)} className="rounded-xl">
                  {tCommon('actions.today')}
                </Button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 ml-2">
              <Button variant="outline" onClick={() => shiftMonth(-1)} className="rounded-xl">
                {tCommon('actions.previous')}
              </Button>
              <div className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-gray-100">
                <span className="sm:hidden">
                  {getShortMonthNames()[monthView.month]} '{String(monthView.year).slice(-2)}
                </span>
                <span className="hidden sm:block">
                  {getMonthNames()[monthView.month]} {monthView.year}
                </span>
              </div>
              <Button variant="outline" onClick={() => shiftMonth(1)} className="rounded-xl">
                {tCommon('actions.next')}
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {view === 'month' && (
            <div className="flex items-center gap-2">
              <Switch
                checked={showMultiDayEvents}
                onCheckedChange={setShowMultiDayEvents}
                className="data-[state=checked]:bg-blue-600"
              />
              <Label className="text-sm text-gray-900 dark:text-gray-100">
                {t('planner:filters.showMultiDayEvents')}
              </Label>
            </div>
          )}
          <Button
            className="rounded-xl"
            onClick={() => itemDialog.openAddDialog('event', null, addItemDialogOptions)}
          >
            <Plus className="w-4 h-4 mr-2" />
            {t('items:event.actions.add')}
          </Button>
        </div>
      </div>

      {/* Views */}
      {view === 'week' ? (
        <PlannerWeekView
          startOfWeek={startOfWeek}
          getAllEventsForDate={getAllEventsForDate}
          handleDayClick={handleDayClick}
          handleEventDrop={handleEventDrop}
        />
      ) : (
        <PlannerMonthView
          monthView={monthView}
          matrix={matrix}
          filterCourse={filterCourse}
          showMultiDayEvents={showMultiDayEvents}
          getAllEventsForDate={getAllEventsForDate}
          getAllEventsForTooltip={getAllEventsForTooltip}
          handleDayClick={handleDayClick}
          handleEventDrop={handleEventDrop}
        />
      )}
    </div>
  );
}
