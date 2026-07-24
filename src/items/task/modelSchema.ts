import { z } from 'zod';
import { t } from '@/i18n/config';
import { ItemBaseSchema, ItemBase } from '@/items/base/modelSchema';

export const ITEM_TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export const ItemTaskSchema = z.object({
  type: z.literal('task'),
  dueAt: z.date({ message: t('items:task.validation.dueAtRequired') }),
  priority: z.enum(ITEM_TASK_PRIORITIES, { message: t('items:task.validation.priorityRequired') }),
  isCompleted: z.boolean({ message: t('items:task.validation.isCompletedRequired') }),
  googleCalendarEventId: z.string().optional(),
});

export const ItemTaskCompleteSchema = ItemBaseSchema.extend(ItemTaskSchema.shape);
export type ItemTaskSpecific = z.infer<typeof ItemTaskSchema>;
export type ItemTask = ItemBase & ItemTaskSpecific;
export type ItemTaskPriority = ItemTask['priority'];
