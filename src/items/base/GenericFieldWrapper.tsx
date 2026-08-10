import { FormError } from '@/components/ui/form-error'
import { Controller, FieldPath, FieldValues, useFormContext } from 'react-hook-form'
import { z } from 'zod'
import { LabelWithRequiredIndicator, isFieldRequired } from './LabelWithRequiredIndicator'

export interface GenericFieldWrapperProps<T extends FieldValues = any> {
  /** The field name from the form schema */
  name: FieldPath<T>
  /** The schema to check for field requirements */
  schema: z.ZodSchema
  /** The label text to display */
  label: string
  /** Whether this field is hidden */
  hidden?: boolean
  /** Whether this field is disabled */
  disabled?: boolean
  /** Custom wrapper div className */
  wrapperClassName?: string
  /** Custom container div className for special layouts (e.g., flex for switches) */
  containerClassName?: string
  /** The form control component to render */
  children: (field: any, fieldValue: any) => React.ReactNode
}

/**
 * Generic field wrapper that handles common form field patterns:
 * - Hidden field check
 * - Label with required indicator
 * - Controller wrapper
 * - Error display
 * - Consistent styling
 */
export function GenericFieldWrapper<T extends FieldValues = any>({
  name,
  schema,
  label,
  hidden = false,
  wrapperClassName = '',
  containerClassName = '',
  children,
}: GenericFieldWrapperProps<T>) {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<T>()

  // Don't render if field is hidden
  if (hidden) return null

  const fieldValue = watch(name)
  const fieldError = errors[name]
  const isRequired = isFieldRequired(schema, name as string)

  return (
    <div className={wrapperClassName}>
      <LabelWithRequiredIndicator required={isRequired} value={fieldValue}>
        {label}
      </LabelWithRequiredIndicator>

      <Controller
        name={name}
        control={control}
        render={({ field }) => {
          const content = children(field, fieldValue)
          return containerClassName ? <div className={containerClassName}>{content}</div> : <>{content}</>
        }}
      />

      <FormError message={fieldError?.message as string} />
    </div>
  )
}

/**
 * Specialized wrapper for switch/toggle fields that need special layout
 */
export function SwitchFieldWrapper<T extends FieldValues = any>(
  props: Omit<GenericFieldWrapperProps<T>, 'containerClassName'>,
) {
  return (
    <GenericFieldWrapper {...props} wrapperClassName={props.wrapperClassName || 'flex items-center justify-between'} />
  )
}
