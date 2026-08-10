import { browser } from 'wxt/browser'
import i18n from '../i18n/config'

interface Site {
  domain: string
  path: string
}

const isExtension = !!browser?.runtime?.id

/**
 * Parse a location string into domain and path components
 */
function parseSite(site: string): Site {
  const [domain, ...path] = site.split('/')
  return {
    domain,
    path: path.join('/'),
  }
}

/**
 * Check if two domains match, supporting subdomain matching
 */
function doDomainsMatch(site: string, pattern: string): boolean {
  // Exact match
  if (site === pattern) {
    return true
  }

  const pos = site.length - pattern.length - 1

  // If the pattern is longer than the test domain, no match
  if (pos < 0) {
    return false
  }

  // Check if site domain ends with '.' + pattern
  return site.substr(pos) === '.' + pattern
}

/**
 * Check if two paths match, supporting prefix matching
 */
function doPathsMatch(site: string, pattern: string): boolean {
  // Empty pattern matches all paths
  if (!pattern) {
    return true
  }

  // Check if site path starts with the pattern
  return site.substring(0, pattern.length) === pattern
}

/**
 * Check if two locations match
 */
function doSitesMatch(site: Site, pattern: Site): boolean {
  return doDomainsMatch(site.domain, pattern.domain) && doPathsMatch(site.path, pattern.path)
}

/**
 * Clean up blocked sites by removing empty lines and trimming whitespace
 */
export function cleanSites(sites: string): string[] {
  return sites
    .split('\n')
    .map(site => site.trim())
    .filter(site => site.length > 0)
}

/**
 * Check if a location should be blocked based on the blocked sites and blocking strategy
 */
export function isSiteBlocked(
  url: string,
  sites: string,
  blockingStrategy: 'blacklist' | 'whitelist' | 'disabled' = 'disabled',
): boolean {
  try {
    // If blocking is disabled, never block
    if (blockingStrategy === 'disabled') {
      return false
    }

    // Parse URL to get domain and path
    const urlObj = new URL(url)
    const site = parseSite(urlObj.hostname + urlObj.pathname)

    // Check against each site in the list (use clean blocked sites)
    const cleanedSites = cleanSites(sites)
    let isInList = false

    for (const listedSite of cleanedSites) {
      const pattern = parseSite(listedSite)
      if (doSitesMatch(site, pattern)) {
        isInList = true
        break
      }
    }

    // Apply blocking strategy logic
    if (blockingStrategy === 'blacklist') {
      // Block if site is in the list
      return isInList
    } else if (blockingStrategy === 'whitelist') {
      // Block if site is NOT in the list
      return !isInList
    }

    return false
  } catch (error) {
    console.error('Failed to parse URL:', url, error)
    return false
  }
}

/**
 * Execute a script in a tab if the tab's URL should be blocked based on blocking strategy
 */
export async function enactSiteBlockingStrategyInTab(
  action: 'blockSite' | 'unblockSite',
  tab: any,
  sites: string,
  blockingStrategy: 'blacklist' | 'whitelist' | 'disabled' = 'disabled',
): Promise<void> {
  if (!isExtension || !tab.url) {
    return
  }

  try {
    if (isSiteBlocked(tab.url, sites, blockingStrategy)) {
      // Send message to content script with current language
      await browser.tabs.sendMessage(tab.id, {
        action,
        language: i18n.language || 'en', // Fallback to 'en' if language is not available
      })
    }
  } catch (error) {
    // Tab might be closed or content script not available - this is normal
    console.log(`Could not ${action} tab ${tab.id}:`, error.message)
  }
}

/**
 * Execute blocking/unblocking in all tabs that match the blocked sites based on blocking strategy
 */
export async function enactSiteBlockingStrategy(
  action: 'blockSite' | 'unblockSite',
  sites: string,
  blockingStrategy: 'blacklist' | 'whitelist' | 'disabled' = 'disabled',
): Promise<void> {
  if (!isExtension) {
    return
  }

  if (blockingStrategy === 'disabled') {
    return
  }

  try {
    // Add timeout to prevent hanging
    const windowsPromise = browser.windows.getAll({ populate: true })
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout getting browser windows')), 5000),
    )

    const windows = await Promise.race([windowsPromise, timeoutPromise])

    const tabs = windows
      .filter(window => window.tabs) // Only windows with tabs
      .flatMap(window => window.tabs!) // Flatten all tabs into a single array
      .filter(tab => tab.id !== null) // Only tabs with valid IDs
      .map(tab => enactSiteBlockingStrategyInTab(action, tab, sites, blockingStrategy))

    await Promise.allSettled(tabs)
  } catch (error) {
    console.error('[SiteBlocking] Error in enactBlockingStrategy:', error)
    throw error
  }
}
