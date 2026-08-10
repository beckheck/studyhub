# ADR 0002: Sync module does not write store

- **Status:** accepted
- **Date:** 2026-08-10

## Context

`GoogleCalendarSync` (`src/lib/google-calendar-sync.ts`) owns the Google Calendar API call and returns a `GoogleCalendarSyncResult` (`{ success, googleEventId?, error? }`, lines 26-30). The module never imports the valtio `store`. But the caller, `useItemDialog.syncItemToGoogle` (`src/items/useItemDialog.ts:108-180`), calls `updateItem` twice per save: once at line 100 to persist the item, then again at lines 145, 156, or 167 to stamp `googleCalendarEventId` after the sync returns. This hook and `bulkSyncItems` (lines 349-360) both duplicate the type-dispatch that picks which `sync*` method to call. See [Candidate F](../architecture-review-candidates.md#candidate-f) in the candidates doc.

Candidate F proposes collapsing the 4 `sync*` methods into one `syncItem(item, ctx)` and fixing the instance-level `retryAttempts` concurrency bug. That extraction needs a contract: does `syncItem` write the `store`, or does it return the id and let the caller stamp it?

## Decision

The sync module returns the Google event id and never imports or writes the valtio `store`. The extracted entry point has the shape `syncItem(item, ctx): Promise<{ success, skipped?, googleEventId?, error? }>`. The caller (today `useItemDialog`, tomorrow a bulk sync UI or error notification wiring) stamps `googleEventId` onto the item via a single `updateItem(item.id, { googleCalendarEventId: result.googleEventId })` on success. `skipped` covers the cases where sync does not apply (sync disabled, no access token, no calendar selected, item type without a Google counterpart).

## Consequences

The sync module owns the Google API call but does not own the store write. A future reader will expect the sync module to persist the id it just received, because the module that fetches a value usually writes it back. This ADR records that the seam sits between the API call and the store write, and that the seam is intentional.

The double `updateItem` per save disappears: the caller stamps the id once, after `syncItem` returns, instead of saving the item and then re-saving it with the id. Future callers (bulk sync UI, error notification wiring) depend on `syncItem` returning the id rather than writing the store, so they can batch stamps, surface errors, or retry without the sync module knowing about any of them. Candidate F (collapsing the 4 `sync*` methods, fixing the retry concurrency bug) builds on this seam.

A future explorer should not move the store write into the sync module to reduce the caller's work, and should not have the sync module import `store` from `@/stores/app` to persist the id directly. Both moves re-introduce the seam violation this ADR rejects.

## Alternatives considered

**The sync module writes `store` directly.** The module calls `updateItem` (or mutates the `store` proxy) after a successful API call, so the caller does one `addItem`/`updateItem` and the id appears on the item without further work. Rejected because a lib module would mutate the app store singleton, breaking the rule that components and lib modules access state through hooks and injected callbacks (see [Architecture](../ARCHITECTURE.md)). The sync module would also need the item id and the full `updateItem` signature, pulling store wiring into a module whose job is the Google API. Bulk sync and error notification callers would have no return value to act on, because the sync module would already have written the result away.