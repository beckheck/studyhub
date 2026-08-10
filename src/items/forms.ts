import {
  DEFAULT_ITEM_EVENT_FORM,
  DEFAULT_ITEM_EVENT_HIDDEN,
  DEFAULT_ITEM_EVENT_DISABLED,
  eventFormToModelConverter,
  eventModelToFormConverter,
  ItemEventForm,
  itemEventFormSchema,
} from './event/formSchema'
import {
  DEFAULT_ITEM_EXAM_FORM,
  DEFAULT_ITEM_EXAM_HIDDEN,
  DEFAULT_ITEM_EXAM_DISABLED,
  examFormToModelConverter,
  examModelToFormConverter,
  ItemExamForm,
  itemExamFormSchema,
} from './exam/formSchema'
import { ItemType, Item } from './models'
import {
  DEFAULT_ITEM_TASK_FORM,
  DEFAULT_ITEM_TASK_HIDDEN,
  DEFAULT_ITEM_TASK_DISABLED,
  ItemTaskForm,
  itemTaskFormSchema,
  taskFormToModelConverter,
  taskModelToFormConverter,
} from './task/formSchema'
import {
  DEFAULT_ITEM_TIMETABLE_FORM,
  DEFAULT_ITEM_TIMETABLE_HIDDEN,
  DEFAULT_ITEM_TIMETABLE_DISABLED,
  ItemTimetableForm,
  itemTimetableFormSchema,
  timetableFormToModelConverter,
  timetableModelToFormConverter,
} from './timetable/formSchema'

////////////////////////////////////////////////////////////////////////////////////////
// Maps

// Export unified form type
export type ItemForm = ItemTaskForm | ItemExamForm | ItemEventForm | ItemTimetableForm

type AllFormFields = 'type' | keyof ItemTaskForm | keyof ItemExamForm | keyof ItemEventForm | keyof ItemTimetableForm

export type ItemFormFieldFlags = Partial<Record<AllFormFields, boolean>>

// Schema map for each item type
export const itemFormSchemaMap = {
  task: itemTaskFormSchema,
  exam: itemExamFormSchema,
  event: itemEventFormSchema,
  timetable: itemTimetableFormSchema,
}

// Default form map for each item type
export const defaultItemFormMap: Record<ItemType, ItemForm> = {
  task: { ...DEFAULT_ITEM_TASK_FORM },
  exam: { ...DEFAULT_ITEM_EXAM_FORM },
  event: { ...DEFAULT_ITEM_EVENT_FORM },
  timetable: { ...DEFAULT_ITEM_TIMETABLE_FORM },
}

export const defaultItemHiddenMap: Record<ItemType, ItemFormFieldFlags> = {
  task: { ...DEFAULT_ITEM_TASK_HIDDEN },
  exam: { ...DEFAULT_ITEM_EXAM_HIDDEN },
  event: { ...DEFAULT_ITEM_EVENT_HIDDEN },
  timetable: { ...DEFAULT_ITEM_TIMETABLE_HIDDEN },
}

export const defaultItemDisabledMap: Record<ItemType, ItemFormFieldFlags> = {
  task: { ...DEFAULT_ITEM_TASK_DISABLED },
  exam: { ...DEFAULT_ITEM_EXAM_DISABLED },
  event: { ...DEFAULT_ITEM_EVENT_DISABLED },
  timetable: { ...DEFAULT_ITEM_TIMETABLE_DISABLED },
}

// Converter map from model to form
export const itemModelToFormConverterMap: Record<ItemType, (item: Item) => ItemForm> = {
  task: taskModelToFormConverter,
  exam: examModelToFormConverter,
  event: eventModelToFormConverter,
  timetable: timetableModelToFormConverter,
}

// Converter map from form to model
export const itemFormToModelConverterMap: Record<ItemType, (form: ItemForm, existingItem?: Item) => Item> = {
  task: taskFormToModelConverter,
  exam: examFormToModelConverter,
  event: eventFormToModelConverter,
  timetable: timetableFormToModelConverter,
}

////////////////////////////////////////////////////////////////////////////////////////
// Helper Functions

// Get default form for a given item type
export const getDefaultItemFormForType = (type: ItemType): ItemForm => {
  return defaultItemFormMap[type] ? { ...defaultItemFormMap[type] } : { ...DEFAULT_ITEM_TASK_FORM }
}

// Convert existing item model to form
export const convertItemModelToForm = (item: Item): ItemForm => {
  const converter = itemModelToFormConverterMap[item.type]
  return converter ? converter(item) : { ...DEFAULT_ITEM_TASK_FORM }
}

// Generic converter function
export const convertItemFormToModel = <T extends ItemType>(type: T, form: ItemForm, existingItem?: Item): Item => {
  const converter = itemFormToModelConverterMap[type]
  return converter(form as any, existingItem)
}

// Helper function to create new item from form
export const createItemModelFromForm = <T extends ItemType>(
  type: T,
  form: ItemForm,
  generateId: () => string = () => crypto.randomUUID(),
): Item => {
  const partialItem = convertItemFormToModel(type, form)
  const now = new Date()

  return {
    ...partialItem,
    id: generateId(),
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  } as Item
}

// Helper function to update existing item from form
export const updateItemModelFromForm = <T extends ItemType>(type: T, form: ItemForm, existingItem: Item): Item => {
  const updatedItem = convertItemFormToModel(type, form, existingItem)

  return {
    ...existingItem,
    ...updatedItem,
    updatedAt: new Date(),
  } as Item
}
