import { t } from '@/i18n/config'
import { Item } from '@/items/models'
import { getDateString } from '@/lib/date-utils'
import { z } from 'zod'
import {
  getBaseFormFromModel,
  getBaseModelFromForm,
  getExistingItemModel,
  itemBaseFormSchema,
} from '../base/formSchema'
import { ItemTask, ItemTaskSchema } from './modelSchema'

export const itemTaskFormSchema = itemBaseFormSchema.extend({
  dueAt: z.string().min(1, { message: t('items:task.validation.dueAtRequired') }), // Form uses date string
  priority: ItemTaskSchema.shape.priority,
  isCompleted: ItemTaskSchema.shape.isCompleted,
})

export type ItemTaskForm = z.infer<typeof itemTaskFormSchema>

export const DEFAULT_ITEM_TASK_FORM: ItemTaskForm = {
  title: '',
  courseId: '',
  projectId: '',
  color: '#3b82f6',
  notes: '',
  tags: [],
  dueAt: '',
  priority: 'medium',
  isCompleted: false,
}

export type ItemFormFieldFlags = Partial<Record<keyof ItemTaskForm, boolean>>
export const DEFAULT_ITEM_TASK_HIDDEN: ItemFormFieldFlags = {
  color: true,
}
export const DEFAULT_ITEM_TASK_DISABLED: ItemFormFieldFlags = {}

export const taskModelToFormConverter = (item: Item): ItemTaskForm => {
  // TypeScript will narrow this to the task type
  if (item.type !== 'task') throw new Error('Invalid item type')
  return {
    ...getBaseFormFromModel(item),
    dueAt: getDateString(item.dueAt), // Now it's already a Date object
    priority: item.priority,
    isCompleted: item.isCompleted,
  }
}

export const taskFormToModelConverter = (form: ItemTaskForm, existingItem?: Item): ItemTask => {
  return {
    ...getBaseModelFromForm(form),
    type: 'task' as const,
    dueAt: new Date(`${form.dueAt}T00:00`),
    priority: form.priority,
    isCompleted: form.isCompleted,
    ...getExistingItemModel(existingItem),
  }
}
