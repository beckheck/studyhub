import {
  convertItemFormToModel,
  convertItemModelToForm,
  getDefaultItemFormForType,
  ItemForm,
} from '@/items/forms';
import { Item } from '@/items/models';
import { useItems, useGoogleCalendar } from '@/hooks/useStore';
import { useCourses } from '@/hooks/useStore';
import { useAppState } from '@/hooks/useStore';
import { googleCalendarSync } from '@/lib/google-calendar-sync';
import { useItemDialogState } from './useItemDialogState';

export type { ItemFormFieldFlags } from '@/items/forms';
export type { ItemDialogOptions } from './useItemDialogState';

export function useItemDialog() {
  const {
    open,
    editingItem,
    itemType,
    form,
    setForm,
    hidden,
    disabled,
    availableItemTypes,
    openAddDialog,
    openEditDialog,
    closeDialog,
    handleChangeItemType,
    onOpenChange,
  } = useItemDialogState();

  const { addItem, updateItem, deleteItem } = useItems();
  const { googleCalendar } = useGoogleCalendar();
  const appState = useAppState();
  const getCourseNameById = (courseId: string) => appState.courses.find(c => c.id === courseId)?.title;
  const getProjectNameById = (projectId: string) => appState.projects.find(p => p.id === projectId)?.title;

  const handleSave = (validatedData?: ItemForm) => {
    const dataToSave = validatedData || form;
    handleSaveItem(dataToSave, editingItem);
    closeDialog();
  };

  const handleDelete = () => {
    if (editingItem) {
      handleDeleteItem(editingItem);
      closeDialog();
    }
  };

  const handleSaveItem = (formData: ItemForm, editingItem: Item | null) => {
    const item = convertItemFormToModel(itemType, formData, editingItem);
    if (editingItem) {
      updateItem(editingItem.id, item);
      syncItemToGoogle(item, true);
    } else {
      addItem(item);
      syncItemToGoogle(item, false);
    }
  };

  const syncItemToGoogle = async (item: Item, isUpdate: boolean) => {
    console.log('syncItemToGoogle called:', { itemType: item.type, isUpdate, googleCalendarEnabled: googleCalendar.syncEnabled });

    // Only sync if Google Calendar is enabled
    if (!googleCalendar.syncEnabled) {
      console.log('Google Calendar sync not enabled');
      return;
    }

    if (!googleCalendar.accessToken) {
      console.log('No access token');
      return;
    }

    if (!googleCalendar.calendarId) {
      console.log('No calendar selected');
      return;
    }

    // Get course/project names for description
    const courseName = item.courseId ? getCourseNameById(item.courseId) : undefined;
    const projectName = item.projectId ? getProjectNameById(item.projectId) : undefined;

    try {
      console.log('Starting Google Calendar sync for', item.type + ':', item.title);

      let result;

      // Handle different item types
      if (item.type === 'event') {
        const event = item as typeof item & { type: 'event' };
        if (isUpdate && event.googleCalendarEventId) {
          result = await googleCalendarSync.updateEvent(event, googleCalendar.accessToken, googleCalendar.calendarId, courseName, projectName);
        } else {
          result = await googleCalendarSync.syncNewEvent(event, googleCalendar.accessToken, googleCalendar.calendarId, courseName, projectName);
          if (result.success && result.googleEventId) {
            event.googleCalendarEventId = result.googleEventId;
            updateItem(event.id, event);
          }
        }
      } else if (item.type === 'task') {
        const task = item as typeof item & { type: 'task' };
        if (isUpdate && task.googleCalendarEventId) {
          result = await googleCalendarSync.syncTaskToGoogle(task, googleCalendar.accessToken, googleCalendar.calendarId, true, courseName, projectName);
        } else {
          result = await googleCalendarSync.syncTaskToGoogle(task, googleCalendar.accessToken, googleCalendar.calendarId, false, courseName, projectName);
          if (result.success && result.googleEventId) {
            task.googleCalendarEventId = result.googleEventId;
            updateItem(task.id, task);
          }
        }
      } else if (item.type === 'exam') {
        const exam = item as typeof item & { type: 'exam' };
        if (isUpdate && exam.googleCalendarEventId) {
          result = await googleCalendarSync.syncExamToGoogle(exam, googleCalendar.accessToken, googleCalendar.calendarId, true, courseName, projectName);
        } else {
          result = await googleCalendarSync.syncExamToGoogle(exam, googleCalendar.accessToken, googleCalendar.calendarId, false, courseName, projectName);
          if (result.success && result.googleEventId) {
            exam.googleCalendarEventId = result.googleEventId;
            updateItem(exam.id, exam);
          }
        }
      }

      if (result && !result.success) {
        console.error('Google Calendar sync failed:', result.error);
      } else if (result) {
        console.log('Google Calendar sync successful');
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error);
    }
  };

  const handleDeleteItem = (item: Item) => {
    deleteItem(item.id);

    if (item.type === 'event' && googleCalendar.syncEnabled && googleCalendar.accessToken && googleCalendar.calendarId) {
      const event = item as typeof item & { type: 'event' };
      if (event.googleCalendarEventId) {
        googleCalendarSync.deleteEvent(event.googleCalendarEventId, googleCalendar.accessToken, googleCalendar.calendarId).catch(
          error => console.error('Error deleting from Google Calendar:', error)
        );
      }
    }
  };

  return {
    // State
    open,
    editingItem,
    itemType,
    form,
    setForm,
    hidden,
    disabled,
    availableItemTypes,

    // Actions
    openAddDialog,
    openEditDialog,
    closeDialog,
    handleSave,
    handleDelete,
    handleSaveItem,
    handleDeleteItem,
    handleChangeItemType,

    // Utilities
    getDefaultItemFormForType,
    convertItemModelToForm,

    // Dialog handlers
    onOpenChange,
  };
}
