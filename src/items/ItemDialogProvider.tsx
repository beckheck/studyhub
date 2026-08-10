import { ItemDialog } from '@/items/base/dialog';
import { useItemDialog as useItemDialogInternal, ItemFormFieldFlags } from '@/items/useItemDialog';
import { ItemDialogOptions } from '@/items/useItemDialogState';
import React, { createContext, useContext } from 'react';

export type { ItemFormFieldFlags, ItemDialogOptions };

type ItemDialogContextValue = ReturnType<typeof useItemDialogInternal>;

const ItemDialogContext = createContext<ItemDialogContextValue | undefined>(undefined);

interface ItemDialogProviderProps {
  children: React.ReactNode;
}

export function ItemDialogProvider({ children }: ItemDialogProviderProps) {
  const itemDialog = useItemDialogInternal();

  return (
    <ItemDialogContext.Provider value={itemDialog}>
      {children}
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
    </ItemDialogContext.Provider>
  );
}

export function useItemDialog() {
  const context = useContext(ItemDialogContext);
  if (!context) {
    throw new Error('useItemDialog must be used within an ItemDialogProvider');
  }
  return context;
}