import * as React from 'react'
import { Input } from './input'

interface DeferredInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onDeferredChange: (value: string) => void
  debounceMs?: number
}

const DeferredInput = React.forwardRef<HTMLInputElement, DeferredInputProps>(
  ({ value, onChange, onDeferredChange, debounceMs = 300, ...props }, ref) => {
    const [localValue, setLocalValue] = React.useState(value)
    const debounceRef = React.useRef<number | undefined>(undefined)

    // Update local value when external value changes
    React.useEffect(() => {
      setLocalValue(value)
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setLocalValue(newValue)

      // Call the optional onChange for immediate feedback
      onChange?.(e)

      // Debounce the deferred change
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = window.setTimeout(() => {
        onDeferredChange(newValue)
      }, debounceMs)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Immediately trigger deferred change on blur
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      onDeferredChange(e.target.value)
      props.onBlur?.(e)
    }

    return <Input {...props} ref={ref} value={localValue} onChange={handleChange} onBlur={handleBlur} />
  },
)

DeferredInput.displayName = 'DeferredInput'

export { DeferredInput }
