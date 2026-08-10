# StudyHub Architecture Baseline

> A description of the system **as it is today**, not as it should be. This document is the shared reference for future architecture work. Deepening opportunities are tracked separately in [architecture-review-candidates.md](./architecture-review-candidates.md).
>
> Vocabulary follows [`codebase-design`](https://github.com/...): **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**. Do not use "component/service/API/boundary." Domain terms follow [`CONTEXT.md`](../CONTEXT.md): **Item**, **Task**, **Exam**, **Event**, **Timetable**, **Course**, **Degree Plan**, **Study Session**, **Project**, **Wellness**, **Container Mode**.

---

<a id="dual-surface"></a>
## The architectural key constraint: dual surface

StudyHub runs as **one codebase, two execution models**. This single fact shapes every architectural decision below. Understand it before you judge any module's shape.

### Container Modes

Six render surfaces, all backed by the same React app (`App.tsx` via `AppContainer`). Only `AppContainerMode` and the available dimensions distinguish them:

| Mode | Entry point | Lifetime | Has `browser.*`? |
|---|---|---|---|
| `web` | `src/main.tsx` | Page session | No. Uses `browserRuntimeStub` |
| `popup` | `src/entrypoints/popup/main.tsx` | Closes on blur | Yes |
| `sidepanel` | `src/entrypoints/sidepanel/main.tsx` | Persistent per tab | Yes |
| `tab` | `src/entrypoints/tab/main.tsx` | Full browser tab | Yes |
| `overlay` | content-script-injected iframe | Until removed | Yes (via content script) |
| `newtab` | (reuses `tab` entry) | Full browser tab | Yes |

`AppContext` (`src/contexts/AppContext.tsx`) exposes `{ mode, dimensions, isExtension }`. `isExtension` is the branch that selects which runtime adapter is in play.

<a id="runtime-seam"></a>
### The runtime seam

`src/lib/browser-runtime-stub.ts` defines the seam between extension and web:

- **Interface:** `browserRuntime.sendMessage(msg)` / `browserRuntime.onMessage.addListener(fn)`. A subset of `browser.runtime` for inter-context messaging.
- **Two adapters**:
  - Extension: `browser.runtime` (WXT's `wxt/browser`).
  - Web: `BrowserRuntimeStub`. An in-process pub/sub that emulates `browser.runtime`'s message API so the *same* code path works.

`isExtension = !!browser.runtime?.id` is the discriminator, exported alongside the adapters. Code that needs extension-only APIs (`browser.tabs`, `browser.storage.local`, `browser.contextMenus`, `browser.identity`, `browser.action`) guards on `isExtension` or lives in `src/entrypoints/background.ts` (which only runs in the extension).

**Principle:** the `browserRuntime` seam exists because something actually varies across it (two adapters means a real seam). The same does **not** hold for hypothetical seams that only have one adapter. Do not introduce those speculatively.

---

<a id="execution-contexts"></a>
## Execution contexts and state ownership

### Extension: two contexts, one source of truth

In extension mode there are **two distinct JS contexts**. Each has its own module graph and its own `valtio` `store` instance:

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  Background service worker   │         │  UI (popup/sidepanel/tab)    │
│  src/entrypoints/background  │         │  App.tsx + tabs + components │
│                              │         │                              │
│  own `store` (proxy<AppState>)│◄──────►│  own `store` (proxy<AppState>)│
│  own StudySessionTimerManager │   msg   │  useStudyTimer (no manager)  │
│  own HybridStorage instance  │  bridge  │  useSnapshot(store) for UI   │
└─────────────┬────────────────┘         └──────────────┬───────────────┘
              │                                         │
              │   browser.storage.local / IndexedDB     │
              │   (shared, cross-context persistent)    │
              └───────────────────┬─────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │  HybridStorage    │  <- transport
                        │  ExchangeFormatV2 │  <- serialization
                        │  STORAGE_KEY =    │
                        │   'sp:appState...'│
                        └───────────────────┘
```

- **Storage is the source of truth.** Each context's `store` is a synced in-memory cache of what sits in `hybridStorage`. When the UI mutates its `store`, `subscribe(store)` triggers `persistStore()` -> `hybridStorage.setItem`. When the background's `store` mutates, the same happens from the background's `subscribe`. Cross-context sync: `hybridStorage.addChangeListener` fires in *both* contexts on storage events, and `setupStorageSynchronization` (`stores/app.ts:335`) re-imports the changed key into the local `store` (guarded by `isApplyingFromStorage` to avoid a persist loop).
- **The timer lives in the background** so it survives the popup closing. The UI never creates a `StudySessionTimerManager` in extension mode (`useStudyTimer.ts:8` guards on `!isExtension`). It talks to the background's manager over `browser.runtime` messages (`timer.start`/`timer.stop`/`timer.getState`/`timer.updateState`), and the background broadcasts `timer.broadcastState` back. This topology is key to the architecture. It is not friction to remove.
- **The background reads settings from its own `store`** (a synced cache) rather than re-fetching from storage on every use. This is the intended primary/replica pattern. The cross-context staleness window is inherent to the storage-event-based sync rather than an architectural flaw.

### Web: one context, one owner

In web mode there is **one** JS context. `useStudyTimer.ts:9` creates the `StudySessionTimerManager` at module scope (guarded by `!isExtension`), and `BrowserRuntimeStub` emulates the message bridge so the *same* `useStudyTimer` code works unchanged. The timer state still flows: manager private field -> `HybridStorage` (for reload-survival) -> `useState` in the hook (for render). This is a primary + persistence + render-replica pattern, not duplication.

### Implication for judging depth

Any module that looks "duplicated" or "split across contexts" needs evaluation against this dual-context model first. The `browserRuntime` seam and the per-context `store` instances are **earned** (two adapters). Criticisms that ignore the duality (e.g. "the background shouldn't read `snapshot(store)`") are wrong by default. Real friction is narrower: places where a lib module *writes* to the store singleton (crosses the seam the wrong way) or where coupling prevents testing.

---

## Module map

### Entrypoints (`src/entrypoints/`)

| Module | Interface | Role |
|---|---|---|
| `background.ts` | `defineBackground(() => void)` | Extension-only: context menus, keyboard commands, **owns the timer manager**, re-checks site blocking on tab navigation, badge updates |
| `content.ts` | `defineContentScript(...)` | Extension-only: injected into pages. Site-blocking overlay, text-selection capture, overlay iframe |
| `offscreen.ts` | `defineUnlistedScript(...)` | Chrome-only: plays audio in the background context (DOM-less service worker cannot play audio directly) |
| `popup/`, `sidepanel/`, `tab/` | `main.tsx` -> `<AppContainer mode=...>` | Thin React boots. Each renders the same `App` at different dimensions |

Entrypoints are **adapters** at the WXT seam. They satisfy the extension host's expectations and delegate to `AppContainer`. Keep them thin.

### App shell (`src/`)

| Module | Interface | Role |
|---|---|---|
| `AppContainer.tsx` | `<AppContainer mode />` | Wraps `AppContextProvider` + dimension tracking. The single entry to the React tree |
| `App.tsx` | default export `<StudyPortal />` | Tab bar (11 tabs), header, soundtrack, scroll-to-top, style hooks, GC-on-mount, OAuth redirect |
| `contexts/AppContext.tsx` | `useAppContext()` -> `{ mode, dimensions, isExtension }` | The Container Mode seam. Small, deep enough |
| `hooks/useStore.ts` | 13 hooks (`useItems`, `useCourses`, `useTheme`, ...) | Valtio access layer. Each hook `useSnapshot`s a slice and returns mutators that write to `store` |

`App.tsx` is large (~450 lines) but mostly JSX wiring of tabs. The interesting logic lives in the style hooks and the GC effect (see [Cross-cutting concerns](#cross-cutting-concerns)).

### Store (`src/stores/app.ts`)

- **Interface (exported):** `store` (valtio `proxy<AppState>`), `storeLoadingState`, `persistStore()`, `patchStoreState()`, `performGarbageCollection()`, `dataTransfer`, default-config constants.
- **Implementation:** `createInitialState()`, `loadState()` (async, reads `hybridStorage` -> `dataTransfer.importData`), `subscribe(store)` -> `persistStore`, `setupStorageSynchronization` (cross-context import on storage change), `updateProxyFromState` (recursive in-place valtio patcher for imports).

This is the **primary state module**. Its interface is broad (many exported defaults + the proxy + lifecycle functions), reflecting that it owns the whole `AppState` shape. Depth is moderate: a lot of behavior (`loadState`, `persistStore`, cross-context sync, proxy patching) sits behind `store` + `persistStore`, but `performGarbageCollection` and `updateProxyFromState` are concerns that arguably belong to other modules (file attachments, the repository). See the [candidates doc](./architecture-review-candidates.md).

<a id="state-access-hooks"></a>
### State access hooks (`src/hooks/useStore.ts`)

Thirteen hooks, one per `AppState` slice: `useItems`, `useCourses`, `useProjects`, `useTheme`, `useWellness`, `useFocusTimer`, `useGoogleCalendar`, `useStudySessions`, `useExamGrades`, `useDegreePlan`, `useSemesterDates`, `useWeather`, `useSoundtrack`, `useDashboardLayout`, `useCourseRecords`, `useWeeklyGoals`.

**Pattern:** each hook `useSnapshot`s its slice and returns `{ ...snapshot, mutator1, mutator2, ... }` where mutators write directly to `store`. This is the **valtio idiomatic access layer**. It concentrates store-mutation behind per-slice interfaces and gives components a small, typed surface. The hooks are not shallow pass-throughs. `useItems` owns id/timestamp stamping and cascading deletes (exam grades). `useCourses` owns course-deletion cascade (items + sessions + grades). `useWeeklyGoals` owns the random-color-on-complete behavior. These are real behaviors hidden behind a one-call interface.

### Items system (`src/items/`)

The "unified item management system". 23 files across a discriminated union of **Item** subtypes:

```
src/items/
├── models.ts          # type Item = ItemTask | ItemExam | ItemEvent | ItemTimetable + schema map
├── methods.ts         # getItemMethods(item) -> ItemMethods (dispatch table)
├── forms.ts           # form schema/default/hidden/disabled maps + model<->form converters
├── useItemDialog.ts   # dialog state + (currently) Google sync orchestration
├── ItemList.tsx       # generic list with search/filter
├── ItemDialogTrigger.tsx
├── ItemDialogExample.tsx
├── base/              # shared abstract classes: dialog, methods, schemas, form schemas
├── task/ event/ exam/ timetable/  # each: modelSchema, formSchema, methods, form
└── locales/           # i18n strings per item type
```

- **Depth:** the core (zod schemas per subtype, form schemas, model<->form converters) is real and deep. One `Item` union, one `parseItem`-shaped interface, four adapters. The wrapper layer (`ItemDialogTrigger`, `ItemDialogExample`) is shallow and copy-pasted across 7 tab call sites. `useItemDialog` mixes dialog state with Google Calendar sync orchestration (75-line `syncItemToGoogle`). This is a seam leak.
- **See [candidates doc](./architecture-review-candidates.md)** for the deepening proposal (provider + extracted sync).

### Lib (`src/lib/`)

| Module | Interface | Role | Notes |
|---|---|---|---|
| `hybrid-storage.ts` | `StorageAdapter` + `HybridStorage` + 4 adapters | Persistence transport | 750 lines. `BrowserStorageAdapter` (ext), `IndexedDBAdapter` (web), `LocalStorageAdapter` (fallback), `InMemoryAdapter` (tests) |
| `data-transfer.ts` | `DataTransfer` class: `exportData`/`importData`/`exportFile`/`importFile` | Serialization to `ExchangeFormatV2` + legacy migration | 664 lines. Owns `XItem*` parallel types (Date<->number), `convertLegacyItems` |
| `study-session-timer-manager.ts` | `StudySessionTimerManager` class: `handleMessage`, `getTimerState`, `startTimer`, `stopTimer`, `resetTimer`, `onStateChange` | Focus timer: phases, transitions, site blocking, notifications, audio, persistence | 453 lines. **Deep internally**, but imports `store` + `hybridStorage` + `notifications` + `site-blocking` at module top |
| `google-calendar-sync.ts` | `GoogleCalendarSync` class: `syncNewEvent`/`updateEvent`/`syncTaskToGoogle`/`syncExamToGoogle`/`deleteEvent`/`bulkSyncItems`/`fetchCalendars` | Google Calendar API adapter | 607 lines. 4 near-identical `sync*` methods, instance-level `retryAttempts` |
| `google-oauth.ts` | `GoogleOAuthManager`: `startOAuthFlow`/`refreshAccessToken`/`revokeToken`/`isTokenExpired` | OAuth via popup + `postMessage` handshake | 197 lines. **Hardcodes `REDIRECT_URI = 'http://localhost:5173/'`**. Web-only by construction |
| `file-attachment-storage.ts` | `fileAttachmentStorage` singleton: `storeFile`/`getFile`/`deleteFile`/`cleanupOrphanedFiles` | File attachment LRU + metadata | 213 lines. Stores base64 in `store.fileAttachments.files` (in-memory + persisted) |
| `site-blocking.ts` | `isSiteBlocked`/`cleanSites`/`enactSiteBlockingStrategy`/`enactSiteBlockingStrategyInTab` | Domain/path matching + tab messaging | 181 lines. Pure-ish matching + extension-only orchestration |
| `recurrence-utils.ts` | `isRecurrenceMatch`/`generateOccurrences`/`getNextOccurrence` | Recurrence expansion (daily/weekly/monthly/yearly, count/until, byWeekday) | **715 lines, zero production imports**. Written and tested (964 lines) but never wired into any calendar view |
| `date-utils.ts` | `getDateString`/`isSameDate`/`isDateInRange`/`createLocalMidnightDate`/... | Date helpers | tested |
| `notifications.ts` | `showNotification`/`requestNotificationPermission` | OS notifications (ext: `browser.notifications`, web: `Notification` API) | adapter over two notification backends |
| `audio.ts` | `playAudio`/`playAudioNow` | Sound playback (web: `Audio`, ext: offscreen document message) | adapter over two audio backends |
| `technique-utils.ts` | `getTechniqueConfig`/`getPhaseDurationSeconds`/`shouldTransitionPhase`/`getNextPhase`/`getPhaseEmoji` | Pomodoro/flow technique definitions + phase math | pure, testable |
| `navigation-utils.ts` | `handleNavigationClick` | Hash-vs-click nav helper | thin |
| `translation-utils.ts` | `getNotificationTranslationAsync` | i18n for timer notifications | thin |
| `browser-runtime-stub.ts` | `browserRuntime`/`browserRuntimeStub`/`isExtension` | The [runtime seam](#runtime-seam) | 90 lines. Two adapters |

### Hooks (`src/hooks/`)

| Hook | Role | Depth |
|---|---|---|
| `useStore.ts` | [State access hooks](#state-access-hooks) | deep |
| `useStudyTimer.ts` | Timer UI bridge: `useState` + `browserRuntime` messages | moderate. The message bridge is key to the architecture (see [Execution contexts and state ownership](#execution-contexts)) |
| `useModeAwareTab.ts` | Per-mode active tab persistence + hash nav | deep. Hides the "remember tab per Container Mode" rule |
| `useSettingsDialog.ts` | Settings dialog open state | moderate |
| `useDataMigration.ts` | One-shot legacy-data migration on mount | moderate |
| `useOAuthRedirect.ts` | Popup-side: reads `?code=` and `postMessage` to opener | thin adapter (web OAuth flow) |
| `useHashNavigation.ts`, `useScrollToTop.ts`, `useContextMenu.ts`, `useConfetti.ts`, `useLocalization.ts`, `useAccentColorStyles.ts`, `useBaseStyles.ts`, `useCardOpacityStyles.ts`, `useCardCollapse.ts`, `useDarkModeStyles.ts` | UI utilities & style injectors | mostly thin. `useCardCollapse` is **dead/broken** (references non-existent `useDashboardLayout` methods, zero call sites) |

### Tabs (`src/tabs/`)

11 tab screens: `DashboardTab`, `PlannerTab`, `ProjectsTab`, `TimetableTab`, `UglyCalendarPlannerTab`, `CourseManagerTab`, `DegreePlanTab`, `StudyTrackerTab`, `WellnessTab`, `SettingsTab`, `TestTab`. Each is a large component that composes hooks, components, and (for item-creating tabs) the items system. They are the **callers** of the rest of the system, not modules meant to be deep themselves.

### Components (`src/components/`)

Shared UI: `OverflowTabs`, `MiniCalendar`, `PlannerMonthView`, `PlannerWeekView`, `PlannerSharedComponents`, `CourseRecordCalendar`, `SwipeableExam`, `SwipeableTask`, `Upcoming`, `TodaySchedule`, `TasksProgressBar`, `SoundtrackCard`, `WeatherWidget`, `TipsRow`, `SyllabusUpload`, `StorageInfoCard`, `LoadingScreen`, `ErrorBoundary`, `LanguageSelector`, `MoonSunToggle`, `CurrentDateTime`, `DebugClearStorage`, `LevelsSlider`, `UglyCalendar.css`, `settings/` (settings dialog components), `ui/` (shadcn/ui primitives).

---

## Data model and persistence

### `AppState` (`src/types.d.ts` + `stores/app.ts:109`)

The single valtio state shape, owned by `stores/app.ts`. Slices: `items`, `courses`, `projects`, `sessions`, `examGrades`, `sessionTasks`, `weeklyGoals`, `degreePlan`, `semesterDates`, `courseRecords`, `theme`, `soundtrack`, `weather`, `googleCalendar`, `wellness`, `fileAttachments`, `dashboard`, `activeTabsByMode`, `focusTimer`, `selectedCourseId`.

### Item: the discriminated union

```
Item = ItemTask | ItemExam | ItemEvent | ItemTimetable   (src/items/models.ts)
```

Each subtype has a zod schema (`*/modelSchema.ts`), a form schema (`*/formSchema.ts`), methods (`*/methods.tsx`: icon/color/metadata), and a form (`*/form.tsx`). `forms.ts` aggregates per-type maps for form schema/defaults/hidden/disabled/converter. `models.ts` exports `itemTypeToSchemaMap` and `ITEM_TYPES`.

**Recurrence** is modeled on `ItemEvent` (`event/modelSchema.ts:5-25`: `frequency`/`interval`/`byWeekday`/`count`/`until`) and collected by the form, but **no calendar view expands it**. See [Calendar / Planner](#calendar-planner) and the [candidates doc](./architecture-review-candidates.md).

<a id="persistence-path"></a>
### Persistence path

```
component mutates store
  -> valtio subscribe (stores/app.ts:299)
  -> persistStore() (309)
  -> dataTransfer.exportData() (315)  <- produces ExchangeFormatV2 (data-transfer.ts:16)
  -> hybridStorage.setItem('sp:appStateExchange', exchangeData)  <- transport (hybrid-storage.ts)
```

On load / cross-context sync:

```
hybridStorage.getItem('sp:appStateExchange')
  -> dataTransfer.importData(data) (stores/app.ts:228 / 341)
  -> updateProxyFromState(store, loadedState)  <- recursive in-place valtio patcher (408)
```

The **timer** persists separately: `STORAGE_KEY = 'sp:studySessionTimerState'` via its own `HybridStorage([BrowserStorageAdapter, LocalStorageAdapter])` instance (`study-session-timer-manager.ts:13-15`). This separation is **intentional**. The timer must persist on every tick without triggering a full-app `persistStore` cycle.

### `ExchangeFormatV2` (`data-transfer.ts:185`)

The on-disk shape. Notable: `items: XItem[]` uses `number` timestamps (`dueAt: number`, `startsAt: number`) where the in-memory `Item` uses `Date`. Conversion is regex-based: `convertDatesToTimestamps(items, /(At|^until)$/)` (line 24). The `XItem*` types (line 421) are a **parallel type system** to the zod schemas. They can drift. Legacy arrays (`exams`, `tasks`, `regularEvents`, `timetableEvents`) are migrated by `convertLegacyItems` (line 473).

---

## Feature architectures

### Focus timer / Study Session

**Two execution paths** selected by `isExtension`:

- **Extension:** `background.ts` owns the `StudySessionTimerManager`. The UI (`useStudyTimer`) sends `timer.*` messages over `browserRuntime`. The background's `onMessage` forwards timer messages to `timerManager.handleMessage`. The background broadcasts `timer.broadcastState` back. The UI's `onMessage` updates `useState`. Site blocking (`site-blocking.ts`) runs from the background on phase transitions and on `tabs.onUpdated` (re-checks when a tab navigates mid-session). Audio plays via the offscreen document (DOM-less service worker cannot play audio). Badge text shows remaining/elapsed time.
- **Web:** `useStudyTimer.ts:9` creates the manager in-bundle. `BrowserRuntimeStub` emulates the bridge so the same code works. Site blocking is a no-op (`enactSiteBlockingStrategy` guards on `isExtension`). Audio plays directly. No badge.

**Settings** (`store.focusTimer`: `audioEnabled`, `audioVolume`, `notificationsEnabled`, `showCountdown`, `blockingStrategy`, `sites`) are read by the manager via `snapshot(store).focusTimer` (`study-session-timer-manager.ts:44`). This is the synced-cache read. It is the cleanest way for the background to get current settings without its own React.

**Known seam leak:** the manager *writes* `store.focusTimer.notificationsEnabled = false` (line 346) when permission is denied. A lib module mutates the app store singleton. Read is justified, write is not. See [Candidate C](./architecture-review-candidates.md#candidate-c) in the candidates doc.

<a id="calendar-planner"></a>
### Calendar / Planner

Five calendar-shaped views, each with its own event-query logic:

| View | File | Event query |
|---|---|---|
| Planner (month/week) | `PlannerTab.tsx` + `PlannerMonthView.tsx` + `PlannerWeekView.tsx` | `getAllEventsForDate` at `PlannerTab.tsx:91-113` (filters timetable, completed, multi-day, course) |
| Mini calendar | `MiniCalendar.tsx` | own `getAllEventsForDate` at `:67-92` (different filter rules) |
| Course records | `CourseRecordCalendar.tsx` | own version |
| Ugly calendar | `UglyCalendarPlannerTab.tsx` | own version |
| Dashboard upcoming | `Upcoming.tsx` / `TodaySchedule.tsx` | own filtering |

**Recurrence is modeled but not expanded.** `recurrence-utils.ts` (715 lines, `isRecurrenceMatch`/`generateOccurrences`/`getNextOccurrence`) has **zero production imports**. Only `.examples.ts` and `.test.ts` import it. A recurring `ItemEvent` shows once, on `startsAt`. The form collects recurrence, Google sync converts it to RRule (`google-calendar-sync.ts:498-519`), but local views never expand it. A wiring step is missing, not a module. See [Candidate B](./architecture-review-candidates.md#candidate-b) in the candidates doc.

Drag-and-drop rescheduling in `PlannerTab.tsx:136-163` branches on `item.type` and uses `as any` casts to call `updateItem` because the union narrowing is lost across the update signature.

### Google Calendar sync

- **`google-oauth.ts`**: popup + `postMessage` handshake. **`REDIRECT_URI = 'http://localhost:5173/'`** hardcoded (line 4). This is the **web-app OAuth flow**. In extension mode the UI runs at `chrome-extension://<id>/popup.html`, not `localhost:5173`, so the redirect would not land back in the extension. Unless a separate `chrome.identity.launchWebAuthFlow` path exists (none found in `google-oauth.ts`), **Google Calendar sync is effectively web-only by construction**. `GOOGLE_CLIENT_SECRET` sits in `import.meta.env` (client-side secret. Should use PKCE). Open question: is sync intended to work in extension mode? See [Candidate F](./architecture-review-candidates.md#candidate-f) in the candidates doc.
- **`google-calendar-sync.ts`**: 607-line class. `convertItemToGoogleEvent` + 4 `sync*` methods (one per item type that syncs) + `deleteEvent` + `bulkSyncItems` + `fetchCalendars`/`fetchEventsFromCalendar` + private `makeApiRequest` (with retry). `retryAttempts` is instance-level (concurrent calls share it. Latent bug). `convertRecurrenceToRRule` is real, non-shallow, private, untested.
- **`useItemDialog.ts:108-193`**: the caller inlines a 75-line `syncItemToGoogle` that branches on `item.type` and re-saves the item with the returned `googleEventId` via a second `updateItem`. The type-dispatch is duplicated with `bulkSyncItems`. See [Candidate A](./architecture-review-candidates.md#candidate-a) and [Candidate F](./architecture-review-candidates.md#candidate-f) in the candidates doc.

### File attachments

`file-attachment-storage.ts` stores **base64 in `store.fileAttachments.files`** (in-memory, in the valtio proxy). Every `persistStore` serializes all base64 files into `ExchangeFormatV2.fileAttachments`. An LRU cache helps reads, not the persistence bloat. `performGarbageCollection` (`stores/app.ts:356-405`) scans rich-text HTML (`[data-type="file-attachment"]`/`[data-file-id]`) in item notes + `course.syllabusFileId` and calls `cleanupOrphanedFiles`. The GC logic (HTML structure knowledge) lives in the store module, not the file-attachment module. This is a locality problem. See [Candidate D](./architecture-review-candidates.md#candidate-d) and [Candidate G](./architecture-review-candidates.md#candidate-g) in the candidates doc.

### Localization

i18next with per-namespace JSON (`src/locales/{en,es}/`). The content script (`content.ts`) imports translations directly (no i18next in the content-script context) via a small `getTranslation` helper. `listenLanguageChangeInExtensionBackground` keeps the background's language in sync.

---

<a id="cross-cutting-concerns"></a>
## Cross-cutting concerns

### State access discipline

The intended pattern: **components call `useXxx()` hooks from `useStore.ts`, never import `store` directly.** `store` is exported (lib modules need it), but UI components should go through the hooks. Violations of this (lib modules writing to `store`, components reaching past the hooks) are the most common seam leak. See the [candidates doc](./architecture-review-candidates.md).

### Style injection

Five style hooks run in `App.tsx:135-138`: `useDarkModeStyles`, `useAccentColorStyles`, `useBaseStyles`, `useCardOpacityStyles`. Each `useLayoutEffect`s a `<style>` tag or `document.documentElement` class. `useBaseStyles` (133 lines) is a one-shot static CSS injector that could be a `.css` file. `useCardCollapse` is dead/broken.

### Testing

- **Runner:** Vitest + jsdom + Testing Library (`vitest.config.ts`).
- **Coverage today:** `date-utils.test.ts`, `recurrence-utils.test.ts` (715-line module, 964-line test, **not wired into production**), `forms.test.ts` (exercises `createItemModelFromForm`/`updateItemModelFromForm` which the app **doesn't call**. `useItemDialog` bypasses them), `useItemDialog.test.ts` (only state transitions, never `handleSave`/`handleDeleteItem`), `ItemList.test.tsx` (fully mocks `useItemDialog`. Render smoke test), `MiniCalendar.test.ts` (only `buildCalendarMatrix`), `timetable/modelSchema.test.ts`.
- **Pattern:** tests concentrate on **leaf pure functions**. The bugs live in **cross-module wiring** (sync, storage, timer bridge, event queries, GC), which is largely untested. The "interface is the test surface" principle is violated where the tested surface and the used surface diverge (e.g. `forms.ts` helpers tested but unused; `useItemDialog`'s risky `handleSave` untested).
- **Untested high-risk modules:** `study-session-timer-manager.ts` (0), `hybrid-storage.ts` (0), `data-transfer.ts` (0), `google-calendar-sync.ts` (0), `google-oauth.ts` (0), `site-blocking.ts` (0), `stores/app.ts` (0), `file-attachment-storage.ts` (0), all calendar views (0).

### Build

- **Web:** Vite (`vite.config.js`, `index.html`, `src/main.tsx`).
- **Extension:** WXT (`wxt.config.ts`, `src/entrypoints/*`). WXT wraps Vite. `@wxt-dev/module-react` adds React. Manifest declares `storage`, `unlimitedStorage`, `activeTab`, `sidePanel`, `contextMenus`, `alarms`, `scripting`, `offscreen`, `notifications`, `identity`. Host permissions `<all_urls>` + Google OAuth origins.
- **Feature flags:** `VITE_FEATURE_UGLY_CALENDAR`, `VITE_FEATURE_TESTING` gate optional tabs.
- **Scripts:** `dev` (Vite), `dev:ext` (WXT), `build`/`build:ext`, `lint` (= `tsc`), `test` (Vitest), `check` (lint + build + test).

---

<a id="principles-in-force"></a>
## Principles in force (baseline)

These describe the **current** conventions rather than aspirations. Future work should preserve them unless a candidate explicitly revisits one.

1. **Storage is the source of truth. Per-context `store` instances are synced caches.** Do not propose "unify the stores into one". The duality is key to the architecture.
2. **The `browserRuntime` seam is real (two adapters).** New extension-only behavior goes through `isExtension` guards or lives in `background.ts`. Web parity goes through `BrowserRuntimeStub`.
3. **Components access state via `useXxx()` hooks, not `store` directly.** Lib modules may import `store` for reads (synced cache), but writes should go through an injected callback or the React layer.
4. **The timer lives in the background in extension mode.** It survives popup close. Do not propose moving it into React.
5. **The timer persists under its own storage key.** Do not propose merging it into the app exchange format. The per-tick persist cadence is different from app-state persist.
6. **Items are a discriminated union of four subtypes.** New item kinds extend the union, not the schema.
7. **Domain language follows `CONTEXT.md`** (Item/Task/Exam/Event/Timetable, Course/DegreeCourse/Degree Plan, Study Session, Project, Wellness, Container Mode). Do not introduce "Entry/Record/Assignment/Homework/Class/Schedule/Module/Activity" synonyms.

---

<a id="open-questions"></a>
## Open architectural questions

Surfaces where the baseline is unresolved or where a decision is pending. These are candidates for ADRs during grilling.

1. **Is Google Calendar sync intended to work in extension mode?** The OAuth `REDIRECT_URI` is hardcoded to `localhost:5173` (web). If extension sync is in scope, the `OAuthClient` needs a `chrome.identity.launchWebAuthFlow` adapter (a second adapter at the OAuth seam). If out of scope, record it as an ADR so future reviews do not re-flag it.
2. **Is recurrence expansion in scope?** The module + tests exist but no view wires it in. Either wire it ([Candidate B](./architecture-review-candidates.md#candidate-b)) or delete the 715+964 lines and stop collecting recurrence in the form.
3. **Should `XItem*` types in `data-transfer.ts` be derived from the zod schemas?** The parallel type system can drift. A schema-driven exchange format would close the gap.
4. **Should file attachments live in `store` (base64) or in storage (per-file keys)?** The current design bloats every persist with all base64. Moving to per-key storage is a real seam change.
5. **Where does `performGarbageCollection` belong?** It sits in `stores/app.ts` but knows about rich-text HTML structure. Moving it to `file-attachment-storage.ts` would co-locate file lifecycle.

---

## How to use this document

- **Before proposing a refactor:** check [Principles in force](#principles-in-force) and [The architectural key constraint](#dual-surface) plus [Execution contexts and state ownership](#execution-contexts). If your proposal contradicts either, it needs an ADR (see [Open architectural questions](#open-questions)) explaining why.
- **When naming a new module:** use `CONTEXT.md` domain terms + `codebase-design` architecture terms. Do not invent synonyms.
- **When evaluating depth:** apply the deletion test. Would deleting the module concentrate complexity (earns its keep) or just move it (shallow)?
- **Deepening opportunities** are tracked in [architecture-review-candidates.md](./architecture-review-candidates.md), not here. This doc describes the baseline. That doc proposes changes.