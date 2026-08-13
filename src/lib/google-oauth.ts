import { browser } from 'wxt/browser'
import { isExtension } from '@/lib/browser-runtime-stub'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

export interface GoogleOAuthState {
  accessToken: string
  expiresAt: number
}

interface GisTokenResponse {
  access_token?: string
  expires_in: number
  token_type: string
  scope?: string
  error?: string
  error_description?: string
}

interface GisTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string; scope?: string }): void
}

interface GisTokenClientConfig {
  client_id: string
  scope: string
  callback: (response: GisTokenResponse) => void
  error_callback?: (response: { type: string }) => void
  prompt?: string
}

interface GoogleAccountsOauth2 {
  initTokenClient(config: GisTokenClientConfig): GisTokenClient
  revoke(accessToken: string, done?: (response: { successful: boolean; error?: string }) => void): void
}

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client'

function getGoogleAccounts(): GoogleAccountsOauth2 | null {
  return (window as any).google?.accounts?.oauth2 ?? null
}

function loadGisScript(): Promise<void> {
  const existing = getGoogleAccounts()
  if (existing) return Promise.resolve()

  const scriptAlreadyPresent = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`)
  if (scriptAlreadyPresent) {
    return new Promise(resolve => {
      const check = setInterval(() => {
        if (getGoogleAccounts()) {
          clearInterval(check)
          resolve()
        }
      }, 50)
    })
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = GIS_SCRIPT_URL
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services script.'))
    document.head.appendChild(script)
  })
}

export class GoogleOAuthManager {
  private clientId: string
  private tokenClient: GisTokenClient | null = null

  constructor(clientId: string) {
    this.clientId = clientId
  }

  async startOAuthFlow(): Promise<GoogleOAuthState | null> {
    if (!this.clientId) {
      throw new Error('Google client ID not configured. Set VITE_GOOGLE_CLIENT_ID env var.')
    }

    if (isExtension) {
      // Chrome extensions cannot load the GIS script (MV3 CSP forbids remote
      // script-src). Use chrome.identity.launchWebAuthFlow instead.
      try {
        return await this.launchExtensionAuthFlow({ interactive: true, prompt: 'consent' })
      } catch {
        return null
      }
    }

    await loadGisScript()

    const oauth2 = getGoogleAccounts()
    if (!oauth2) {
      throw new Error('Google Identity Services failed to initialize.')
    }

    return new Promise<GoogleOAuthState | null>(resolve => {
      this.tokenClient = oauth2.initTokenClient({
        client_id: this.clientId,
        scope: CALENDAR_SCOPE,
        prompt: 'consent',
        callback: (response: GisTokenResponse) => {
          if (response.access_token) {
            resolve(this.parseTokenResponse(response))
          } else {
            resolve(null)
          }
        },
        error_callback: () => {
          resolve(null)
        },
      })

      this.tokenClient.requestAccessToken()
    })
  }

  async refreshAccessToken(): Promise<GoogleOAuthState> {
    if (!this.clientId) {
      throw new Error('Google client ID not configured.')
    }

    if (isExtension) {
      // Silent launchWebAuthFlow: no popup, fails when no active Google session.
      return this.launchExtensionAuthFlow({ interactive: false, prompt: '' })
    }

    await loadGisScript()

    const oauth2 = getGoogleAccounts()
    if (!oauth2) {
      throw new Error('Google Identity Services failed to initialize.')
    }

    return new Promise<GoogleOAuthState>((resolve, reject) => {
      this.tokenClient = oauth2.initTokenClient({
        client_id: this.clientId,
        scope: CALENDAR_SCOPE,
        callback: (response: GisTokenResponse) => {
          if (response.access_token) {
            resolve(this.parseTokenResponse(response))
          } else {
            reject(new Error('Silent token refresh failed. User must reconnect.'))
          }
        },
        error_callback: () => {
          reject(new Error('Silent token refresh failed. Popup could not open.'))
        },
      })

      this.tokenClient.requestAccessToken({ prompt: '' })
    })
  }

  async revokeToken(accessToken: string): Promise<boolean> {
    if (isExtension) {
      // GIS revoke is DOM-only. Call the raw revocation endpoint instead.
      try {
        const response = await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(accessToken)}`)
        return response.ok
      } catch {
        return false
      }
    }

    await loadGisScript()

    const oauth2 = getGoogleAccounts()
    if (!oauth2) {
      return false
    }

    return new Promise<boolean>(resolve => {
      oauth2.revoke(accessToken, (response: { successful: boolean }) => {
        resolve(response.successful)
      })
    })
  }

  isTokenExpired(expiresAt: number): boolean {
    const now = Date.now()
    const bufferTime = 5 * 60 * 1000
    return now >= expiresAt - bufferTime
  }

  private async launchExtensionAuthFlow(options: { interactive: boolean; prompt: string }): Promise<GoogleOAuthState> {
    const redirectUrl = browser.identity.getRedirectURL()
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    authUrl.searchParams.set('client_id', this.clientId)
    authUrl.searchParams.set('redirect_uri', redirectUrl)
    authUrl.searchParams.set('response_type', 'token')
    authUrl.searchParams.set('scope', CALENDAR_SCOPE)
    if (options.prompt) {
      authUrl.searchParams.set('prompt', options.prompt)
    }

    const responseUrl = await browser.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: options.interactive,
    })

    if (!responseUrl) {
      throw new Error('Google OAuth flow did not return a response.')
    }

    const params = new URLSearchParams(new URL(responseUrl).hash.substring(1))
    const accessToken = params.get('access_token')
    if (params.get('error') || !accessToken) {
      throw new Error(`Google OAuth failed: ${params.get('error') ?? 'missing access token'}`)
    }

    const expiresIn = Number(params.get('expires_in')) || 3600
    return {
      accessToken,
      expiresAt: Date.now() + expiresIn * 1000,
    }
  }

  private parseTokenResponse(response: GisTokenResponse): GoogleOAuthState {
    return {
      accessToken: response.access_token!,
      expiresAt: Date.now() + response.expires_in * 1000,
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

export const googleOAuthManager = new GoogleOAuthManager(GOOGLE_CLIENT_ID)
