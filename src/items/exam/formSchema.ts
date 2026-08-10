import { t } from '@/i18n/config'
import {
  getBaseFormFromModel,
  getBaseModelFromForm,
  getExistingItemModel,
  itemBaseFormSchema,
} from '@/items/base/formSchema'
import { Item } from '@/items/models'
import { z } from 'zod'
import { ItemExam, ItemExamSchema } from './modelSchema'

export const itemExamFormSchema = itemBaseFormSchema.extend({
  startsAt: z.string().min(1, { message: t('items:exam.validation.startsAtRequired') }), // Form uses date string
  startsAtTime: z.string().min(1, { message: t('items:exam.validation.startsAtTimeRequired') }), // Separate time field for UI
  weight: ItemExamSchema.shape.weight,
  isCompleted: ItemExamSchema.shape.isCompleted,
})

export type ItemExamForm = z.infer<typeof itemExamFormSchema>

export const DEFAULT_ITEM_EXAM_FORM: ItemExamForm = {
  title: '',
  courseId: '',
  projectId: '',
  color: '#ef4444',
  notes: '',
  tags: [],
  startsAt: '',
  startsAtTime: '09:00',
  weight: 20,
  isCompleted: false,
}

export type ItemFormFieldFlags = Partial<Record<keyof ItemExamForm, boolean>>
export const DEFAULT_ITEM_EXAM_HIDDEN: ItemFormFieldFlags = {}
export const DEFAULT_ITEM_EXAM_DISABLED: ItemFormFieldFlags = {}

export const examModelToFormConverter = (item: Item): ItemExamForm => {
  if (item.type !== 'exam') throw new Error('Invalid item type')
  const startsAtDate = item.startsAt
  return {
    ...getBaseFormFromModel(item),
    startsAt: startsAtDate.toISOString().split('T')[0],
    startsAtTime: startsAtDate.toTimeString().split(' ')[0].slice(0, 5),
    weight: item.weight,
    isCompleted: item.isCompleted,
  }
}

export const examFormToModelConverter = (form: ItemExamForm, existingItem?: Item): ItemExam => {
  // Combine date and time
  const startsAt = new Date(`${form.startsAt}T${form.startsAtTime}`)

  return {
    ...getBaseModelFromForm(form),
    type: 'exam' as const,
    startsAt,
    weight: form.weight,
    isCompleted: form.isCompleted,
    ...getExistingItemModel(existingItem),
  }
}
