import { convertItemFormToModel, convertItemModelToForm, getDefaultItemFormForType, ItemForm } from '@/items/forms'
import { Item } from '@/items/models'
import { useItems, useGoogleCalendar } from '@/hooks/useStore'
import { useAppState } from '@/hooks/useStore'
import { SyncItemContext, googleCalendarSync } from '@/lib/google-calendar-sync'
import { useItemDialogState } from './useItemDialogState'

export type { ItemFormFieldFlags } from '@/items/forms'
export type { ItemDialogOptions } from './useItemDialogState'

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
  } = useItemDialogState()

  const { addItem, updateItem, deleteItem } = useItems()
  const { googleCalendar } = useGoogleCalendar()
  const appState = useAppState()

  const buildSyncCtx = (): SyncItemContext => ({
    accessToken: googleCalendar.accessToken ?? '',
    calendarId: googleCalendar.calendarId ?? '',
    syncEnabled: googleCalendar.syncEnabled,
    courses: Object.fromEntries(appState.courses.map(c => [c.id, c.title])),
    projects: Object.fromEntries(appState.projects.map(p => [p.id, p.title])),
  })

  const handleSave = (validatedData?: ItemForm) => {
    const dataToSave = validatedData || form
    handleSaveItem(dataToSave, editingItem)
    closeDialog()
  }

  const handleDelete = () => {
    if (editingItem) {
      handleDeleteItem(editingItem)
      closeDialog()
    }
  }

  const handleSaveItem = (formData: ItemForm, editingItem: Item | null) => {
    const item = convertItemFormToModel(itemType, formData, editingItem ?? undefined)
    let savedItem: Item
    if (editingItem) {
      savedItem = updateItem(editingItem.id, item) ?? item
    } else {
      savedItem = addItem(item)
    }
    syncItemToGoogle(savedItem).catch(console.error)
  }

  const syncItemToGoogle = async (item: Item) => {
    const ctx = buildSyncCtx()
    try {
      const result = await googleCalendarSync.syncItem(item, ctx)
      if (result.success && result.googleEventId) {
        updateItem(item.id, { googleCalendarEventId: result.googleEventId } as Partial<Item>)
      } else if (!result.success && !result.skipped) {
        console.error('Google Calendar sync failed:', result.error)
      }
    } catch (error) {
      console.error('Error syncing to Google Calendar:', error)
    }
  }

  const handleDeleteItem = (item: Item) => {
    deleteItem(item.id)

    const ctx = buildSyncCtx()
    googleCalendarSync
      .deleteItem(item, ctx)
      .catch(error => console.error('Error deleting from Google Calendar:', error))
  }

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
  }
}
