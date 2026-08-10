# Architecture Review Candidates

> Deepening opportunities surfaced during the architecture review. **Parked for later revisit**. No work is planned until the baseline ([ARCHITECTURE.md](./ARCHITECTURE.md)) is agreed and a candidate is picked for grilling.
>
> Vocabulary: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality** (from `codebase-design`). Domain terms from `CONTEXT.md`.

---

## Summary table

| ID  | Candidate                                                                                      | Strength                       |
| --- | ---------------------------------------------------------------------------------------------- | ------------------------------ |
| C   | Timer manager untestable via `store` singleton import                                          | Worth exploring                |
| F   | Google Calendar OAuth client hardening (dynamic redirect URI, PKCE, per-call refresh) deferred | **Worth exploring** (deferred) |
| G   | File attachments store base64 in valtio, persisted on every mutation                           | Worth exploring                |

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

<a id="candidate-f"></a>

## Candidate F: Google Calendar OAuth client hardening (deferred)

**Status:** Deferred to a separate OAuth session.

**Files:** `src/lib/google-oauth.ts` (197 lines, `REDIRECT_URI` at line 4)

### Problem

- `REDIRECT_URI = 'http://localhost:5173/'` is hardcoded (`google-oauth.ts:4`). Production on any other origin breaks.
- `GOOGLE_CLIENT_SECRET` in `import.meta.env` is a client-side secret. PKCE should replace it.

### Deepened version

`REDIRECT_URI = window.location.origin + '/'` (or config). PKCE instead of client secret. `refreshAttempts` per call.

**Recommendation: Worth exploring. Deferred to a dedicated OAuth session.**

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

---

## How to revisit

1. Agree on [ARCHITECTURE.md](./ARCHITECTURE.md) as the baseline.
2. Pick a candidate from this doc.
3. Run the `/grilling` skill to walk the decision tree (constraints, dependencies, the shape of the deepened module, what sits behind the seam, what tests survive).
4. If the candidate is rejected with a reason that is key to the architecture, record it as an ADR in [`docs/adr/`](./adr/) so future reviews don't re-suggest it.
5. If the candidate is accepted, implement via `/implement` or `/tdd`.
