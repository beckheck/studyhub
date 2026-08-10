import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { t } from '@/i18n/config'
import { ItemFormFieldFlags } from '@/items/useItemDialog'
import { GenericFieldWrapper, SwitchFieldWrapper } from '../base/GenericFieldWrapper'
import { itemExamFormSchema } from './formSchema'

export interface ExamFormProps {
  hidden: ItemFormFieldFlags
  disabled: ItemFormFieldFlags
}

export function ExamForm({ hidden, disabled }: ExamFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <GenericFieldWrapper
          name="startsAt"
          schema={itemExamFormSchema}
          label={t('items:exam.fields.date')}
          hidden={hidden.startsAt}
        >
          {field => <Input {...field} type="date" className="rounded-xl" disabled={disabled.startsAt} />}
        </GenericFieldWrapper>

        <GenericFieldWrapper
          name="startsAtTime"
          schema={itemExamFormSchema}
          label={t('items:exam.fields.time')}
          hidden={hidden.startsAtTime}
        >
          {field => <Input {...field} type="time" className="rounded-xl" disabled={disabled.startsAtTime} />}
        </GenericFieldWrapper>
      </div>

      <GenericFieldWrapper
        name="weight"
        schema={itemExamFormSchema}
        label={`${t('items:exam.fields.weight')}`}
        hidden={hidden.weight}
      >
        {field => (
          <Input
            {...field}
            type="number"
            step="any"
            min="0"
            max="100"
            disabled={disabled.weight}
            onChange={e => field.onChange(Number(e.target.value))}
          />
        )}
      </GenericFieldWrapper>

      <SwitchFieldWrapper
        name="isCompleted"
        schema={itemExamFormSchema}
        label={t('items:exam.fields.completed')}
        hidden={hidden.isCompleted}
      >
        {field => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled.isCompleted} />}
      </SwitchFieldWrapper>
    </div>
  )
}
