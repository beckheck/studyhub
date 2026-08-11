import { t } from '@/i18n/config'
import {
  getBaseFormFromModel,
  getBaseModelFromForm,
  getExistingItemModel,
  itemBaseFormSchema,
} from '@/items/base/formSchema'
import { Item } from '@/items/models'
import { getDateString } from '@/lib/date-utils'
import { z } from 'zod'
import { ItemEvent, ItemEventSchema } from './modelSchema'

export const itemEventFormSchema = itemBaseFormSchema.extend({
  startsAt: z.string().min(1, { message: t('items:event.validation.startsAtRequired') }), // Form uses date string
  startsAtTime: z.string().min(1, { message: t('items:event.validation.startsAtTimeRequired') }), // Separate time field for UI
  endsAt: z.string().optional(),
  endsAtTime: z.string().optional(),
  isAllDay: ItemEventSchema.shape.isAllDay,
  location: ItemEventSchema.shape.location,
  hasRecurrence: z.boolean(),
  recurrenceFrequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  recurrenceInterval: z
    .number()
    .min(1, { message: t('items:event.validation.intervalMin') })
    .optional(),
  recurrenceByWeekday: z.array(z.number().min(0).max(6)).optional(),
  recurrenceCount: z
    .number()
    .min(1, { message: t('items:event.validation.countMin') })
    .optional(),
  recurrenceUntil: z.string().optional(),
})

export type ItemEventForm = z.infer<typeof itemEventFormSchema>

export const DEFAULT_ITEM_EVENT_FORM: ItemEventForm = {
  title: '',
  courseId: '',
  projectId: '',
  color: '#8b5cf6',
  notes: '',
  tags: [],
  startsAt: '',
  startsAtTime: '10:00',
  endsAt: '',
  endsAtTime: '11:00',
  isAllDay: false,
  location: '',
  hasRecurrence: false,
  recurrenceFrequency: 'weekly',
  recurrenceInterval: 1,
  recurrenceByWeekday: [],
  recurrenceCount: undefined,
  recurrenceUntil: undefined,
}

export type ItemFormFieldFlags = Partial<Record<keyof ItemEventForm, boolean>>
export const DEFAULT_ITEM_EVENT_HIDDEN: ItemFormFieldFlags = {
  hasRecurrence: true,
}
export const DEFAULT_ITEM_EVENT_DISABLED: ItemFormFieldFlags = {}

export const eventModelToFormConverter = (item: Item): ItemEventForm => {
  if (item.type !== 'event') throw new Error('Invalid item type')
  const startsAtDate = item.startsAt
  const endsAtDate = item.endsAt
  return {
    ...getBaseFormFromModel(item),
    startsAt: getDateString(startsAtDate),
    startsAtTime: startsAtDate.toTimeString().split(' ')[0].slice(0, 5),
    endsAt: getDateString(endsAtDate),
    endsAtTime: endsAtDate.toTimeString().split(' ')[0].slice(0, 5),
    isAllDay: item.isAllDay,
    location: item.location || '',
    hasRecurrence: !!item.recurrence,
    recurrenceFrequency: item.recurrence?.frequency || 'weekly',
    recurrenceInterval: item.recurrence?.interval || 1,
    recurrenceByWeekday: item.recurrence?.byWeekday || [],
    recurrenceCount: item.recurrence?.count,
    recurrenceUntil: item.recurrence?.until ? getDateString(item.recurrence.until) : undefined,
  }
}

export const eventFormToModelConverter = (form: ItemEventForm, existingItem?: Item): ItemEvent => {
  // Combine date and time
  const startsAt = new Date(`${form.startsAt}T${form.startsAtTime}`)
  const endsAt =
    form.endsAt && form.endsAtTime
      ? new Date(`${form.endsAt}T${form.endsAtTime}`)
      : new Date(startsAt.getTime() + 60 * 60 * 1000) // Default to 1 hour after start if not provided

  // Build recurrence object if hasRecurrence is true
  const recurrence = form.hasRecurrence
    ? {
        frequency: form.recurrenceFrequency!,
        interval: form.recurrenceInterval!,
        ...(form.recurrenceByWeekday &&
          form.recurrenceByWeekday.length > 0 && {
            byWeekday: form.recurrenceByWeekday,
          }),
        ...(form.recurrenceCount && { count: form.recurrenceCount }),
        ...(form.recurrenceUntil && { until: new Date(`${form.recurrenceUntil}T00:00`) }),
      }
    : undefined

  return {
    ...getBaseModelFromForm(form),
    type: 'event' as const,
    startsAt,
    endsAt,
    isAllDay: form.isAllDay,
    location: form.location || undefined,
    recurrence,
    ...getExistingItemModel(existingItem),
  }
}
