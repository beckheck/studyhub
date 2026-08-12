import { convertItemFormToModel, convertItemModelToForm, getDefaultItemFormForType, ItemForm } from '@/items/forms'
import { Item } from '@/items/models'
import { useItemWrite } from '@/hooks/useItemWrite'
import { useItemDialogState } from './useItemDialogState'

export type { ItemFormFieldFlags } from '@/items/forms'
export type { ItemDialogOptions } from './useItemDialogState'

function stripSystemFields(item: Item): Omit<Item, 'id' | 'createdAt' | 'updatedAt'> {
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = item
  return rest as Omit<Item, 'id' | 'createdAt' | 'updatedAt'>
}

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

  const { saveItem, updateItemFields, deleteItem } = useItemWrite()

  const handleSave = (validatedData?: ItemForm) => {
    const dataToSave = validatedData || form
    const item = convertItemFormToModel(itemType, dataToSave, editingItem ?? undefined)
    if (editingItem) {
      updateItemFields(editingItem.id, stripSystemFields(item)).catch(error =>
        console.error('Error saving item:', error),
      )
    } else {
      saveItem(stripSystemFields(item)).catch(error => console.error('Error saving item:', error))
    }
    closeDialog()
  }

  const handleDelete = () => {
    if (editingItem) {
      deleteItem(editingItem).catch(error => console.error('Error deleting item:', error))
      closeDialog()
    }
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
    handleChangeItemType,

    // Utilities
    getDefaultItemFormForType,
    convertItemModelToForm,

    // Dialog handlers
    onOpenChange,
  }
}
