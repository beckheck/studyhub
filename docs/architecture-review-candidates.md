# Architecture Review Candidates

> Deepening opportunities surfaced during the architecture review. **Parked for later revisit**. No work is planned until the baseline ([ARCHITECTURE.md](./ARCHITECTURE.md)) is agreed and a candidate is picked for grilling.
>
> Vocabulary: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality** (from `codebase-design`). Domain terms from `CONTEXT.md`.

---

## Summary table

| ID | Candidate | Strength |
|---|---|---|
| A | Item dialog copy-paste + sync inlined in dialog hook | **Strong** |
| B | Calendar queries re-implemented 3+ times. Recurrence is 715 lines of dead code | **Strong** |
| C | Timer manager untestable via `store` singleton import | Worth exploring | **Worth exploring** |
| D | `fileAttachmentStorage` mutates store. GC lives in the wrong module | **Strong** |
| E | Storage has no repository seam. `XItem*` duplicates schemas. `any`-typed proxy patcher | **Strong** (scoped) |
| F | `google-calendar-sync`: 4 near-identical sync methods, instance-level retry, caller re-dispatches | Worth exploring |
| G | File attachments store base64 in valtio, persisted on every mutation | Worth exploring |

---

<a id="candidate-a"></a>
## Candidate A: Item dialog copy-paste + sync inlined in a dialog hook

**Files:** `src/items/useItemDialog.ts:108-193`, `src/items/ItemDialogTrigger.tsx`, `src/items/ItemList.tsx`, `src/items/methods.ts`, `src/items/models.ts`, `src/items/base/methods.tsx`. 7 tab copy-paste sites (`CourseManagerTab.tsx:1186-1198`, `ProjectsTab.tsx:1021-1033`, `TimetableTab.tsx:284-296`, `PlannerTab.tsx:263-275`, `UglyCalendarPlannerTab.tsx:380`, `ItemList.tsx:141-153`)

### Problem

The "unified item management system" is 23 files, but the unifying interface is missing:

- `<ItemDialog {...11 props}>` is copy-pasted verbatim in **7 tab files**. No provider, no context. Each tab derives its own `addItemDialogOptions`/`editItemDialogOptions`.
- `useItemDialog` (a *dialog-state* hook) also contains a 75-line `syncItemToGoogle` (lines 108-180) that branches on `item.type` and calls `googleCalendarSync.syncNewEvent`/`updateEvent`/`syncTaskToGoogle`/`syncExamToGoogle`, then re-saves the item with the returned `googleEventId` via a second `updateItem`. A dialog hook is acting as a Google Calendar sync orchestrator.
- `methods.ts` is a 28-line dispatch table (`new itemMethods[item.type](item)`) hiding ~4 lines of switch logic behind a factory + abstract class + 4 subclasses. `ItemDialogTrigger.tsx` is a 30-line `<div onClick>` wrapper that callers wrap *again* with their own `<Button>`.

### Deletion test

- `methods.ts` / `ItemDialogTrigger`: deleting moves ~4 lines into each caller. Complexity **moves**, it does not concentrate (shallow).
- `useItemDialog`'s sync block: extracting it concentrates sync into a new home and leaves pure dialog state. Complexity **concentrates** (the deepening earns its keep).

### Deepened version

An `<ItemDialogProvider>` in `App.tsx` exposing `openAdd(type, initialData?, opts?)` / `openEdit(item, opts?)` via context. Tabs call `useItemDialog()` (context, not local state) and render **zero** `<ItemDialog>` JSX. A separate reactive `useItemSync` subscribes to item changes and pushes to Google. Delete 7 copy-pasted JSX blocks. `useItemDialog` becomes pure state.

### Benefits

- **Locality:** sync logic lives in one adapter, not in a UI hook.
- **Leverage:** every tab gets the dialog for one `useItemDialog()` call.
- **Tests:** `handleSave`/`handleDeleteItem`'s sync path (currently **0 coverage**. `useItemDialog.test.ts` never calls them because they would hit the real `googleCalendarSync` singleton) becomes testable through the sync module's own interface with an injected stub.

**Recommendation: Strong**

---

<a id="candidate-b"></a>
## Candidate B: Calendar queries re-implemented 3+ times, recurrence is 715 lines of dead code

