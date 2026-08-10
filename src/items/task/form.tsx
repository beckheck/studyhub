import { Input } from '@/components/ui/input'
import { SimpleSelect } from '@/components/ui/simple-select'
import { Switch } from '@/components/ui/switch'
import { t } from '@/i18n/config'
import { ItemFormFieldFlags } from '@/items/useItemDialog'
import { GenericFieldWrapper, SwitchFieldWrapper } from '../base/GenericFieldWrapper'
import { itemTaskFormSchema } from './formSchema'
import { getItemTaskPriorityEmoji } from './methods'
import { ITEM_TASK_PRIORITIES } from './modelSchema'

export interface TaskFormProps {
  hidden: ItemFormFieldFlags
  disabled: ItemFormFieldFlags
}

export function TaskForm({ hidden, disabled }: TaskFormProps) {
  const priorityOptions = ITEM_TASK_PRIORITIES.map(value => ({
    value,
    label: (
      <>
        {getItemTaskPriorityEmoji(value)} &nbsp;&nbsp;
        {t(`items:task.priority.${value}`)}
      </>
    ),
  }))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <GenericFieldWrapper
          name="dueAt"
          schema={itemTaskFormSchema}
          label={t('items:task.fields.dueDate')}
          hidden={hidden.dueAt}
        >
          {field => <Input {...field} type="date" className="rounded-xl" disabled={disabled.dueAt} />}
        </GenericFieldWrapper>

        <SwitchFieldWrapper
          name="isCompleted"
          schema={itemTaskFormSchema}
          label={t('items:task.fields.completed')}
          hidden={hidden.isCompleted}
        >
          {field => <Switch checked={field.value} onCheckedChange={field.onChange} disabled={disabled.isCompleted} />}
        </SwitchFieldWrapper>
      </div>

      <GenericFieldWrapper
        name="priority"
        schema={itemTaskFormSchema}
        label={t('items:task.fields.priority')}
        hidden={hidden.priority}
      >
        {field => (
          <SimpleSelect
            value={field.value}
            onValueChange={field.onChange}
            placeholder={t('items:task.fields.priority')}
            className="rounded-xl"
            disabled={disabled.priority}
            options={priorityOptions}
          />
        )}
      </GenericFieldWrapper>
    </div>
  )
}
