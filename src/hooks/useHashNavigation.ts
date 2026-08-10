import { useCallback, useEffect, useState } from 'react'

interface UseHashNavigationOptions {
  validValues: string[]
  defaultValue: string
  useHistory?: boolean // Whether to use pushState (true) or replaceState (false)
}

interface UseHashNavigationReturn {
  currentValue: string
  setValue: (value: string) => void
}

/**
 * Custom hook for URL hash-based navigation
 *
 * @example
 * // Basic usage for tab navigation
 * const { currentValue: activeTab, setValue: setActiveTab } = useHashNavigation({
 *   validValues: ['home', 'about', 'contact'],
 *   defaultValue: 'home'
 * });
 *
 * @example
 * // With browser history (creates history entries)
 * const { currentValue: currentPage, setValue: setCurrentPage } = useHashNavigation({
 *   validValues: ['page1', 'page2', 'page3'],
 *   defaultValue: 'page1',
 *   useHistory: true
 * });
 *
 * @param options - Configuration object
 * @returns Object with current value and setter function
 */
export function useHashNavigation({
  validValues,
  defaultValue,
  useHistory = false,
}: UseHashNavigationOptions): UseHashNavigationReturn {
  // Helper function to get initial value from URL hash
  const getInitialValue = useCallback((): string => {
    if (typeof window === 'undefined') return defaultValue

    const hashValue = window.location.hash.replace('#', '')

    if (hashValue && validValues.includes(hashValue)) {
      return hashValue
    }
    return defaultValue
  }, [validValues, defaultValue])

  // State initialized from URL hash
  const [currentValue, setCurrentValue] = useState<string>(getInitialValue)

  // Update URL hash when value changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentHash = window.location.hash.replace('#', '')
    if (currentHash !== currentValue) {
      const method = useHistory ? 'pushState' : 'replaceState'
      window.history[method](null, '', `#${currentValue}`)
    }
  }, [currentValue, useHistory])

  // Handle browser back/forward navigation
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleHashChange = () => {
      const hashValue = window.location.hash.replace('#', '')

      if (hashValue && validValues.includes(hashValue)) {
        setCurrentValue(hashValue)
      } else if (!hashValue) {
        setCurrentValue(defaultValue)
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [validValues, defaultValue])

  // Setter function that validates the value
  const setValue = useCallback(
    (value: string) => {
      if (validValues.includes(value)) {
        setCurrentValue(value)
      } else {
        console.warn(`useHashNavigation: Invalid value "${value}". Valid values are: ${validValues.join(', ')}`)
      }
    },
    [validValues],
  )

  return {
    currentValue,
    setValue,
  }
}

export default useHashNavigation
