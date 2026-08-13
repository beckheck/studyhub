import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { GoogleOAuthManager } from './google-oauth'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'

interface MockTokenClient {
  requestAccessToken: ReturnType<typeof vi.fn>
  _callback?: (response: any) => void
  _errorCallback?: (response: any) => void
}

interface MockGis {
  initTokenClient: ReturnType<typeof vi.fn>
  revoke: ReturnType<typeof vi.fn>
}

function makeTokenResponse(overrides: Partial<any> = {}): any {
  return {
    access_token: 'test-access-token',
    expires_in: 3600,
    token_type: 'Bearer',
    scope: CALENDAR_SCOPE,
    ...overrides,
  }
}

function installGisMock(gisOverrides: Partial<MockGis> = {}): MockGis & { tokenClient: MockTokenClient } {
  const tokenClient: MockTokenClient = {
    requestAccessToken: vi.fn(),
  }

  const gis: MockGis = {
    initTokenClient: vi.fn((config: any) => {
      tokenClient._callback = config.callback
      tokenClient._errorCallback = config.error_callback
      return tokenClient
    }),
    revoke: vi.fn((_token: string, done?: (r: any) => void) => {
      if (done) done({ successful: true })
    }),
    ...gisOverrides,
  }

  ;(window as any).google = { accounts: { oauth2: gis } }
  return { ...gis, tokenClient }
}

function installGisScriptMock(): (() => void) | null {
  const appendChild = vi.fn()
  const originalAppendChild = document.head.appendChild.bind(document.head)
  document.head.appendChild = appendChild as any

  const originalQuerySelector = document.querySelector.bind(document)
  document.querySelector = vi.fn(() => null) as any

  return () => {
    document.head.appendChild = originalAppendChild as any
    document.querySelector = originalQuerySelector as any
  }
}

