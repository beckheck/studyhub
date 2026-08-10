import { cn } from '@/lib/utils'
import { Check, ChevronDown } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'

export interface SimpleSelectOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

interface SimpleSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: SimpleSelectOption[]
  disabled?: boolean
  className?: string
}

export function SimpleSelect({
  value,
  onValueChange,
  placeholder = 'Select an option',
  options,
  disabled = false,
  className,
}: SimpleSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      triggerRef.current?.focus()
      // Don't stop propagation - let it bubble naturally
      return
    }

    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setIsOpen(!isOpen)
      return
    }

    if (e.key === 'ArrowDown' && !isOpen) {
      e.preventDefault()
      setIsOpen(true)
      return
    }
  }

  const handleOptionSelect = (optionValue: string) => {
    onValueChange?.(optionValue)
    setIsOpen(false)
    triggerRef.current?.focus()
  }

  const selectedOption = options.find(opt => opt.value === value)

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isOpen && 'ring-2 ring-ring ring-offset-2',
        )}
      >
        <span className={cn('line-clamp-1 text-left flex items-center', !selectedOption && 'text-muted-foreground')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={cn('h-4 w-4 opacity-50 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute top-full z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md',
            'animate-in fade-in-0 zoom-in-95',
          )}
        >
          <div className="max-h-60 overflow-auto p-1">
            {options.map(option => (
              <button
                key={option.value}
                type="button"
                disabled={option.disabled}
                onClick={() => !option.disabled && handleOptionSelect(option.value)}
                className={cn(
                  'relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                  'hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
                  value === option.value && 'bg-accent text-accent-foreground',
                  option.disabled &&
                    'opacity-80 cursor-not-allowed hover:bg-transparent hover:text-current focus:bg-transparent focus:text-current',
                )}
              >
                <span className="flex-1 text-left flex items-center">{option.label}</span>
                {value === option.value && <Check className="h-4 w-4 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
