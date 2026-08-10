import '@/components/UglyCalendar.css';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCourses, useItems } from '@/hooks/useStore';
import { Item } from '@/items/models';
import { getTimetableInstancesBetween, ItemTimetable } from '@/items/timetable/modelSchema';
import { useItemDialog } from '@/items/ItemDialogProvider';
import { getItemsInRange, type CalendarEntry } from '@/lib/calendar-queries';
import { getDateString } from '@/lib/date-utils';
import { addDays, endOfMonth, endOfWeek, format, getDay, parse, startOfMonth, startOfWeek } from 'date-fns';
import { enUS } from 'date-fns/locale';
import { CalendarDays, Plus } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { Calendar, dateFnsLocalizer, View, Views } from 'react-big-calendar';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { useTranslation } from 'react-i18next';

// Set up the localizer for react-big-calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Event interface for react-big-calendar
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Item;
  allDay?: boolean;
  type: 'task' | 'exam' | 'event' | 'timetable';
}

// Map a CalendarEntry (from the shared query) to a react-big-calendar CalendarEvent.
// Applies the view's display filters: completed tasks and exams are hidden.
function entryToCalendarEvent(
  entry: CalendarEntry,
  t: (key: string) => string
): CalendarEvent[] {
  const { item, startsAt, endsAt, sequence } = entry;

  if (item.type === 'event') {
    const id = sequence ? `${item.id}-${sequence}` : item.id;
    return [{
      id,
      title: item.title || '',
      start: startsAt,
      end: endsAt || startsAt,
      resource: item as Item,
      allDay: (item as { isAllDay?: boolean }).isAllDay,
      type: 'event',
    }];
  }
  if (item.type === 'exam') {
    if ((item as { isCompleted: boolean }).isCompleted) return [];
    const endDate = new Date(startsAt.getTime() + 2 * 60 * 60 * 1000);
    return [{
      id: item.id,
      title: `${t('items:exam.title')}: ${item.title || ''}`,
      start: startsAt,
      end: endDate,
      resource: item as Item,
      allDay: false,
      type: 'exam',
    }];
  }
  if (item.type === 'task') {
    if ((item as { isCompleted: boolean }).isCompleted) return [];
    return [{
      id: item.id,
      title: `${t('items:task.title')}: ${item.title || ''}`,
      start: startsAt,
      end: startsAt,
      resource: item as Item,
      allDay: true,
      type: 'task',
    }];
  }
  return [];
}

// -----------------------------
// Ugly Calendar Planner
// -----------------------------