describe('GoogleOAuthManager', () => {
  let originalGoogle: any
  let restoreScriptMock: (() => void) | null = null

  beforeEach(() => {
    originalGoogle = (window as any).google
    restoreScriptMock = installGisScriptMock()
  })

  afterEach(() => {
    if (originalGoogle === undefined) {
      delete (window as any).google
    } else {
      ;(window as any).google = originalGoogle
    }
    if (restoreScriptMock) restoreScriptMock()
    vi.restoreAllMocks()
  })

  describe('startOAuthFlow', () => {
    it('returns the access token and expiry from GIS on a successful consent', async () => {
      const { tokenClient, initTokenClient } = installGisMock()
      const manager = new GoogleOAuthManager('test-client-id')

      const promise = manager.startOAuthFlow()
      await vi.waitFor(() => expect(tokenClient.requestAccessToken).toHaveBeenCalledTimes(1))

      const config = initTokenClient.mock.calls[0][0]
      expect(config.prompt).toBe('consent')

      tokenClient._callback!(makeTokenResponse({ access_token: 'fresh-token', expires_in: 3600 }))

      const result = await promise
      expect(result).toEqual({
        accessToken: 'fresh-token',
        expiresAt: expect.any(Number),
      })
    })

    it('throws when the client id is not configured', async () => {
      installGisMock()
      const manager = new GoogleOAuthManager('')

      await expect(manager.startOAuthFlow()).rejects.toThrow('client ID')
    })

    it('returns null when the user closes the popup without consenting', async () => {
      const { tokenClient } = installGisMock()
      const manager = new GoogleOAuthManager('test-client-id')

      const promise = manager.startOAuthFlow()
      await vi.waitFor(() => expect(tokenClient.requestAccessToken).toHaveBeenCalledTimes(1))

      tokenClient._callback!(makeTokenResponse({ access_token: undefined, error: 'user_cancelled' }))

      const result = await promise
      expect(result).toBeNull()
    })

    it('returns null when the popup fails to open', async () => {
      const { tokenClient } = installGisMock()
      const manager = new GoogleOAuthManager('test-client-id')

      const promise = manager.startOAuthFlow()
      await vi.waitFor(() => expect(tokenClient.requestAccessToken).toHaveBeenCalledTimes(1))

      tokenClient._errorCallback!({ type: 'popup_failed_to_open' })

      const result = await promise
      expect(result).toBeNull()
    })
  })

  describe('refreshAccessToken', () => {
    it('requests a new token with an empty prompt for silent refresh', async () => {
      const { tokenClient } = installGisMock()
      const manager = new GoogleOAuthManager('test-client-id')

      const promise = manager.refreshAccessToken()
      await vi.waitFor(() => expect(tokenClient.requestAccessToken).toHaveBeenCalledTimes(1))

      const callArg = tokenClient.requestAccessToken.mock.calls[0][0]
      expect(callArg.prompt).toBe('')

      tokenClient._callback!(makeTokenResponse({ access_token: 'refreshed-token', expires_in: 3600 }))

      const result = await promise
      expect(result).toEqual({
        accessToken: 'refreshed-token',
        expiresAt: expect.any(Number),
      })
    })

    it('throws when silent refresh fails, so the caller can surface a reconnect error', async () => {
      const { tokenClient } = installGisMock()
      const manager = new GoogleOAuthManager('test-client-id')

      const promise = manager.refreshAccessToken()
      await vi.waitFor(() => expect(tokenClient.requestAccessToken).toHaveBeenCalledTimes(1))

      tokenClient._callback!(makeTokenResponse({ access_token: undefined, error: 'invalid_grant' }))

      await expect(promise).rejects.toThrow()
    })
  })

  describe('revokeToken', () => {
    it('calls google.accounts.oauth2.revoke and returns true on success', async () => {
      const gis = installGisMock()
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.revokeToken('test-access-token')

      expect(gis.revoke).toHaveBeenCalledWith('test-access-token', expect.any(Function))
      expect(result).toBe(true)
    })

    it('returns false when revocation reports failure', async () => {
      installGisMock({
        revoke: vi.fn((_token: string, done?: (r: any) => void) => {
          if (done) done({ successful: false, error: 'invalid_token' })
        }) as any,
      })
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.revokeToken('expired-token')

      expect(result).toBe(false)
    })
  })

  describe('isTokenExpired', () => {
    it('returns true when the token expires within the 5-minute buffer', () => {
      const manager = new GoogleOAuthManager('test-client-id')
      const now = Date.now()
      const expiresAt = now + 3 * 60 * 1000

      expect(manager.isTokenExpired(expiresAt)).toBe(true)
    })

    it('returns false when the token has more than 5 minutes remaining', () => {
      const manager = new GoogleOAuthManager('test-client-id')
      const now = Date.now()
      const expiresAt = now + 10 * 60 * 1000

      expect(manager.isTokenExpired(expiresAt)).toBe(false)
    })

    it('returns true when the token is already expired', () => {
      const manager = new GoogleOAuthManager('test-client-id')
      const past = Date.now() - 1000

      expect(manager.isTokenExpired(past)).toBe(true)
    })
  })

  describe('GIS script loading', () => {
    it('appends the GIS script tag when GIS is not yet loaded', async () => {
      delete (window as any).google
      const appendedScripts: HTMLScriptElement[] = []
      const originalAppendChild = document.head.appendChild.bind(document.head)
      document.head.appendChild = ((node: Node) => {
        if (node instanceof HTMLScriptElement) {
          appendedScripts.push(node)
        }
        return originalAppendChild(node)
      }) as any

      const manager = new GoogleOAuthManager('test-client-id')
      const promise = manager.startOAuthFlow()

      await vi.waitFor(() => {
        expect(appendedScripts.length).toBe(1)
      })

      expect(appendedScripts[0].src).toBe('https://accounts.google.com/gsi/client')
      expect(appendedScripts[0].async).toBe(true)

      promise.catch(() => {})
    })
  })
})

const mockIsExtension = vi.hoisted(() => ({ value: false }))
const mockWebAuthFlow = vi.hoisted(() => ({
  launchWebAuthFlow: vi.fn(),
  getRedirectURL: vi.fn(() => 'https://extension-id.chromiumapp.org/'),
}))

vi.mock('@/lib/browser-runtime-stub', () => ({
  get isExtension() {
    return mockIsExtension.value
  },
}))

vi.mock('wxt/browser', () => ({
  browser: {
    identity: {
      getRedirectURL: mockWebAuthFlow.getRedirectURL,
      launchWebAuthFlow: mockWebAuthFlow.launchWebAuthFlow,
    },
  },
}))

