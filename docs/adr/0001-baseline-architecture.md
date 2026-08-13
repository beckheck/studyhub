# StudyHub Architecture Decisions

## The dual surface

### One codebase, two execution models

StudyHub runs as one codebase with two execution models: a browser extension and a web app. This fact shapes every decision in this document.

The extension renders the same React app across six container modes (web, popup, sidepanel, tab, overlay, newtab). Only the container mode and the available dimensions distinguish them. The web app is one of those modes, without the extension platform APIs.

We rejected splitting the extension and the web app into separate codebases. The two share the whole domain model, the whole state shape, and most of the UI. A split would duplicate all of that.

### The runtime seam

A runtime seam sits between the extension and the web app. The seam exposes a message-passing interface with two adapters: the extension adapter wraps `browser.runtime`, and the web adapter emulates the same message API in process.

Two real adapters back the seam. The discriminator is `isExtension`, exported beside the adapters. Extension-only behavior goes through an `isExtension` guard or lives in the extension background, which only runs in the extension. Web parity goes through the web adapter.

We rejected speculative seams that have only one adapter. A seam with one adapter has nothing to vary across. Do not introduce one.

---

## State

### Storage is the source of truth

In extension mode, two JavaScript contexts run at the same time: the background service worker and the UI. Each context holds its own in-memory store instance. A shared storage layer backs both.

Storage is the source of truth. Each context's store is a synced cache of the data in storage. When a context mutates its store, the change persists to storage. Storage change events fire in both contexts, and each context re-imports the changed key into its own store. A guard prevents a persist loop.

We rejected unifying the two store instances into one. The two contexts have separate module graphs, and no shared in-memory object can span them. Storage is the only bridge between the contexts.

### Components access state through hooks

Components read and write state through hooks, one per state slice. The hooks concentrate store mutation behind per-slice interfaces and give components a small, typed surface. Several hooks own behavior behind one call: cascading deletes, random color on complete, and per-mode tab persistence.

We rejected having components import the store singleton directly. The hooks are the intended access layer. A component that imports the store directly bypasses the cascades and the presentation behaviors that the hooks own.

### Lib modules do not import the store

Lib modules do not import or mutate the store. The store supplies a repository adapter at construction time. The module owns its own state and reads and writes through the adapter. Store reads that a module needs come in as constructor callbacks.

The file attachment module previously imported the store at module top and read and wrote it on every file operation. The timer manager previously read a store snapshot for settings and wrote the store when notification permission was denied. Both now take what they need through injected callbacks. The timer manager became testable without initializing the store.

We rejected keeping the store import and moving only the garbage collection, because the module read and wrote the store on every file operation, not only on garbage collection. We rejected write-only callbacks because the module reads too much for them to cover. Injecting reads through constructor callbacks is better than allowing direct store reads. The prohibition covers reads and writes.

### Google Calendar Sync does not write Item fields directly

The Google Calendar Sync HTTP layer returns the Google event id. It never imports or writes the store. The Item write flow stamps the id onto the Item on success. The return value carries a `skipped` flag when sync does not apply.

Queue state (dirty ids, tombstones, last sync timestamp) mutates only through injected store callbacks at the orchestration seam. No sync lib module imports the store singleton.

We rejected having sync lib modules write the store directly. That breaks the injected-callback rule. Callers need return values to stamp Items and handle errors.

### Repository seam for app state

The persistence lifecycle for app state sits behind a single repository interface. The repository owns load, save, subscribe, and proxy patching. The store module delegates to it. Serialization is a set of stateless pure functions. The caller owns loading state, because loading state is a UI concern.

The timer uses the same repository factory with its own storage key and adapters. This preserves the intentional separation between app-state persist and per-tick timer persist.

We rejected keeping the lifecycle spread across three modules. The untyped proxy patcher, the impure import, and the untestable path would remain. We rejected a full schema-driven patcher here, because app state has no zod schema today. Building one is separate work.

### Migration pipeline

Migrations are gated by data version. The repository calls a migration only when the data version matches. Cross-context sync, which always receives current-version data, skips migrations entirely.

We rejected running migrations unconditionally. Running them on every sync wastes work and leaves no pattern for future migrations.

---

## Timer

### The timer lives in the background in extension mode

The focus timer manager lives in the extension background service worker. The UI talks to it over the runtime seam: the UI sends `timer.*` messages, and the background broadcasts state back. The UI never creates a timer manager in extension mode.

We rejected moving the timer into React. The timer must survive the popup closing, and a React-lifetime object does not survive it.

In web mode, the timer manager is created in the bundle. The web adapter emulates the message bridge, so the same UI code works unchanged. Site blocking is a no-op in web mode, audio plays directly, and no badge is shown.

### The timer persists under its own storage key

The timer persists under its own storage key, separate from the app exchange format. The timer must persist on every tick without triggering a full app-state persist cycle.

We rejected merging the timer into the app exchange format. The per-tick persist cadence differs from app-state persist. Merging them would either drop timer ticks or persist the whole app on every tick.

