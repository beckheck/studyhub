import { useEffect } from 'react';

/**
 * Hook to handle OAuth redirects from Google
 * When Google redirects back with an authorization code,
 * this posts it to the opener window
 */
export function useOAuthRedirect() {
  useEffect(() => {
    // Check if this page was opened as a popup with OAuth code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (code || error) {
      console.log('OAuth redirect detected. Code:', code, 'Error:', error);

      if (window.opener) {
        console.log('Posting OAuth code to opener window');
        window.opener.postMessage(
          { type: 'OAUTH_CODE', code: code || null, error: error || null },
          window.location.origin
        );

        // Close this window
        setTimeout(() => {
          window.close();
        }, 1000);
      } else {
        console.warn('No opener window found - this page may not have been opened as a popup');
      }
    }
  }, []);
}
