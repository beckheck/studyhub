import { Calendar } from 'lucide-react'
import { ItemMethods, ItemStaticMethods } from '../base/methods'
import { ItemFormFieldFlags } from '../useItemDialog'
import { EventForm } from './form'
import { ItemEvent } from './modelSchema'

export class ItemEventMethods extends ItemMethods {
  constructor(readonly item: ItemEvent) {
    super(item)
  }
  getDate() {
    return this.item.startsAt
  }
  getIcon() {
    return <Calendar className="w-4 h-4" />
  }
  getPriorityColorClass() {
    return 'border-l-8 border-l-blue-500'
  }
  getMetadata() {
    return null
  }
  getTypeColorClass() {
    return 'bg-indigo-500'
  }
}

export const ItemEventStaticMethods: ItemStaticMethods = {
  getForm(hidden: ItemFormFieldFlags, disabled: ItemFormFieldFlags): React.ReactNode {
    return <EventForm hidden={hidden} disabled={disabled} />
  },
}
