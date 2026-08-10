import { useAppContext } from '@/contexts/AppContext'
import { store } from '@/stores/app'
import { useCallback, useEffect, useState } from 'react'
import { useSnapshot } from 'valtio'

interface UseModeAwareTabOptions {
  validValues: string[]
  defaultValue: string
}

interface UseModeAwareTabReturn {
  activeTab: string
  setActiveTab: (value: string) => void
}

/**
 * Custom hook for mode-aware tab navigation with data persistence
 *
 * This hook manages the active tab state per application mode (popup, sidepanel, newtab, tab, etc.)
 * and persists the state using the data-transfer system. It also respects hash navigation when present
 * (e.g., when opened via expand button).
 *
 * @example
 * const { activeTab, setActiveTab } = useModeAwareTab({
 *   validValues: ['dashboard', 'planner', 'settings'],
 *   defaultValue: 'dashboard'
 * });
 *
 * @param options - Configuration object
 * @returns Object with current active tab and setter function
 */
export function useModeAwareTab({ validValues, defaultValue }: UseModeAwareTabOptions): UseModeAwareTabReturn {
  const { mode } = useAppContext()
  const snap = useSnapshot(store)

  // Helper function to get value from URL hash
  const getHashValue = useCallback((): string | null => {
    if (typeof window === 'undefined') return null
    const hashValue = window.location.hash.replace('#', '')

    // Handle subroutes (e.g., #settings/soundtrack -> settings)
    const parts = hashValue.split('/')
    const mainRoute = parts[0]

    if (mainRoute && validValues.includes(mainRoute)) {
      return mainRoute
    }

    return hashValue && validValues.includes(hashValue) ? hashValue : null
  }, [validValues])

  // State to track hash changes
  const [currentHashValue, setCurrentHashValue] = useState<string | null>(getHashValue)

  // Listen for hash changes (for expand button functionality)
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleHashChange = () => {
      setCurrentHashValue(getHashValue())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [getHashValue])

  // Get the persisted tab for this mode
  const persistedTab =
    snap.activeTabsByMode[mode] && validValues.includes(snap.activeTabsByMode[mode])
      ? snap.activeTabsByMode[mode]
      : defaultValue

  // Use hash navigation if present, otherwise use persisted tab
  const activeTab = currentHashValue || persistedTab

  // Setter function that validates the value and updates both hash and store
  const setActiveTab = useCallback(
    (value: string) => {
      if (validValues.includes(value)) {
        // Update persisted state
        store.activeTabsByMode[mode] = value

        // Update hash navigation
        // Check if there's an existing subroute for this tab
        const currentHash = window.location.hash.replace('#', '')
        const parts = currentHash.split('/')
        const mainRoute = parts[0]

        if (mainRoute !== value || parts.length === 1) {
          window.history.pushState(null, '', `#${value}`)
        }
        setCurrentHashValue(value)
      } else {
        console.warn(`useModeAwareTab: Invalid value "${value}". Valid values are: ${validValues.join(', ')}`)
      }
    },
    [validValues, mode],
  )

  return {
    activeTab,
    setActiveTab,
  }
}

export default useModeAwareTab
