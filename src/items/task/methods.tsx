import { t } from '@/i18n/config'
import { Clock } from 'lucide-react'
import { ItemMethods, ItemStaticMethods } from '../base/methods'
import { ItemFormFieldFlags } from '../useItemDialog'
import { TaskForm } from './form'
import { ItemTask, ItemTaskPriority } from './modelSchema'

export class ItemTaskMethods extends ItemMethods {
  constructor(readonly item: ItemTask) {
    super(item)
  }
  getDate() {
    return this.item.dueAt
  }
  getIcon() {
    return <Clock className="w-4 h-4" />
  }
  getPriorityColorClass() {
    const priorityColorMap: Record<string, string> = {
      high: 'border-l-8 border-l-red-500',
      medium: 'border-l-8 border-l-yellow-500',
      low: 'border-l-8 border-l-green-500',
    }
    return priorityColorMap[this.item.priority] || 'border-l-8 border-l-gray-300'
  }
  getMetadata() {
    return (
      <div className="text-xs capitalize">
        {(this.item as any).priority === 'medium'
          ? t('items:task.priority.medium')
          : t(`items:task.priority.${this.item.priority}`)}
      </div>
    )
  }
  getTypeColorClass() {
    return 'bg-amber-500'
  }
}

export const ItemTaskStaticMethods: ItemStaticMethods = {
  getForm(hidden: ItemFormFieldFlags, disabled: ItemFormFieldFlags): React.ReactNode {
    return <TaskForm hidden={hidden} disabled={disabled} />
  },
}

const PRIORITY_EMOJIS: Record<ItemTaskPriority, string> = { low: '🟡', medium: '🟠', high: '🔴' }

export const getItemTaskPriorityEmoji = (priority: ItemTaskPriority): string => {
  return PRIORITY_EMOJIS[priority] || PRIORITY_EMOJIS['medium']
}

export const getItemTaskPriorityColor = (priority: ItemTaskPriority): string => {
  switch (priority) {
    case 'high':
      return '#ef4444' // red-500
    case 'medium':
      return '#f97316' // orange-500
    case 'low':
      return '#eab308' // yellow-500
    default:
      return '#f97316' // default to orange
  }
}
