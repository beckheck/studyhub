import {
  getBaseFormFromModel,
  getBaseModelFromForm,
  getExistingItemModel,
  itemBaseFormSchema,
} from '@/items/base/formSchema';
import { Item } from '@/items/models';
import { z } from 'zod';
import { ITEM_TIMETABLE_ACTIVITY_TYPES, ItemTimetable, ItemTimetableSchema, TIME_BLOCKS } from './modelSchema';

export const itemTimetableFormSchema = itemBaseFormSchema.extend({
  blockId: ItemTimetableSchema.shape.blockId,
  weekday: ItemTimetableSchema.shape.weekday,
  classroom: ItemTimetableSchema.shape.classroom,
  teacher: ItemTimetableSchema.shape.teacher,
  activityType: ItemTimetableSchema.shape.activityType,
});

export type ItemTimetableForm = z.infer<typeof itemTimetableFormSchema>;

export const DEFAULT_ITEM_TIMETABLE_FORM: ItemTimetableForm = {
  title: '',
  courseId: '',
  projectId: '',
  color: '#06b6d4',
  notes: '',
  tags: [],
  blockId: TIME_BLOCKS[0].id,
  weekday: 1, // Monday
  classroom: '',
  teacher: '',
  activityType: ITEM_TIMETABLE_ACTIVITY_TYPES[0],
};

export type ItemFormFieldFlags = Partial<Record<keyof ItemTimetableForm, boolean>>;
export const DEFAULT_ITEM_TIMETABLE_HIDDEN: ItemFormFieldFlags = { title: true };
export const DEFAULT_ITEM_TIMETABLE_DISABLED: ItemFormFieldFlags = {};

export const timetableModelToFormConverter = (item: Item): ItemTimetableForm => {
  if (item.type !== 'timetable') throw new Error('Invalid item type');
  return {
    ...getBaseFormFromModel(item),
    blockId: item.blockId,
    weekday: item.weekday,
    classroom: item.classroom,
    teacher: item.teacher,
    activityType: item.activityType,
  };
};

export const timetableFormToModelConverter = (form: ItemTimetableForm, existingItem?: Item): ItemTimetable => {
  return {
    ...getBaseModelFromForm(form),
    type: 'timetable' as const,
    blockId: form.blockId,
    weekday: form.weekday,
    classroom: form.classroom,
    teacher: form.teacher,
    activityType: form.activityType,
    ...getExistingItemModel(existingItem),
  };
};
