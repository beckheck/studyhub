import { t } from '@/i18n/config';
import { z } from 'zod';
import { ItemBase, ItemBaseSchema } from '../base/modelSchema';

export const EventRecurrenceSchema = z.object({
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
    message: t('items:event.validation.frequencyRequired'),
  }),
  interval: z
    .number({ message: t('items:event.validation.intervalRequired') })
    .min(1, { message: t('items:event.validation.intervalMin') }),
  byWeekday: z
    .array(
      z
        .number()
        .min(0, { message: t('items:event.validation.weekdayMin') })
        .max(6, { message: t('items:event.validation.weekdayMax') })
    )
    .optional(),
  count: z
    .number({ message: t('items:event.validation.countRequired') })
    .min(1, { message: t('items:event.validation.countMin') })
    .optional(),
  until: z.date({ message: t('items:event.validation.untilRequired') }).optional(),
});

export const ItemEventSchema = z
  .object({
    type: z.literal('event'),
    startsAt: z.date({ message: t('items:event.validation.startsAtRequired') }),
    endsAt: z.date({ message: t('items:event.validation.endsAtRequired') }),
    isAllDay: z.boolean({ message: t('items:event.validation.isAllDayRequired') }),
    recurrence: EventRecurrenceSchema.optional(),
    location: z.string().optional(),
    googleCalendarEventId: z.string().optional(),
    googleCalendarEventError: z.string().optional(),
  })
  .refine(data => data.endsAt > data.startsAt, {
    message: t('items:event.validation.endAfterStart'),
    path: ['endsAt'],
  });

export const ItemEventCompleteSchema = ItemBaseSchema.extend(ItemEventSchema.shape);
export type EventRecurrence = z.infer<typeof EventRecurrenceSchema>;
export type ItemEventSpecific = z.infer<typeof ItemEventSchema>;
export type ItemEvent = ItemBase & ItemEventSpecific;
