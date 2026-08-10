import { ItemForm } from '@/items/forms'
import { Item } from '@/items/models'
import { ItemBaseSchema } from '@/items/base/modelSchema'
import type { Mask } from 'node_modules/zod/v4/core/util.cjs'
import { z } from 'zod'
import { ItemBase } from './modelSchema'

const OMITTED_ITEM_MODEL_PROPS = {
  id: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
} satisfies Mask<keyof ItemBase>

export const itemBaseFormSchema = ItemBaseSchema.omit(OMITTED_ITEM_MODEL_PROPS).extend({
  courseId: z.string().optional(), // Make optional for form (can be empty string)
  projectId: z.string().optional(),
})

export type ItemFormBase = z.infer<typeof itemBaseFormSchema>
// Extract properties omitted from base schema for reuse
export const getExistingItemModel = (
  existingItem?: ItemBase,
): Pick<ItemBase, keyof typeof OMITTED_ITEM_MODEL_PROPS> => {
  return (existingItem && {
    id: existingItem.id,
    isDeleted: existingItem.isDeleted,
    createdAt: existingItem.createdAt,
    updatedAt: new Date(),
  }) as Pick<ItemBase, keyof typeof OMITTED_ITEM_MODEL_PROPS>
}

export const getBaseFormFromModel = (item: Item): ItemFormBase => ({
  title: item.title,
  courseId: item.courseId,
  projectId: item.projectId,
  color: item.color || '#3b82f6',
  notes: item.notes || '',
  tags: item.tags || [],
})

export const getBaseModelFromForm = (form: ItemFormBase): Omit<ItemBase, keyof typeof OMITTED_ITEM_MODEL_PROPS> => ({
  title: form.title,
  courseId: form.courseId || undefined, // Convert empty string to undefined
  projectId: form.projectId || undefined,
  color: form.color,
  notes: form.notes || undefined,
  tags: form.tags && form.tags.length > 0 ? form.tags : undefined,
})

export const getItemFormBase = (form: ItemForm): ItemFormBase => {
  return {
    title: form.title,
    courseId: form.courseId,
    projectId: form.projectId,
    color: form.color,
    notes: form.notes,
    tags: form.tags,
  } satisfies Record<keyof ItemFormBase, any>
}
