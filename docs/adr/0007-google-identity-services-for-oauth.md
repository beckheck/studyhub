# ADR 0007: Google Identity Services replaces the custom OAuth flow

- **Status:** accepted
- **Date:** 2026-08-10

## Context

The OAuth client in `google-oauth.ts` had three problems:

1. `REDIRECT_URI = 'http://localhost:5173/'` was hardcoded. Production on any other origin broke.
2. `GOOGLE_CLIENT_SECRET` sat in `import.meta.env` and shipped in the client bundle. A client-side secret provides no security.
3. `refreshAccessToken` and `isTokenExpired` existed but had zero callers. Access tokens expired after one hour and every sync call silently failed with a generic error.

The Google Calendar settings UI also had a latent bug: when the token expired, the user saw "Failed to sync item" with no indication that the token was stale.

## Decision

We replace the custom OAuth popup flow with Google Identity Services (GIS). The GIS token client (`google.accounts.oauth2.initTokenClient`) handles the authorization code flow, PKCE, and the redirect internally. `google-oauth.ts` becomes a thin class that loads the GIS script, initializes the token client, and exposes `startOAuthFlow` / `refreshAccessToken` / `revokeToken` / `isTokenExpired`.

Token refresh is wired through a `getValidAccessToken: () => Promise<string>` callback injected into `GoogleCalendarSync` (following the injected-callback pattern from [ADR 0003](./0003-lib-modules-do-not-import-store.md)). A new `useGoogleCalendarSync` hook constructs the callback, closing over `useGoogleCalendar` mutators and `googleOAuthManager`, and exposes the sync methods pre-wired. This follows the `useStudyTimer` wiring pattern. When the callback detects an expired token, it calls `googleOAuthManager.refreshAccessToken()` (silent refresh via `prompt: ''`). If the silent refresh fails (Google session expired), the callback throws and the sync operation returns a "reconnect" error instead of showing a surprise popup mid-operation.

## Consequences

- **`REDIRECT_URI` is gone.** GIS uses `redirect_uri: 'postmessage'` internally. No origin registration is needed.
- **`GOOGLE_CLIENT_SECRET` is removed** from the codebase and `.env.example`. PKCE is handled by GIS.
- **`useOAuthRedirect.ts` is deleted** along with its 2 call sites in `App.tsx` and the `OAUTH_CODE` message protocol. The popup + `postMessage` handshake is gone.
- **`refreshToken` is removed** from `GoogleCalendarConfig` (`types.d.ts`), `setRefreshToken` from `useGoogleCalendar`, and `refresh_token` from `GoogleTokenResponse`. GIS does not return refresh tokens.
- **`google-oauth.ts` gains a test file** that mocks `window.google.accounts.oauth2` and covers all five behaviors (script loading, `startOAuthFlow`, `refreshAccessToken`, `revokeToken`, `isTokenExpired`) including error cases.
- **`GoogleCalendarSync` constructor gains an optional `getValidAccessToken` parameter.** When absent (tests), it uses `ctx.accessToken` directly, preserving the existing test suite unchanged.
- **ADR 0006's web-only decision stands.** GIS is a web-only library. Extension sync remains unbuilt and is still new work, not a gap.

## Alternatives considered

- **Fixed origin set** (register localhost + one production URL in Google Cloud Console, use `window.location.origin + '/'`). Fragile: breaks on any unregistered origin. Rejected because it doesn't solve the fundamental redirect registration problem.
- **User-configured redirect URI** (`VITE_OAUTH_REDIRECT_URI` env var). Works and keeps the current architecture, but preserves the popup, `postMessage` handshake, and `useOAuthRedirect` complexity that GIS eliminates for free.
- **Backend relay** (serverless function holds the client secret, exchanges the code). Solves both the redirect and secret problems, but contradicts the local-first principle from `CONTEXT.md` ("all data stays on-device"). Introduces a server dependency and a trust boundary. Rejected.
- **Chrome extension identity flow** (`chrome.identity.launchWebAuthFlow`). Enables sync in extension mode, but [ADR 0006](./0006-google-calendar-sync-web-only.md) explicitly rejected this. It is new feature work, not hardening. Rejected for this candidate.