describe('GoogleOAuthManager (extension mode)', () => {
  beforeEach(() => {
    mockIsExtension.value = true
    mockWebAuthFlow.launchWebAuthFlow.mockReset()
    mockWebAuthFlow.launchWebAuthFlow.mockResolvedValue(undefined)
  })

  afterEach(() => {
    mockIsExtension.value = false
    vi.restoreAllMocks()
  })

  const extensionRedirectUrl = 'https://extension-id.chromiumapp.org/'

  function installWebAuthFlowResponse(hash: string): void {
    mockWebAuthFlow.launchWebAuthFlow.mockResolvedValue(`${extensionRedirectUrl}#${hash}`)
  }

  describe('startOAuthFlow', () => {
    it('builds an authorization URL and returns the token from the response hash', async () => {
      installWebAuthFlowResponse(
        'access_token=ext-token&token_type=Bearer&expires_in=3600&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar',
      )
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.startOAuthFlow()

      const flowUrl = new URL(mockWebAuthFlow.launchWebAuthFlow.mock.calls[0][0].url)
      expect(flowUrl.origin + flowUrl.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
      expect(flowUrl.searchParams.get('client_id')).toBe('test-client-id')
      expect(flowUrl.searchParams.get('redirect_uri')).toBe(extensionRedirectUrl)
      expect(flowUrl.searchParams.get('response_type')).toBe('token')
      expect(flowUrl.searchParams.get('scope')).toBe(CALENDAR_SCOPE)
      expect(flowUrl.searchParams.get('prompt')).toBe('consent')
      expect(mockWebAuthFlow.launchWebAuthFlow.mock.calls[0][0].interactive).toBe(true)

      expect(result).toEqual({
        accessToken: 'ext-token',
        expiresAt: 1640995200000 + 3600 * 1000,
      })
    })

    it('returns null when the user closes the Google page', async () => {
      mockWebAuthFlow.launchWebAuthFlow.mockRejectedValue(new Error('The user did not approve access.'))
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.startOAuthFlow()

      expect(result).toBeNull()
    })

    it('returns null when Google reports access_denied in the response hash', async () => {
      installWebAuthFlowResponse('error=access_denied')
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.startOAuthFlow()

      expect(result).toBeNull()
    })
  })

  describe('refreshAccessToken', () => {
    it('runs a silent flow without a prompt and parses the new token', async () => {
      installWebAuthFlowResponse(
        'access_token=refreshed-ext-token&token_type=Bearer&expires_in=3600&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar',
      )
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.refreshAccessToken()

      const flowUrl = new URL(mockWebAuthFlow.launchWebAuthFlow.mock.calls[0][0].url)
      expect(mockWebAuthFlow.launchWebAuthFlow.mock.calls[0][0].interactive).toBe(false)
      expect(flowUrl.searchParams.get('prompt')).toBeNull()

      expect(result).toEqual({
        accessToken: 'refreshed-ext-token',
        expiresAt: 1640995200000 + 3600 * 1000,
      })
    })

    it('rejects when the silent flow reports an error', async () => {
      installWebAuthFlowResponse('error=invalid_grant')
      const manager = new GoogleOAuthManager('test-client-id')

      await expect(manager.refreshAccessToken()).rejects.toThrow('invalid_grant')
    })

    it('rejects when the silent flow cannot open', async () => {
      mockWebAuthFlow.launchWebAuthFlow.mockRejectedValue(new Error('Authorization page could not be loaded.'))
      const manager = new GoogleOAuthManager('test-client-id')

      await expect(manager.refreshAccessToken()).rejects.toThrow('Authorization page')
    })
  })

  describe('revokeToken', () => {
    it('calls the revocation endpoint and returns true on success', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: true })
      vi.stubGlobal('fetch', fetchMock)
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.revokeToken('test-access-token')

      expect(fetchMock).toHaveBeenCalledWith(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent('test-access-token')}`,
      )
      expect(result).toBe(true)
    })

    it('returns false when revocation fails', async () => {
      const fetchMock = vi.fn().mockResolvedValue({ ok: false })
      vi.stubGlobal('fetch', fetchMock)
      const manager = new GoogleOAuthManager('test-client-id')

      const result = await manager.revokeToken('test-access-token')

      expect(result).toBe(false)
    })
  })
})
