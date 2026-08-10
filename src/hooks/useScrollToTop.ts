import { useCallback, useEffect, useState } from 'react'

interface UseScrollToTopOptions {
  /** The CSS selector for the scrollable container. Defaults to '.extension-container' */
  containerSelector?: string
  /** The scroll threshold in pixels to show the scroll to top button. Defaults to 100 */
  threshold?: number
  /** Whether to enable the scroll to top functionality. Defaults to true */
  enabled?: boolean
}

interface UseScrollToTopReturn {
  /** Whether to show the scroll to top button */
  showScrollToTop: boolean
  /** Function to scroll to the top of the container */
  scrollToTop: () => void
}

/**
 * Hook that provides scroll to top functionality with a visibility toggle
 * based on scroll position within a specified container.
 */
export function useScrollToTop(options: UseScrollToTopOptions = {}): UseScrollToTopReturn {
  const { containerSelector = '.extension-container', threshold = 100, enabled = true } = options

  const [showScrollToTop, setShowScrollToTop] = useState<boolean>(false)

  // Handle scroll to top functionality
  const scrollToTop = useCallback(() => {
    if (!enabled) return

    const container = document.querySelector(containerSelector)
    if (container) {
      container.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [containerSelector, enabled])

  // Show/hide scroll to top button based on scroll position
  useEffect(() => {
    if (!enabled) {
      setShowScrollToTop(false)
      return
    }

    const container = document.querySelector(containerSelector)
    if (!container) return

    const handleScroll = () => {
      setShowScrollToTop(container.scrollTop > threshold)
    }

    // Add scroll listener to the container
    container.addEventListener('scroll', handleScroll, { passive: true })

    // Initial state check
    if (container.scrollTop > threshold) {
      setShowScrollToTop(true)
    }

    return () => {
      container.removeEventListener('scroll', handleScroll)
    }
  }, [containerSelector, threshold, enabled])

  return {
    showScrollToTop,
    scrollToTop,
  }
}
