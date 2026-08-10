import { browser } from 'wxt/browser'
import { isExtension } from '@/lib/browser-runtime-stub'
import { getNotificationTranslationAsync } from '@/lib/translation-utils'

export interface NotificationOptions {
  title: string
  message: string
  icon?: string
  requireInteraction?: boolean
  silent?: boolean
}

/**
 * Show OS notification that works in both web and extension contexts
 */
export async function showNotification(options: NotificationOptions): Promise<void> {
  try {
    if (isExtension) {
      // Use Chrome extension notifications API
      await showExtensionNotification(options)
    } else {
      // Use Web Notifications API
      await showWebNotification(options)
    }
  } catch (error) {
    console.error('Failed to show notification:', error)
  }
}

/**
 * Show notification using Chrome extension notifications API
 */
async function showExtensionNotification(options: NotificationOptions): Promise<void> {
  try {
    const notificationId = `timer-${Date.now()}`

    await browser.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: options.icon || '/hearticon.png',
      title: options.title,
      message: options.message,
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
    })

    // Auto-clear notification after 5 seconds unless requireInteraction is true
    if (!options.requireInteraction) {
      setTimeout(() => {
        browser.notifications.clear(notificationId).catch(() => {
          // Ignore errors if notification was already cleared
        })
      }, 5000)
    }
  } catch (error) {
    console.error('Extension notification failed:', error)
    // Fallback to web notification if extension API fails
    await showWebNotification(options)
  }
}

/**
 * Show notification using Web Notifications API
 */
async function showWebNotification(options: NotificationOptions): Promise<void> {
  // Check if notifications are supported
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications')
    return
  }

  // Request permission if not already granted
  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      console.warn('Notification permission denied')
      return
    }
  }

  if (Notification.permission !== 'granted') {
    console.warn('Notifications not permitted')
    return
  }

  // Create notification
  const notification = new Notification(options.title, {
    body: options.message,
    icon: options.icon || '/hearticon.png',
    requireInteraction: options.requireInteraction || false,
    silent: options.silent || false,
    tag: 'study-timer', // Replaces previous notifications with same tag
  })

  // Auto-close after 5 seconds unless requireInteraction is true
  if (!options.requireInteraction) {
    setTimeout(() => {
      notification.close()
    }, 5000)
  }

  // Handle click events
  notification.onclick = () => {
    window.focus()
    notification.close()
  }
}

/**
 * Check if notifications are available and permitted
 */
export async function checkNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (isExtension) {
    // In extensions, notifications permission is typically included in manifest
    return 'granted'
  }

  if (!('Notification' in window)) {
    return 'denied'
  }

  return Notification.permission
}

/**
 * Request notification permission (for web context)
 */
export async function requestNotificationPermission(): Promise<'granted' | 'denied' | 'default'> {
  if (isExtension) {
    return 'granted'
  }

  if (!('Notification' in window)) {
    return 'denied'
  }

  if (Notification.permission === 'default') {
    const permission = await Notification.requestPermission()

    // Show a welcome notification when permission is first granted
    if (permission === 'granted') {
      try {
        await showNotification({
          title: await getNotificationTranslationAsync('permission.enabled'),
          message: await getNotificationTranslationAsync('permission.enabledMessage'),
          icon: '/hearticon.png',
          requireInteraction: false,
          silent: false,
        })
      } catch (error) {
        console.error('Failed to show welcome notification:', error)
      }
    }

    return permission
  }

  return Notification.permission
}
