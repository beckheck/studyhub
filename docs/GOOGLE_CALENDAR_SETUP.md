# Google Calendar Setup Guide

This guide walks you through configuring Google Cloud Console so StudyHub can connect to Google Calendar.

StudyHub uses Google Identity Services (GIS) with the token client model. No client secret is needed. The GIS library handles PKCE and the redirect internally. You only need to register a client ID and authorize the JavaScript origin.

## Step 1: Create a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Click the project dropdown at the top and select **New Project**.
3. Name it (for example, `studyhub-local`) and click **Create**.
4. Wait for the project to be created, then select it from the dropdown.

## Step 2: Enable the Google Calendar API

1. In the left sidebar, open **APIs & Services > Library**.
2. Search for **Google Calendar API**.
3. Click it and then click **Enable**.

## Step 3: Configure the OAuth consent screen

1. In the left sidebar, open **APIs & Services > OAuth consent screen**.
2. Choose **External** as the user type and click **Create**.
3. Fill in the required fields:
   - **App name:** StudyHub
   - **User support email:** your email
   - **Developer contact information:** your email
4. Click **Save and Continue** through the Scopes and Test Users pages. You do not need to add scopes here. The GIS token client requests the `calendar` scope at runtime.
5. On the **Test users** page, add your own Google account as a test user. This is required while the app is in testing mode.
6. Click **Save and Continue** and return to the dashboard.

## Step 4: Create the OAuth client ID

1. In the left sidebar, open **APIs & Services > Credentials**.
2. Click **Create Credentials > OAuth client ID**.
3. Choose **Web application** as the application type.
4. Name it (for example, `StudyHub Web`).

### Step 5: Register the JavaScript origin

This is the step that prevents the `origin_mismatch` error (Error 400).

1. Under **Authorized JavaScript origins**, click **Add URI**.
2. Add the origin where you run StudyHub. For local development:
   ```
   http://localhost:5173
   ```
   Do not include a trailing slash. Do not include a path. The origin is the scheme plus host plus port, nothing more.
3. If you deploy StudyHub to a production URL, add that origin too (for example, `https://my-studyhub.example.com`).
4. Under **Authorized redirect URIs**, you do not need to add anything. The GIS token client model does not use a redirect URI.
5. Click **Create**.

## Step 6: Copy the client ID

1. After creating the credential, a dialog shows the **Client ID**. Copy it.
2. In the StudyHub project root, create or edit `.env.local`:
   ```
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```
3. Restart the dev server so the new env var takes effect:
   ```sh
   vp dev
   ```

## Step 7: Connect

1. Open StudyHub in the browser at `http://localhost:5173`.
2. Open **Settings > Google Calendar**.
3. Click **Connect**.
4. Google shows a consent popup. Select your account and approve the calendar permission.
5. The settings panel shows your calendars. Select one to sync with.

## Troubleshooting

### Error 400: origin_mismatch

The origin where StudyHub runs is not registered in Google Cloud Console. Go to **APIs & Services > Credentials**, edit your OAuth client ID, and add the exact origin (scheme + host + port, no trailing slash, no path) under **Authorized JavaScript origins**.

For `http://localhost:5173`, the registered origin must be:

```
http://localhost:5173
```

### Access blocked: app not verified

The OAuth consent screen is in testing mode and your Google account is not listed as a test user. Go to **APIs & Services > OAuth consent screen > Test users** and add your email.

### Token expired after one hour

Access tokens expire after one hour. StudyHub silently refreshes the token when it expires. If the silent refresh fails (your Google session expired), the sync returns a reconnect error. Open **Settings > Google Calendar**, click **Disconnect**, then **Connect** again.

### Connect button does nothing in extension mode

Google Calendar sync is web-only by design. The Connect button is hidden in extension mode. See [ADR 0006](./adr/0006-google-calendar-sync-web-only.md).
