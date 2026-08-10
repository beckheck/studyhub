import { Timer } from 'lucide-react'
import { ItemMethods, ItemStaticMethods } from '../base/methods'
import { ItemFormFieldFlags } from '../useItemDialog'
import { TimetableForm } from './form'
import { ItemTimetable, ItemTimetableActivityType } from './modelSchema'

export class ItemTimetableMethods extends ItemMethods {
  constructor(readonly item: ItemTimetable) {
    super(item)
  }
  getDate() {
    return new Date() // Timetable items don't have a specific timestamp, so use current time
  }
  getIcon() {
    return <Timer className="w-4 h-4" />
  }
  getPriorityColorClass() {
    return 'border-l-8 border-l-blue-500'
  }
  getMetadata() {
    return null
  }
  getTypeColorClass() {
    const typeColors: Record<ItemTimetableActivityType, string> = {
      lecture: 'bg-violet-500',
      lab: 'bg-emerald-500',
      workshop: 'bg-amber-500',
      tutorial: 'bg-sky-500',
    }
    return typeColors[this.item.activityType] || 'bg-gray-500'
  }
}

export const ItemTimetableStaticMethods: ItemStaticMethods = {
  getForm(hidden: ItemFormFieldFlags, disabled: ItemFormFieldFlags): React.ReactNode {
    return <TimetableForm hidden={hidden} disabled={disabled} />
  },
}
