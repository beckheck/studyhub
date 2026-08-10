import { t } from '@/i18n/config'
import { z } from 'zod'
import { ItemBase, ItemBaseSchema } from '../base/modelSchema'

export const ItemExamSchema = z.object({
  type: z.literal('exam'),
  startsAt: z.date({ message: t('items:exam.validation.startsAtRequired') }),
  weight: z
    .number({ message: t('items:exam.validation.weightRequired') })
    .min(0, { message: t('items:exam.validation.weightMin') })
    .max(100, { message: t('items:exam.validation.weightMax') }),
  isCompleted: z.boolean({ message: t('items:exam.validation.isCompletedRequired') }),
  googleCalendarEventId: z.string().optional(),
})

export const ItemExamCompleteSchema = ItemBaseSchema.extend(ItemExamSchema.shape)
export type ItemExamSpecific = z.infer<typeof ItemExamSchema>
export type ItemExam = ItemBase & ItemExamSpecific
