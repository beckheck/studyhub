import { Button } from '@/components/ui/button';
import { Item } from '@/items/models';
import { useItemDialog } from '@/items/ItemDialogProvider';
import { ITEM_TIMETABLE_ACTIVITY_TYPES, TIME_BLOCKS } from './timetable/modelSchema';

export function ItemDialogExample() {
  const itemDialog = useItemDialog();

  // Sample data for edit examples
  const sampleTask: Item = {
    id: 'sample-task-1',
    title: 'Complete React Assignment',
    courseId: 'cs101',
    color: '#3b82f6',
    notes: 'Focus on hooks and state management',
    tags: ['urgent', 'react'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 86400000), // 1 day ago
    updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
    type: 'task',
    dueAt: new Date(Date.now() + 172800000), // 2 days from now
    priority: 'high',
    isCompleted: false,
  };

  const sampleExam: Item = {
    id: 'sample-exam-1',
    title: 'Database Systems Final',
    courseId: 'cs201',
    color: '#ef4444',
    notes: 'Covers SQL, normalization, and indexing',
    tags: ['final', 'database'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 604800000), // 1 week ago
    updatedAt: new Date(Date.now() - 7200000), // 2 hours ago
    type: 'exam',
    startsAt: new Date(Date.now() + 604800000), // 1 week from now
    weight: 40,
    isCompleted: false,
  };

  const sampleEvent: Item = {
    id: 'sample-event-1',
    title: 'Project Team Meeting',
    courseId: 'cs301',
    color: '#10b981',
    notes: 'Discuss project requirements and timeline',
    tags: ['meeting', 'project'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 259200000), // 3 days ago
    updatedAt: new Date(Date.now() - 1800000), // 30 minutes ago
    type: 'event',
    startsAt: new Date(Date.now() + 86400000), // 1 day from now
    endsAt: new Date(Date.now() + 90000000), // 1 day + 1 hour from now
    isAllDay: false,
    location: 'Library Conference Room A',
    recurrence: {
      frequency: 'weekly',
      interval: 1,
      byWeekday: [1], // Monday
      count: 10,
    },
  };

  const sampleTimetable: Item = {
    id: 'sample-timetable-1',
    title: 'Data Structures Lecture',
    courseId: 'cs202',
    color: '#8b5cf6',
    notes: 'Trees and graph algorithms',
    tags: [ITEM_TIMETABLE_ACTIVITY_TYPES[0], 'algorithms'],
    isDeleted: false,
    createdAt: new Date(Date.now() - 1209600000), // 2 weeks ago
    updatedAt: new Date(Date.now() - 3600000), // 1 hour ago
    type: 'timetable',
    blockId: TIME_BLOCKS[1].id,
    weekday: 2, // Tuesday
    classroom: 'Engineering Building 205',
    teacher: 'Dr. Johnson',
    activityType: ITEM_TIMETABLE_ACTIVITY_TYPES[0],
  };

  // Add dialog handlers
  const handleAddTaskDialog = () => {
    itemDialog.openAddDialog('task', {
      title: 'Complete assignment',
      courseId: '',
      priority: 'medium',
    });
  };

  const handleAddExamDialog = () => {
    itemDialog.openAddDialog('exam', {
      title: 'Midterm Exam',
      courseId: '',
      weight: 30,
    });
  };

  const handleAddEventDialog = () => {
    itemDialog.openAddDialog('event', {
      title: 'Study Group Meeting',
      courseId: '',
      location: 'Library Room 101',
      isAllDay: false,
    });
  };

  const handleAddTimetableDialog = () => {
    itemDialog.openAddDialog('timetable', {
      title: 'Advanced Mathematics',
      courseId: '',
      blockId: TIME_BLOCKS[0].id,
      weekday: 1, // Monday
      classroom: 'Room 205',
      teacher: 'Prof. Smith',
      activityType: ITEM_TIMETABLE_ACTIVITY_TYPES[0],
    });
  };

  // Edit dialog handlers
  const handleEditTaskDialog = () => {
    itemDialog.openEditDialog(sampleTask);
  };

  const handleEditExamDialog = () => {
    itemDialog.openEditDialog(sampleExam);
  };

  const handleEditEventDialog = () => {
    itemDialog.openEditDialog(sampleEvent);
  };

  const handleEditTimetableDialog = () => {
    itemDialog.openEditDialog(sampleTimetable);
  };

  return (
    <div className="space-y-6 p-4">
      <h2 className="text-2xl font-bold">Item Dialog Examples</h2>

      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2">Add New Items</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={handleAddTaskDialog} className="rounded-xl">
              Add Task
            </Button>

            <Button onClick={handleAddExamDialog} className="rounded-xl">
              Add Exam
            </Button>

            <Button onClick={handleAddEventDialog} className="rounded-xl">
              Add Event
            </Button>

            <Button onClick={handleAddTimetableDialog} className="rounded-xl">
              Add Timetable
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Edit Existing Items</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={handleEditTaskDialog} className="rounded-xl" variant="outline">
              Edit Sample Task
            </Button>

            <Button onClick={handleEditExamDialog} className="rounded-xl" variant="outline">
              Edit Sample Exam
            </Button>

            <Button onClick={handleEditEventDialog} className="rounded-xl" variant="outline">
              Edit Sample Event
            </Button>

            <Button onClick={handleEditTimetableDialog} className="rounded-xl" variant="outline">
              Edit Sample Timetable
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-2">Type Change Examples</h3>
          <p className="text-sm text-gray-600 mb-4">
            These examples show how to enable type changes in the dialog. Common fields like title and notes are
            preserved when changing types.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              onClick={() =>
                itemDialog.openAddDialog('task', {
                  title: 'Sample Item',
                  courseId: 'cs101',
                  notes: 'This item can change type',
                })
              }
              className="rounded-xl"
              variant="secondary"
            >
              Add with Type Change
            </Button>

            <Button onClick={() => itemDialog.openEditDialog(sampleTask)} className="rounded-xl" variant="secondary">
              Edit Task (Changeable)
            </Button>

            <Button onClick={() => itemDialog.openEditDialog(sampleExam)} className="rounded-xl" variant="secondary">
              Edit Exam (Changeable)
            </Button>

            <Button
              onClick={() =>
                itemDialog.openEditDialog(sampleEvent, {
                  availableItemTypes: ['event', 'task'],
                })
              }
              className="rounded-xl"
              variant="secondary"
            >
              Edit Event (Changeable)
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