**Files:** `PlannerTab.tsx:91-113`, `MiniCalendar.tsx:67-92`, `CourseRecordCalendar.tsx`, `UglyCalendarPlannerTab.tsx`, `src/lib/recurrence-utils.ts` (715 lines, zero production imports), `src/lib/recurrence-utils.test.ts` (964 lines), `event/modelSchema.ts:5-25`, `event/form.tsx`, `event/formSchema.ts:92-103`, `google-calendar-sync.ts:498-519`

### Problem

`getAllEventsForDate(date)` is independently implemented in **3+ places** with subtle differences (multi-day toggle, `hideCompleted`, course filter). Each filters `items` by `item.type`, calls `getItemMethods(item).getDate()`, and checks `isDateInRange` for events. The logic for multi-day event overlap is duplicated.

Separately, `recurrence-utils.ts` exports `isRecurrenceMatch`, `generateOccurrences`, `getNextOccurrence`. **Zero production imports** (only `.examples.ts` and `.test.ts` import it). The `EventRecurrence` schema is defined, the form collects recurrence, Google sync converts it to RRule, but **no calendar view ever expands a recurring event into instances**. A recurring event shows once, on its `startsAt`. The expansion code was written (715 lines) and never wired in. A "recurring event doesn't repeat" bug requires reading 5 files to discover the wiring step is missing.

### Deletion test

- `recurrence-utils.ts`: deleting would remove 715 + 964 lines that exercise a feature that doesn't exist in production, but the *right* fix is wiring it in, not deleting it.
- `getAllEventsForDate` duplicates: consolidating into a shared query module concentrates the query logic (one place to fix the multi-day bug, one place to add recurrence expansion).

### Deepened version

`src/features/calendar/queries.ts` exports `getItemsOnDate(items, date, { hideCompleted, courseFilter, expandRecurrence })`. One pure function, tested, used by MiniCalendar/PlannerMonthView/PlannerWeekView/Dashboard/Upcoming. `generateOccurrences` is wired in here. A test asserts a weekly recurring event with `count: 4` appears on 4 consecutive Wednesdays.

### Benefits

- **Locality:** the multi-day/recurrence/filter rules live in one module, not 3+ scattered implementations.
- **Leverage:** 5+ call sites share one query.
- **Tests:** the *bugs live in how the query is called*, not in the pure functions. Consolidating makes the wiring the test surface (the interface *is* the test surface). The 964 lines of recurrence tests finally exercise production code.

**Recommendation: Strong. Top pick (pure addition, low regression risk, makes recurring events work).**

---

<a id="candidate-c"></a>
## Candidate C: Timer manager untestable via `store` singleton import

**Files:** `src/lib/study-session-timer-manager.ts:8,44,346`, `src/hooks/useStudyTimer.ts`, `src/entrypoints/background.ts:13`

### Problem

