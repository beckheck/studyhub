import i18n from '../i18n/config'

/**
 * Ensure i18n is initialized before using it
 */
async function ensureI18nReady(): Promise<void> {
  if (i18n.isInitialized) {
    return Promise.resolve(void 0)
  }
  return new Promise(resolve => {
    i18n.on('initialized', () => {
      resolve(void 0)
    })
  })
}

/**
 * Get translated text for use in non-React contexts (like background scripts, utils, etc.)
 * This function can be used outside of React components where useTranslation hook is not available
 */
export function getTranslation(key: string, options?: { ns?: string; [key: string]: any }): string {
  try {
    // Ensure i18n is initialized
    if (!i18n.isInitialized) {
      console.warn('i18n not initialized yet, using fallback for key:', key)
      return key
    }

    const namespace = options?.ns || 'common'
    const result = i18n.t(key, {
      ns: namespace,
      ...options,
    })

    // Log current language for debugging (remove in production)
    // console.log(`Translation requested: ${key} | Namespace: ${namespace} | Language: ${i18n.language} | Result: ${result}`);

    // If the translation returns the key (meaning it wasn't found), log it
    if (result === key) {
      console.warn(`Translation not found: ${key} in namespace ${namespace} for language ${i18n.language}`)
    }

    return result
  } catch (error) {
    console.error('Translation error:', error)
    // Return the key as fallback
    return key
  }
}

/**
 * Get notification translations specifically
 */
export function getNotificationTranslation(key: string, interpolation?: Record<string, any>): string {
  return getTranslation(`notifications.${key}`, interpolation)
}

/**
 * Async version of getNotificationTranslation
 */
export async function getNotificationTranslationAsync(
  key: string,
  interpolation?: Record<string, any>,
): Promise<string> {
  await ensureI18nReady()
  return getTranslation(`notifications.${key}`, interpolation)
}