---

## Items

### Items are a discriminated union of four subtypes

An Item is one of Task, Exam, Event, or Timetable. Each subtype owns its own schema, form schema, methods, and form. A shared base holds the abstract classes. A single dialog provider mounts one dialog for the whole app, and every tab and component that creates or edits items calls it from context.

We rejected adding to the item schema ad hoc. New item kinds extend the union through per-subtype files, not the schema.

### Calendar queries return CalendarEntry, not Item

Calendar views each inlined their own date-filtering logic, with subtle differences for completed items, multi-day events, and course filters. Recurrence expansion existed but had zero production imports, so a recurring event showed once on its `startsAt` and never on its recurrence dates.

We consolidated the query logic into one shared module. The query returns `CalendarEntry[]`. Each entry carries the occurrence's effective start and end times and a sequence number alongside the source item. The query answers the question "what occurs on this date." Views apply display filters themselves. Timetable items are excluded because their expansion uses a different mechanism.

We rejected returning `Item[]` because it cannot carry occurrence-specific times. A recurring Wednesday study group needs `startsAt: Jan 14 2pm` for its Jan 14 occurrence, but `item.startsAt` gives `Jan 7 2pm`. We rejected a per-date API only, because a month grid would invoke recurrence expansion 42 times instead of once for the visible range.

### The Item write flow

The Item access and write interfaces are split and deepened.

Reads stay on the items hook. `getItemsByType` and `addItem` are generic with a mapped type. Callers that pass a string literal get the narrowed array, which removes the 8 `as ItemXxx[]` casts. `addItem` stays generic because the Import flow creates local items from fetched Google events that must not re-sync.

Writes move to a pure Item write module behind a thin hook. The module owns persist, sync, and stamp behind one interface. It takes arrays in and returns the next arrays out. It does not import the store, and it is the caller side of the sync seam. The hook assembles the sync context from the store, wires the sync adapter, and applies the returned arrays to the store.

A write syncs to Google only when the patch touches a syncable field. Completion toggles and the Google event id stamp never sync, so checkbox clicks do not push unchanged events back to Google, and the stamp does not loop. Delete composes the exam-grade cascade and runs the Google delete inside a try/catch that never throws. Local deletion proceeds even when the Google delete fails.

We rejected keeping the generic `updateItem(id, patch)` and `deleteItem(id)` on the hook as a fallback for callers that hold a generic Item. The write module takes the concrete Item, so the cascade is type-known from `item.type`, and the id-based generic path adds no safety. Keeping it would leave two write surfaces and restore the bypass that the deepening removed. We rejected a new query module for reads, because it duplicates the hook. We rejected per-slice hooks, because that mixes two deepenings and forces a migration of all 30 callers across new import paths. We rejected routing the Import flow through the write module, because imported items already carry a Google event id, so syncing them back would create duplicates.

---

## Google Calendar

### One module owns Google Calendar Sync orchestration

Real-time sync, retry queue, tombstones, periodic backstop, and token handling each lived in separate modules. Queue invariants were duplicated. Some lib modules imported the store directly.

We consolidated orchestration behind one lib module with a small interface. Queue state mutates only through injected store callbacks. The HTTP layer returns results. Callers stamp Item fields. Token refresh stays outside the store callbacks.

We rejected leaving the pipeline spread across hooks and runners. That forced every caller to know which module owns which invariant.

### Google Calendar Sync works in extension mode

We previously decided Google Calendar Sync was web-only because GIS OAuth cannot redirect back into the extension.

Extension mode now uses the platform OAuth flow. The UI handles connect and token refresh. The background runs periodic retry but cannot refresh tokens without a DOM, so it notifies open UI surfaces when the token expires.

We rejected keeping the web-only decision. Extension users need sync in the extension. We rejected expecting GIS to work in extension mode. The redirect cannot land in the extension context.

### Google Identity Services for OAuth

The OAuth client had three problems. The redirect URI was hardcoded to localhost, so production on any other origin broke. The client secret sat in the client bundle, where it provides no security. Token refresh existed but had zero callers, so every sync call silently failed after one hour.

We replaced the custom OAuth popup flow with Google Identity Services (GIS) for web mode. The GIS token client handles the authorization code flow, PKCE, and the redirect internally. There is no redirect URI, no client secret, and no popup management. Token refresh uses an injected callback. When the callback detects an expired token, it attempts a silent refresh. If the silent refresh fails, the sync operation returns a "reconnect" error instead of showing a popup mid-operation.

Extension mode uses the platform OAuth flow instead of GIS. Both paths persist tokens to the same store fields.

We rejected a fixed origin set because it breaks on any unregistered origin. We rejected a user-configured redirect URI because it preserves the popup and handshake complexity that GIS eliminates. We rejected a backend relay because it contradicts the local-first principle: all data stays on-device.

---

## Open questions

### Timetable expansion timezone

The inline timetable expansion hardcodes `America/Santiago` as the timezone. The user never selects a timezone. Resolving the default (a user setting, or the device timezone) needs a decision.
