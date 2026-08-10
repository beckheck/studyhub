import { z } from 'zod'
import { ItemEvent, ItemEventCompleteSchema } from './event/modelSchema'
import { ItemExam, ItemExamCompleteSchema } from './exam/modelSchema'
import { ItemTask, ItemTaskCompleteSchema } from './task/modelSchema'
import { ItemTimetable, ItemTimetableCompleteSchema } from './timetable/modelSchema'

// Create discriminated union
export type Item = ItemTask | ItemExam | ItemEvent | ItemTimetable
export type ItemType = Item['type']

export const itemTypeToSchemaMap: Record<ItemType, z.ZodTypeAny> = {
  task: ItemTaskCompleteSchema,
  exam: ItemExamCompleteSchema,
  event: ItemEventCompleteSchema,
  timetable: ItemTimetableCompleteSchema,
}

export const ITEM_TYPES = Object.keys(itemTypeToSchemaMap) as ItemType[]