export default function UglyCalendarPlannerTab() {
  const { courses } = useCourses();
  const { items } = useItems();

  const { t } = useTranslation('common');

  const [showMultiDayEvents, setShowMultiDayEvents] = useState<boolean>(true);
  const [filterCourse, setFilterCourse] = useState<string>('all');
  const [view, setView] = useState<View>(Views.MONTH);
  const [date, setDate] = useState<Date>(new Date());

  const itemDialog = useItemDialog();

  // Helper function to get the visible date range based on current view and date
  const getVisibleDateRange = useCallback(() => {
    let rangeStart: Date;
    let rangeEnd: Date;

    switch (view) {
      case Views.WEEK:
        rangeStart = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
        rangeEnd = endOfWeek(date, { weekStartsOn: 1 });
        break;
      case Views.MONTH:
        // For month view, we need to include the full calendar grid (6 weeks)
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        rangeStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        rangeEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        break;
      case Views.AGENDA:
        // For agenda view, show current month + next month
        rangeStart = startOfMonth(date);
        rangeEnd = endOfMonth(addDays(date, 30));
        break;
      default:
        // Default to current month
        rangeStart = startOfMonth(date);
        rangeEnd = endOfMonth(date);
    }

    return { rangeStart, rangeEnd };
  }, [view, date]);

  // Convert items to calendar events
  const events = useMemo((): CalendarEvent[] => {
    const { rangeStart, rangeEnd } = getVisibleDateRange();

    // Use the shared query for events, tasks, and exams (with recurrence expansion).
    // Timetable items are expanded separately (different mechanism: weekday pattern + timezone).
    const entries = getItemsInRange([...items] as Item[], rangeStart, rangeEnd, {
      courseFilter: filterCourse,
    });

    const calendarEvents: CalendarEvent[] = entries.flatMap(entry => entryToCalendarEvent(entry, t));

    // Expand timetable items inline (not handled by the shared query)
    for (const item of items) {
      if (item.type !== 'timetable') continue;
      if (filterCourse !== 'all' && item.courseId !== filterCourse) continue;
      const course = courses.find(c => c.id === item.courseId);
      const courseName = course ? course.title : 'No Course';
      const instances = getTimetableInstancesBetween(item as ItemTimetable, rangeStart, rangeEnd, 'America/Santiago');
      for (const instance of instances) {
        calendarEvents.push({
          id: `${item.id}-${instance.startsAt.getTime()}`,
          title: `${item.title || ''}: ${courseName}`,
          start: instance.startsAt,
          end: instance.endsAt,
          resource: item as Item,
          allDay: false,
          type: 'timetable',
        });
      }
    }

    return calendarEvents;
  }, [items, filterCourse, courses, t, getVisibleDateRange]);

  // Handle slot selection (creating new events)
  const handleSelectSlot = useCallback(
    ({ start, end }: { start: Date; end: Date }) => {
      const startDateString = getDateString(start);
      const endDateString = getDateString(end);

      itemDialog.openAddDialog('event', {
        startsAt: startDateString,
        startsAtTime: format(start, 'HH:mm'),
        endsAt: endDateString,
        endsAtTime: format(end, 'HH:mm'),
        isAllDay: false,
      });
    },
    [itemDialog]
  );

  // Handle event selection
  const handleSelectEvent = useCallback(
    (event: CalendarEvent) => {
      itemDialog.openEditDialog(event.resource);
    },
    [itemDialog]
  );

  // Event style getter for different item types
  const eventStyleGetter = useCallback((event: CalendarEvent) => {
    let backgroundColor = '#3174ad';
    let borderColor = '#3174ad';

    if (event.resource.color) {
      backgroundColor = event.resource.color;
      borderColor = event.resource.color;
    } else {
      switch (event.type) {
        case 'exam':
          backgroundColor = '#dc2626'; // red
          borderColor = '#dc2626';
          break;
        case 'task':
          backgroundColor = '#059669'; // green
          borderColor = '#059669';
          break;
        case 'event':
          backgroundColor = '#2563eb'; // blue
          borderColor = '#2563eb';
          break;
        case 'timetable':
          backgroundColor = '#7c3aed'; // purple
          borderColor = '#7c3aed';
          break;
      }
    }

    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white',
        border: 'none',
        borderRadius: '4px',
      },
    };
  }, []);

  // Custom toolbar
  const CustomToolbar = ({ date, view, onNavigate, onView }: any) => {
    const goToBack = () => {
      if (view === Views.MONTH) {
        onNavigate('PREV');
      } else if (view === Views.WEEK) {
        onNavigate('PREV');
      } else {
        onNavigate('PREV');
      }
    };

    const goToNext = () => {
      if (view === Views.MONTH) {
        onNavigate('NEXT');
      } else if (view === Views.WEEK) {
        onNavigate('NEXT');
      } else {
        onNavigate('NEXT');
      }
    };

    const goToToday = () => onNavigate('TODAY');

    return (
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
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
            variant={view === Views.WEEK ? 'default' : 'outline'}
            onClick={() => onView(Views.WEEK)}
            className="rounded-xl"
          >
            {t('planner:views.week')}
          </Button>
          <Button
            variant={view === Views.MONTH ? 'default' : 'outline'}
            onClick={() => onView(Views.MONTH)}
            className="rounded-xl"
          >
            {t('planner:views.month')}
          </Button>
          <Button
            variant={view === Views.AGENDA ? 'default' : 'outline'}
            onClick={() => onView(Views.AGENDA)}
            className="rounded-xl"
          >
            {t('planner:views.agenda')}
          </Button>

          <div className="flex items-center gap-2 ml-2">
            <Button variant="outline" onClick={goToBack} className="rounded-xl">
              <CalendarDays className="w-4 h-4 mr-2" />
              {t('actions.previous')}
            </Button>
            <div className="font-medium px-4">{format(date, 'MMMM yyyy')}</div>
            <Button variant="outline" onClick={goToNext} className="rounded-xl">
              {t('actions.next')}
              <CalendarDays className="w-4 h-4 ml-2" />
            </Button>
            <Button variant="ghost" onClick={goToToday} className="rounded-xl">
              {t('actions.today')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
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
          <Button className="rounded-xl" onClick={() => itemDialog.openAddDialog('event')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('items:event.actions.add')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="h-[calc(100vh-8rem)]">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          components={{
            toolbar: CustomToolbar,
          }}
          step={30}
          timeslots={2}
          defaultView={Views.MONTH}
          views={[Views.MONTH, Views.WEEK, Views.AGENDA]}
          messages={{
            next: t('actions.next'),
            previous: t('actions.previous'),
            today: t('actions.today'),
            month: t('planner:views.month'),
            week: t('planner:views.week'),
            agenda: t('planner:views.agenda'),
            date: t('planner:labels.date'),
            time: t('planner:labels.time'),
            event: t('planner:labels.event'),
            noEventsInRange: t('planner:messages.noEventsInRange'),
            showMore: (total: number) => `+${total} ${t('planner:labels.more')}`,
          }}
        />
      </div>
    </div>
  );
}
