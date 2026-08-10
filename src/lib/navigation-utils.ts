import React from 'react'

/**
 * Utility functions for navigation handling
 */

/**
 * Handles click events for navigation links, allowing default behavior when modifier keys are pressed
 * and preventing default behavior otherwise.
 *
 * @param e - The mouse event
 * @param callback - Function to call when no modifier keys are pressed
 */
export function handleNavigationClick(e: React.MouseEvent<HTMLAnchorElement>, callback: () => void): void {
  // Allow default behavior (e.g. opening in new tab) when modifier keys are pressed
  if (e.metaKey || e.ctrlKey || e.shiftKey) {
    return
  }
  callback()
}
