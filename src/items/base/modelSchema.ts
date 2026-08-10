import { t } from '@/i18n/config'
import { z } from 'zod'

export const ItemBaseSchema = z.object({
  id: z.string({ message: t('items:common.validation.idRequired') }),
  title: z.string().optional(),
  // title: z
  //   .string({ message: t('items:common.validation.titleRequired') })
  //   .min(1, { message: t('items:common.validation.titleMinLength') }),
  courseId: z.string().optional(),
  projectId: z.string().optional(),
  color: z.string().optional(),
  notes: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isDeleted: z.boolean({ message: t('items:common.validation.isDeletedRequired') }),
  createdAt: z.date({ message: t('items:common.validation.createdAtRequired') }),
  updatedAt: z.date({ message: t('items:common.validation.updatedAtRequired') }),
})

export type ItemBase = z.infer<typeof ItemBaseSchema>
