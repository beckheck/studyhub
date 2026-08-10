import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/simple-select'
import { useLocalization } from '@/hooks/useLocalization'
import { ItemFormFieldFlags } from '@/items/useItemDialog'
import { GenericFieldWrapper } from '../base/GenericFieldWrapper'
import { itemTimetableFormSchema } from './formSchema'
import { ITEM_TIMETABLE_ACTIVITY_TYPES, TIME_BLOCKS } from './modelSchema'

export interface TimetableFormProps {
  hidden: ItemFormFieldFlags
  disabled: ItemFormFieldFlags
}

export function TimetableForm({ hidden, disabled }: TimetableFormProps) {
  const { getDayNames, t } = useLocalization()

  const weekdayOptions = getDayNames().map((dayName, index) => {
    // Convert Monday-first (from getDayNames) to Sunday-first indexing (0=Sunday)
    const dayValue = index === 6 ? 0 : index + 1
    return {
      value: dayValue.toString(),
      label: dayName,
    }
  })

  const activityTypeOptions = ITEM_TIMETABLE_ACTIVITY_TYPES.map(value => ({
    value,
    label: t(`items:timetable.activityTypes.${value}`),
  }))

  const timeBlockOptions = TIME_BLOCKS.map((block, index) => ({
    value: block.id,
    label: `${t('items:timetable.block')} ${index + 1} (${block.startsAt} - ${block.endsAt})`,
  }))

  return (
    <div className="space-y-4">
      <GenericFieldWrapper
        name="activityType"
        schema={itemTimetableFormSchema}
        label={t('items:timetable.fields.activityType')}
        hidden={hidden.activityType}
      >
        {field => (
          <SimpleSelect
            value={field.value}
            onValueChange={field.onChange}
            disabled={disabled.activityType}
            className="rounded-xl"
            options={activityTypeOptions}
          />
        )}
      </GenericFieldWrapper>

      <div className="grid grid-cols-2 gap-3">
        <GenericFieldWrapper
          name="weekday"
          schema={itemTimetableFormSchema}
          label={t('items:timetable.fields.weekday')}
          hidden={hidden.weekday}
        >
          {field => (
            <SimpleSelect
              value={field.value?.toString()}
              onValueChange={value => field.onChange(Number(value))}
              disabled={disabled.weekday}
              className="rounded-xl"
              options={weekdayOptions}
            />
          )}
        </GenericFieldWrapper>

        <GenericFieldWrapper
          name="blockId"
          schema={itemTimetableFormSchema}
          label={t('items:timetable.fields.timeBlock')}
          hidden={hidden.blockId}
        >
          {field => (
            <SimpleSelect
              value={field.value}
              onValueChange={field.onChange}
              disabled={disabled.blockId}
              className="rounded-xl"
              options={timeBlockOptions}
            />
          )}
        </GenericFieldWrapper>
      </div>

      <GenericFieldWrapper
        name="classroom"
        schema={itemTimetableFormSchema}
        label={t('items:timetable.fields.classroom')}
        hidden={hidden.classroom}
      >
        {field => (
          <Input
            {...field}
            className="rounded-xl"
            placeholder={t('items:timetable.placeholders.classroomExample')}
            disabled={disabled.classroom}
          />
        )}
      </GenericFieldWrapper>

      <GenericFieldWrapper
        name="teacher"
        schema={itemTimetableFormSchema}
        label={t('items:timetable.fields.teacher')}
        hidden={hidden.teacher}
      >
        {field => (
          <Input
            {...field}
            className="rounded-xl"
            placeholder={t('items:timetable.placeholders.teacherName')}
            disabled={disabled.teacher}
          />
        )}
      </GenericFieldWrapper>
    </div>
  )
}
