# ADR 0006: Google Calendar sync is web-only by design

- **Status:** accepted
- **Date:** 2026-08-10

The OAuth flow in `google-oauth.ts` opens a popup and waits for a `postMessage` handshake. The redirect URI is hardcoded to `http://localhost:5173/`. In extension mode the UI runs at `chrome-extension://<id>/popup.html`, so the redirect cannot land back in the extension. No `chrome.identity.launchWebAuthFlow` adapter exists; the manifest declares the `identity` permission but no code uses it. The Google Calendar settings section renders in every Container Mode, so extension users see a Connect button that structurally cannot complete.

We decided Google Calendar sync is a web-only feature by design. We will not build a `chrome.identity.launchWebAuthFlow` adapter. The Google Calendar settings section is hidden in extension mode so users do not see a dead Connect button.

Extension users get a Settings tab without the Google Calendar section. A future review must not re-flag this as a gap; extension sync, if ever wanted, is new work. The OAuth client hardening (dynamic redirect URI, PKCE, per-call refresh attempts) is resolved by [ADR 0007](./0007-google-identity-services-for-oauth.md): Google Identity Services replaces the custom OAuth flow entirely. This does not change the web-only decision.

We rejected building the `chrome.identity.launchWebAuthFlow` adapter now because it is real feature work (adapter shape, PKCE, redirect handling) with its own risk; we defer it to a scoped session. We rejected leaving the section visible in extension mode because it shows a Connect button that cannot complete.