~~"Two `StudySessionTimerManager` instances" / "self-message loop" / "state in 3 places"~~. These are **not friction**. They are the intended dual-context topology (see [Execution contexts and state ownership](./ARCHITECTURE.md#execution-contexts) in ARCHITECTURE.md). The background owns the timer in extension mode so it survives popup close. The web mode in-bundle singleton + `BrowserRuntimeStub` is the correct adapter. The primary (manager) + persistence (storage) + replica (`useState`) pattern is sound.

The **real** friction is narrower:

- `StudySessionTimerManager` imports `store` at module top (`study-session-timer-manager.ts:8`) and reads `snapshot(store).focusTimer` (line 44). The **read** is justified. It is the synced-cache read, the cleanest way for the background to get settings without React.
- The **write** `store.focusTimer.notificationsEnabled = false` (line 346) is a seam violation. A lib module mutates the app store singleton.
- The manager is untestable (0 tests) because it also imports `hybridStorage`, `notifications`, `site-blocking`, `audio` at module top. No injection points.

### Deletion test

Deleting the `store` write and injecting a `onNotificationPermissionDenied` callback concentrates the store-mutation seam into the React/background layer where it belongs. The read stays (justified).

### Deepened version

Inject `getFocusTimerSettings: () => FocusTimerConfig` and `onNotificationPermissionDenied: () => void` as constructor params. The background passes `() => snapshot(store).focusTimer`. The web singleton passes the same. Tests pass a stub. **Everything else stays**: the message bridge, the separate storage key, the stub adapter, the cross-context topology.

### Benefits

- **Locality:** the store-mutation seam concentrates in the caller layer.
- **Leverage:** the manager becomes testable by injecting callbacks instead of standing up the whole app (valtio + storage + notifications + site-blocking + audio).
- **Tests:** `StudySessionTimerManager` (453 lines, 0 tests) becomes testable through its constructor-injected interface.

**Recommendation: Worth exploring**

---

<a id="candidate-d"></a>
## Candidate D: `fileAttachmentStorage` mutates store, GC lives in the wrong module  *(narrowed)*

**Files:** `src/lib/file-attachment-storage.ts:6,53-54,140-141`, `src/stores/app.ts:356-405` (`performGarbageCollection`)

### Problem

~~"`background.ts` reads `snapshot(store)` - cross-context staleness bug"~~. **Wrong**. The background's `store` is the synced cache. Storage is the source of truth. This is the intended primary/replica pattern (see [Execution contexts and state ownership](./ARCHITECTURE.md#execution-contexts) in ARCHITECTURE.md), not a bug.

The **real** friction:

- `fileAttachmentStorage` imports `store` and writes `store.fileAttachments.files[fileId] = { ...metadata, fileData: base64 }` (`file-attachment-storage.ts:53-54`) / deletes entries (line 140). File attachments are **UI-only** (no background involvement). No cross-context justification exists for a lib module mutating the store directly.
- `stores/app.ts:356-405` exports `performGarbageCollection`, which parses rich-text HTML with `DOMParser`, scans `[data-type="file-attachment"]`/`[data-file-id]`, and knows about `course.syllabusFileId`. **File-attachment lifecycle logic lives in the store module**, not the file-attachment module.

### Deletion test

Moving `performGarbageCollection` into `file-attachment-storage.ts` (where the HTML-scanning belongs) and injecting a `store`-like interface (or callbacks) into `fileAttachmentStorage` concentrates file-attachment lifecycle in one module.

### Deepened version

`fileAttachmentStorage` takes a `store`-like interface (or `{ onFileAdded, onFileDeleted }` callbacks) via constructor. No module-level `import { store }`. `performGarbageCollection` moves into `file-attachment-storage.ts`.

### Benefits

- **Locality:** file-attachment lifecycle (store mutation + GC + HTML scanning + LRU) concentrates in one module.
- **Leverage:** the module becomes reusable/testable without the app's store.
- **Tests:** inject a fake store/callbacks. No need to stand up valtio.

**Recommendation: Strong (for the file-attachment half)**

---

<a id="candidate-e"></a>
## Candidate E: Storage has no repository seam, `XItem*` duplicates schemas, `any`-typed proxy patcher  *(scoped)*

**Files:** `src/stores/app.ts` (451 lines: `loadState`, `persistStore`, `setupStorageSynchronization`, `updateProxyFromState`, `performGarbageCollection`), `src/lib/hybrid-storage.ts` (750 lines), `src/lib/data-transfer.ts` (664 lines: `ExchangeFormatV2`, `XItem*`, `convertDatesToTimestamps`, `convertLegacyItems`)

### Problem

~~"Unify the timer's storage into the app repo"~~. **Wrong**. The timer persists under its own key (`sp:studySessionTimerState`) via its own `HybridStorage` instance deliberately, to avoid a full-app `persistStore` cycle on every tick (see [Data model and persistence](./ARCHITECTURE.md#persistence-path) in ARCHITECTURE.md). This separation is intentional and should be preserved.

The **real** friction:

- **No repository seam.** Serialization (`data-transfer.ts`) + transport (`hybrid-storage.ts`) + trigger (`stores/app.ts` `subscribe`) are three modules with no single "repository" interface. `stores/app.ts` owns `loadState`/`persistStore`/`setupStorageSynchronization`/`updateProxyFromState`. Persistence lifecycle is smeared across the store module.
- **`XItem*` types duplicate the zod schemas** (`data-transfer.ts:421-471`) with `number` instead of `Date`. A parallel type system that can drift with no enforcement.
- **Date <-> timestamp conversion is regex-based:** `convertDatesToTimestamps(state.items, /(At|^until)$/)`. Any field ending in `At` is converted. Implicit, not type-driven. A new field like `submittedAt` is silently converted.
- **`updateProxyFromState`** (`app.ts:408-446`) is a 38-line `any`-typed recursive valtio patcher that deletes missing keys, splices arrays in place. It is the riskiest function in the persistence path (can delete `courseRecords` if imported data lacks the key), **untested**.
- **Cross-tab sync** uses `isApplyingFromStorage` + `setTimeout(() => { isApplyingFromStorage = false }, 0)` (`app.ts:339-348`). A microtask-deferred flag flip that races with valtio's synchronous `subscribe`.

### Deletion test

- Deleting `XItem*` and deriving the exchange format from the zod schemas (with a `Date <-> number` wrapper) removes the parallel type system.
- Collapsing `loadState`/`persistStore`/`updateProxyFromState` into a `repository.ts` module concentrates the persistence lifecycle.

### Deepened version

`const repo = createRepository<AppState>({ storage: hybridStorage, schema: AppStateExchangeSchema, migrations: [...] })`; `repo.load()`, `repo.save(state)`, `repo.subscribe(fn)`, `repo.patch(proxy, newState)`. `stores/app.ts` calls `repo`. `data-transfer.ts` shrinks to import/export-file concerns + legacy migration. `updateProxyFromState` becomes `repo.patch` inside the repository. The timer keeps its own separate repository via the same factory (preserving the intentional separation).

### Benefits

- **Locality:** format + transport + trigger concentrate in one module.
- **Leverage:** the timer (and any future feature) gets persistence from the same factory.
- **Tests:** `repo` is tested through its interface (`load`/`save`/`subscribe`/`patch`) with an `InMemoryAdapter`. The `any`-typed proxy patcher gets a schema-driven implementation. The regex date conversion becomes schema-driven.

**Recommendation: Strong (scoped to the repository + XItem + proxy patcher. Timer storage separation preserved)**

---

<a id="candidate-f"></a>
## Candidate F: `google-calendar-sync`: 4 near-identical sync methods, instance-level retry, caller re-dispatches

**Files:** `src/lib/google-calendar-sync.ts` (607 lines), `src/items/useItemDialog.ts:108-180`, `src/components/settings/GoogleCalendarSettings.tsx:104-112`, `src/lib/google-oauth.ts` (197 lines)

### Problem

- `syncNewEvent`/`updateEvent`/`syncTaskToGoogle`/`syncExamToGoogle` are 4 methods that each do: `convert*ToGoogleEvent` -> `makeApiRequest(POST|PUT, ...)` -> parse response. `syncTaskToGoogle`/`syncExamToGoogle` inline the `isUpdate` branch (near-identical 30-line blocks).
- The "which sync method for this type" dispatch is duplicated: `useItemDialog.syncItemToGoogle` (lines 108-180) and `bulkSyncItems` (lines 349-360) both branch on `item.type`.
- `retryAttempts` is an **instance field** (line 35) reset in `finally` (line 494). Concurrent calls to `makeApiRequest` (a bulk export racing with a single-item sync) share retry state. A latent concurrency bug.
- `courseName`/`projectName` resolution is **passed in by every caller**. The sync module doesn't know about courses, so each caller re-implements the `courseId -> courseName` lookup.
- `convertRecurrenceToRRule` (lines 498-519) is real, non-shallow complexity, but private and untested.

### Duality-sharpened concern: OAuth

`google-oauth.ts:4` hardcodes `REDIRECT_URI = 'http://localhost:5173/'` and uses the popup `postMessage` handshake. This is the **web-app OAuth flow**. In **extension mode**, the UI runs at `chrome-extension://<id>/popup.html`, not `localhost:5173`, so the redirect back would land on a page that isn't the extension. Unless there is a separate `chrome.identity.launchWebAuthFlow` path (none found), **Google Calendar sync may be web-only by construction**.

**Open question (see [Open architectural questions](./ARCHITECTURE.md#open-questions) in ARCHITECTURE.md):** is extension-mode sync intended to work? If yes, the deepened `OAuthClient` needs two adapters (`WebOAuthFlow` + `ExtensionOAuthFlow`). If no, record it as an ADR. Resolve this before proposing the sync deepening.

### Deletion test

Deleting the module would concentrate all Google-API interaction into callers. Clearly bad. The module earns its keep via `makeApiRequest`/retry/RRule. But the 4 `sync*` methods could collapse to one `syncItem(item, opts)` that dispatches internally.

### Deepened version

`googleCalendarSync.syncItem(item: Item, opts): Promise<SyncResult>` dispatches by `item.type`, calls `convertItemToGoogleEvent` internally, owns `courseName`/`projectName` resolution (take `courses`/`projects` arrays once), and has `retryAttempts` as a local variable, not instance state. `useItemDialog` calls `syncItem(item)` without branching. Separately: `REDIRECT_URI = window.location.origin + '/'` (or config). PKCE instead of client secret. `refreshAttempts` per-call.

### Benefits

- **Locality:** the type-dispatch + endpoint logic concentrates in one module.
- **Leverage:** callers call one method regardless of item type.
- **Tests:** `syncItem` is the test surface. Inject a fake `fetch`/`makeApiRequest` and assert per-type behavior without 4 separate test setups. The concurrency bug disappears (retry is per-call).


**Recommendation: Worth exploring (resolve the OAuth question first)**

---

<a id="candidate-g"></a>
## Candidate G: File attachments store base64 in the valtio store, persisted on every mutation

**Files:** `src/lib/file-attachment-storage.ts:46-54`, `src/stores/app.ts:170-174`, `src/lib/data-transfer.ts:33-34`

### Problem

`storeFile` does `store.fileAttachments.files[fileId] = { ...metadata, fileData: base64 }`. Base64 file data lives **in the valtio proxy**. Every `useSnapshot(store)` subscriber sees it. Every `persistStore` serializes the entire `fileAttachments` (all base64 files) to `ExchangeFormatV2` and writes it to `hybridStorage` on **every store mutation**. The LRU cache (lines 24-129) only helps reads, not the in-memory/persistence bloat. Adding a 5MB PDF triggers a ~6.7MB base64 serialize on every subsequent store change.

### Deletion test

Deleting `store.fileAttachments.files` and moving file data to `IndexedDB`/`browser.storage.local` under per-file keys (`sp:file:{id}`) concentrates file storage in one adapter and removes the base64 from the valtio proxy and the exchange format.

### Deepened version

Files live in storage under `sp:file:{id}`. `store.fileAttachments.metadata` holds only metadata. `ExchangeFormatV2` references file IDs. Import/export streams files separately. `fileAttachmentStorage.getFile(id)` is the single read path.

### Benefits

- **Locality:** file lifecycle (store + GC + read/write) concentrates in `file-attachment-storage.ts`.
- **Leverage:** the store stops carrying megabytes of base64. `persistStore` gets faster.
- **Tests:** the storage module is tested through `getFile`/`storeFile`/`deleteFile` with an `InMemoryAdapter`, no valtio involvement.


**Recommendation: Worth exploring**

---

## Minor cleanup (not deepening, just delete)

- **`useCardCollapse.ts`** is dead/broken: references `useDashboardLayout().isWidgetCollapsed`/`setWidgetCollapsed` which don't exist (`useStore.ts:41-80` exports `setWidgetVisibility`, `toggleWidgetVisibility`). Zero call sites. **Delete.**
- **`useBaseStyles.ts`** (133 lines) is a one-shot `<style>` tag injector. A static stylesheet masquerading as a hook. **Move the CSS to `index.css`.**
- **`forms.ts:116,134`**: `createItemModelFromForm`/`updateItemModelFromForm` are unused by the app (only by `forms.test.ts`). `useItemDialog` bypasses them and double-stamps `id`/`createdAt`/`updatedAt` (it calls `convertItemFormToModel` then `addItem` which re-stamps). **Either wire them in or delete them + their tests.**
- **`google-oauth.ts:4`**: `REDIRECT_URI = 'http://localhost:5173/'` hardcoded. Production to any other origin breaks. Also `GOOGLE_CLIENT_SECRET` in `import.meta.env` is a client-side secret (use PKCE). Not deepening, but worth fixing.

---

## Top recommendation

**Start with Candidate B.** It is pure addition (one new query module), low regression risk, wires in 715 lines of dead tested code, and makes recurring events actually work.

Candidates A and D are the next tier. Both are `Strong` and both fix untested, high-risk wiring (sync-in-dialog, lib-mutates-store), but they are bigger refactors.

---

## How to revisit

1. Agree on [ARCHITECTURE.md](./ARCHITECTURE.md) as the baseline.
2. Pick a candidate from this doc.
3. Run the `/grilling` skill to walk the decision tree (constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive).
4. If the candidate is rejected with a reason that is key to the architecture, record it as an ADR in [`docs/adr/`](./adr/) so future reviews don't re-suggest it.
5. If the candidate is accepted, implement via `/implement` or `/tdd`.