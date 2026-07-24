// Google OAuth configuration for Local Web App
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:5173/';

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface GoogleOAuthState {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export class GoogleOAuthManager {
  private refreshAttempts = 0;
  private maxRefreshAttempts = 3;

  /**
   * Initiates Google OAuth flow - opens popup window for user to authorize
   */
  async startOAuthFlow(): Promise<GoogleOAuthState | null> {
    if (!GOOGLE_CLIENT_ID) {
      throw new Error('Google Client ID not configured. Set VITE_GOOGLE_CLIENT_ID env var.');
    }

    try {
      const authUrl = this.buildAuthUrl();

      // Open popup window for OAuth
      const popup = window.open(authUrl, 'oauth', 'width=500,height=600');
      if (!popup) {
        throw new Error('Could not open authorization window. Check if popups are blocked.');
      }

      // Wait for authorization code
      const code = await this.waitForAuthorizationCode();

      if (!code) {
        return null;
      }

      const tokenResponse = await this.exchangeCodeForToken(code);
      return this.parseTokenResponse(tokenResponse);
    } catch (error) {
      console.error('OAuth flow failed:', error);
      throw error;
    }
  }

  /**
   * Waits for the authorization code to be posted back from the popup
   */
  private waitForAuthorizationCode(): Promise<string | null> {
    return new Promise((resolve) => {
      const handleMessage = (event: MessageEvent) => {
        console.log('Message received from popup:', event.data, 'Origin:', event.origin);

        if (event.origin !== window.location.origin) {
          console.warn('Rejected message from different origin:', event.origin);
          return;
        }

        if (event.data?.type === 'OAUTH_CODE') {
          console.log('Authorization code received:', event.data.code);
          window.removeEventListener('message', handleMessage);
          resolve(event.data.code || null);
        }
      };

      window.addEventListener('message', handleMessage);
      console.log('Waiting for OAuth authorization code... (origin: ' + window.location.origin + ')');

      // Timeout after 10 minutes
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        console.warn('OAuth timeout - no code received');
        resolve(null);
      }, 10 * 60 * 1000);
    });
  }

  /**
   * Refreshes an expired access token
   */
  async refreshAccessToken(refreshToken: string): Promise<GoogleOAuthState | null> {
    if (this.refreshAttempts >= this.maxRefreshAttempts) {
      console.error('Max refresh attempts exceeded');
      return null;
    }

    this.refreshAttempts++;

    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const tokenResponse = await response.json();
      return this.parseTokenResponse(tokenResponse);
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    } finally {
      this.refreshAttempts = 0;
    }
  }

  /**
   * Revokes user's Google authorization
   */
  async revokeToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(`https://oauth2.googleapis.com/revoke`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token: accessToken }),
      });

      return response.ok;
    } catch (error) {
      console.error('Token revocation failed:', error);
      return false;
    }
  }

  /**
   * Checks if token needs refresh
   */
  isTokenExpired(expiresAt: number): boolean {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // Refresh 5 minutes before expiry
    return now >= expiresAt - bufferTime;
  }

  // Private helper methods

  private buildAuthUrl(): string {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }

  private async exchangeCodeForToken(code: string): Promise<GoogleTokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('Token exchange error:', error);
      throw new Error(`Token exchange failed: ${response.statusText}`);
    }

    return response.json();
  }

  private parseTokenResponse(data: GoogleTokenResponse): GoogleOAuthState {
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
  }
}

export const googleOAuthManager = new GoogleOAuthManager();
