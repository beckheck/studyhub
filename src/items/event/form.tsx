import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/simple-select'
import { Switch } from '@/components/ui/switch'
import { useLocalization } from '@/hooks/useLocalization'
import { t } from '@/i18n/config'
import { ItemFormFieldFlags } from '@/items/useItemDialog'
import { useFormContext, useWatch } from 'react-hook-form'
import { GenericFieldWrapper, SwitchFieldWrapper } from '../base/GenericFieldWrapper'
import { ItemEventForm, itemEventFormSchema } from './formSchema'

export interface EventFormProps {
  hidden: ItemFormFieldFlags
  disabled: ItemFormFieldFlags
}

export function EventForm({ hidden, disabled }: EventFormProps) {
  const { control } = useFormContext<ItemEventForm>()

  const isAllDay = useWatch({ control, name: 'isAllDay' })
  const hasRecurrence = useWatch({ control, name: 'hasRecurrence' })
  const recurrenceFrequency = useWatch({ control, name: 'recurrenceFrequency' })

  const { getShortDayNames } = useLocalization()

  const frequencies = ['daily', 'weekly', 'monthly', 'yearly']
  const frequencyOptions = frequencies.map(freq => ({
    value: freq,
    label: t(`items:event.frequency.${freq}`),
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <GenericFieldWrapper
          name="startsAt"
          schema={itemEventFormSchema}
          label={t('items:event.fields.startDate')}
          hidden={hidden.startsAt}
        >
          {field => <Input {...field} type="date" className="rounded-xl" disabled={disabled.startsAt} />}
        </GenericFieldWrapper>

        <GenericFieldWrapper
          name="endsAt"
          schema={itemEventFormSchema}
          label={t('items:event.fields.endDate')}
          hidden={hidden.endsAt}
        >
          {field => <Input {...field} type="date" className="rounded-xl" disabled={disabled.endsAt} />}
        </GenericFieldWrapper>
      </div>

      <SwitchFieldWrapper
        name="isAllDay"
        schema={itemEventFormSchema}
        label={t('items:event.fields.allDay')}
        hidden={hidden.isAllDay}
      >
        {field => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled.isAllDay} />}
      </SwitchFieldWrapper>

      {!isAllDay && (
        <div className="grid grid-cols-2 gap-3">
          <GenericFieldWrapper
            name="startsAtTime"
            schema={itemEventFormSchema}
            label={t('items:event.fields.startTime')}
            hidden={hidden.startsAtTime}
          >
            {field => <Input {...field} type="time" className="rounded-xl" disabled={disabled.startsAtTime} />}
          </GenericFieldWrapper>

          <GenericFieldWrapper
            name="endsAtTime"
            schema={itemEventFormSchema}
            label={t('items:event.fields.endTime')}
            hidden={hidden.endsAtTime}
          >
            {field => <Input {...field} type="time" className="rounded-xl" disabled={disabled.endsAtTime} />}
          </GenericFieldWrapper>
        </div>
      )}

      <GenericFieldWrapper
        name="location"
        schema={itemEventFormSchema}
        label={t('items:event.fields.location')}
        hidden={hidden.location}
      >
        {field => (
          <Input
            {...field}
            className="rounded-xl"
            placeholder={t('items:event.placeholders.location')}
            disabled={disabled.location}
          />
        )}
      </GenericFieldWrapper>

      <SwitchFieldWrapper
        name="hasRecurrence"
        schema={itemEventFormSchema}
        label={t('items:event.fields.recurring')}
        hidden={hidden.hasRecurrence}
      >
        {field => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled.hasRecurrence} />}
      </SwitchFieldWrapper>

      {hasRecurrence && (
        <div className="space-y-4 p-4 border border-gray-200 dark:border-gray-600 rounded-xl">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">{t('items:event.fields.recurrenceSettings')}</h4>

          <div className="grid grid-cols-2 gap-3">
            <GenericFieldWrapper
              name="recurrenceFrequency"
              schema={itemEventFormSchema}
              label={t('items:event.fields.frequency')}
              hidden={hidden.recurrenceFrequency}
            >
              {field => (
                <SimpleSelect
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={disabled.recurrenceFrequency}
                  className="rounded-xl"
                  options={frequencyOptions}
                />
              )}
            </GenericFieldWrapper>

            <GenericFieldWrapper
              name="recurrenceInterval"
              schema={itemEventFormSchema}
              label={t('items:event.fields.interval')}
              hidden={hidden.recurrenceInterval}
            >
              {field => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  className="rounded-xl"
                  disabled={disabled.recurrenceInterval}
                  onChange={e => field.onChange(Number(e.target.value))}
                />
              )}
            </GenericFieldWrapper>
          </div>

          {recurrenceFrequency === 'weekly' && !hidden.recurrenceByWeekday && (
            <GenericFieldWrapper
              name="recurrenceByWeekday"
              schema={itemEventFormSchema}
              label={t('items:event.fields.weekdays')}
              hidden={hidden.recurrenceByWeekday}
            >
              {(field, fieldValue) => {
                const selectedDays = fieldValue || []
                const shortDayNames = getShortDayNames()

                return (
                  <div className="flex gap-2 mt-1">
                    {shortDayNames.map((dayName, index) => {
                      const isSelected = selectedDays.includes(index)
                      return (
                        <button
                          key={index}
                          type="button"
                          disabled={disabled.recurrenceByWeekday}
                          className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                            isSelected
                              ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-200'
                              : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
                          } ${disabled.recurrenceByWeekday ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={() => {
                            const newSelectedDays = isSelected
                              ? selectedDays.filter((day: number) => day !== index)
                              : [...selectedDays, index]
                            field.onChange(newSelectedDays)
                          }}
                        >
                          {dayName}
                        </button>
                      )
                    })}
                  </div>
                )
              }}
            </GenericFieldWrapper>
          )}

          <div className="grid grid-cols-2 gap-3">
            <GenericFieldWrapper
              name="recurrenceCount"
              schema={itemEventFormSchema}
              label={t('items:event.fields.occurrences')}
              hidden={hidden.recurrenceCount}
            >
              {field => (
                <Input
                  {...field}
                  type="number"
                  min="1"
                  className="rounded-xl"
                  placeholder={t('items:event.placeholders.unlimited')}
                  disabled={disabled.recurrenceCount}
                  onChange={e => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                />
              )}
            </GenericFieldWrapper>

            <GenericFieldWrapper
              name="recurrenceUntil"
              schema={itemEventFormSchema}
              label={t('items:event.fields.untilDate')}
              hidden={hidden.recurrenceUntil}
            >
              {field => <Input {...field} type="date" className="rounded-xl" disabled={disabled.recurrenceUntil} />}
            </GenericFieldWrapper>
          </div>
        </div>
      )}
    </div>
  )
}
