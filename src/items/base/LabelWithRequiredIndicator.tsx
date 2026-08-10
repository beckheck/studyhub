import { Label } from '@/components/ui/label'
import { z } from 'zod'

// Helper function to check if a field is required in the schema
export const isFieldRequired = (schema: z.ZodSchema, fieldName: string): boolean => {
  try {
    // Parse the schema definition to check if field is required
    if (schema instanceof z.ZodObject) {
      const shape = schema.shape
      if (shape[fieldName]) {
        const field = shape[fieldName]
        // Check if the field is optional
        return !field.isOptional()
      }
    }
    return false
  } catch {
    return false
  }
}

// Helper function to check if a value is empty
const isEmpty = (value: any): boolean => {
  if (value === null || value === undefined) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'number') return false // numbers are never considered empty for this purpose
  if (typeof value === 'boolean') return false // booleans are never considered empty
  return false
}

// Label component that shows asterisk for required fields that are empty
export const LabelWithRequiredIndicator = ({
  children,
  required,
  value,
  className = 'text-gray-700 dark:text-gray-300',
  ...props
}: {
  children: React.ReactNode
  required?: boolean
  value?: any
  className?: string
} & React.ComponentProps<typeof Label>) => {
  const shouldShowAsterisk = required && isEmpty(value)

  return (
    <Label className={className} {...props}>
      {children}
      {shouldShowAsterisk && <span className="text-red-500 ml-1">*</span>}
    </Label>
  )
}
