import { ItemMethods, ItemStaticMethods } from './base/methods'
import { ItemEventMethods, ItemEventStaticMethods } from './event/methods'
import { ItemExamMethods, ItemExamStaticMethods } from './exam/methods'
import { ItemType, Item } from './models'
import { ItemTaskMethods, ItemTaskStaticMethods } from './task/methods'
import { ItemTimetableMethods, ItemTimetableStaticMethods } from './timetable/methods'

// Factory to get the appropriate ItemMethods instance
const itemMethods: Record<ItemType, new (item: Item) => ItemMethods> = {
  task: ItemTaskMethods,
  exam: ItemExamMethods,
  event: ItemEventMethods,
  timetable: ItemTimetableMethods,
}
export const getItemMethods = (item: Item): ItemMethods => {
  return new itemMethods[item.type](item)
}

// Factory to get the appropriate ItemStaticMethods
const itemStaticMethods: Record<ItemType, ItemStaticMethods> = {
  task: ItemTaskStaticMethods,
  exam: ItemExamStaticMethods,
  event: ItemEventStaticMethods,
  timetable: ItemTimetableStaticMethods,
}
export const getItemStaticMethods = (itemType: ItemType) => {
  return itemStaticMethods[itemType]
}
