import { Item } from '../models'
import { ItemFormFieldFlags } from '../useItemDialog'

const formatDate = (date: Date) => {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface ItemStaticMethods {
  getForm(hidden: ItemFormFieldFlags, disabled: ItemFormFieldFlags): React.ReactNode
}

export abstract class ItemMethods {
  constructor(readonly item: Item) {}

  abstract getDate(): Date
  abstract getIcon(): React.ReactElement
  abstract getPriorityColorClass(): string
  abstract getMetadata(): React.ReactNode
  abstract getTypeColorClass(): string

  getItemDate() {
    const date = this.getDate()
    return date ? formatDate(date) : ''
  }
}
