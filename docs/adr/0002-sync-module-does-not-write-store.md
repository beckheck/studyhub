# ADR 0002: Sync module does not write store

- **Status:** accepted
- **Date:** 2026-08-10

The Google Calendar sync module owned the API call, but the caller saved the item twice per save: once to persist it, then again to stamp the returned Google event id. The caller also duplicated the type-dispatch that picks which sync method to call.

We decided the sync module returns the Google event id and never imports or writes the valtio store. The caller stamps the id onto the item via a single update on success. The return value carries `skipped` for cases where sync does not apply (sync disabled, no token, item type without a Google counterpart).

We rejected having the sync module write the store directly because a lib module would mutate the app store singleton, breaking the rule that lib modules access state through injected callbacks. Bulk sync and error notification callers would also have no return value to act on.
