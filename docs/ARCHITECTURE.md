# StudyHub Architecture Baseline

> A description of the system **as it is today**, not as it should be. This document is the shared reference for future architecture work.
>
> Vocabulary follows [`codebase-design`](https://github.com/...): **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality**. Do not use "component/service/API/boundary." Domain terms follow [`CONTEXT.md`](../CONTEXT.md): **Item**, **Task**, **Exam**, **Event**, **Timetable**, **Course**, **Degree Plan**, **Study Session**, **Project**, **Wellness**, **Container Mode**.

---

<a id="dual-surface"></a>

## The architectural key constraint: dual surface

StudyHub runs as **one codebase, two execution models**. This single fact shapes every architectural decision below. Understand it before you judge any module's shape.

### Container Modes

Six render surfaces, all backed by the same React app (`App.tsx` via `AppContainer`). Only `AppContainerMode` and the available dimensions distinguish them:

| Mode        | Entry point                    | Lifetime           | Has `browser.*`?              |
| ----------- | ------------------------------ | ------------------ | ----------------------------- |
| `web`       | `src/main.tsx`                 | Page session       | No. Uses `browserRuntimeStub` |
| `popup`     | `src/entrypoints/popup/`       | Closes on blur     | Yes                           |
| `sidepanel` | `src/entrypoints/sidepanel/`   | Persistent per tab | Yes                           |
| `tab`       | `src/entrypoints/tab/`         | Full browser tab   | Yes                           |
| `overlay`   | content-script-injected iframe | Until removed      | Yes (via content script)      |
| `newtab`    | (reuses `tab` entry)           | Full browser tab   | Yes                           |

`AppContext` (`src/contexts/AppContext.tsx`) exposes `{ mode, dimensions, isExtension }`. `isExtension` is the branch that selects which runtime adapter is in play.

<a id="runtime-seam"></a>

### The runtime seam

`src/lib/browser-runtime-stub.ts` defines the seam between extension and web:

- **Interface:** `browserRuntime.sendMessage(msg)` / `browserRuntime.onMessage.addListener(fn)`. A subset of `browser.runtime` for inter-context messaging.
- **Two adapters:**
  - Extension: `browser.runtime` (WXT's `wxt/browser`).
  - Web: `BrowserRuntimeStub`. An in-process pub/sub that emulates `browser.runtime`'s message API so the _same_ code path works.

`isExtension = !!browser?.runtime?.id` is the discriminator, exported alongside the adapters. Code that needs extension-only APIs (`browser.tabs`, `browser.storage.local`, `browser.contextMenus`, `browser.identity`, `browser.action`) guards on `isExtension` or lives in `src/entrypoints/background.ts` (which only runs in the extension).

**Principle:** the `browserRuntime` seam exists because something actually varies across it (two adapters means a real seam). The same does **not** hold for hypothetical seams that only have one adapter. Do not introduce those speculatively.

---

<a id="execution-contexts"></a>

## Execution contexts and state ownership

### Extension: two contexts, one source of truth

In extension mode there are **two distinct JS contexts**. Each has its own module graph and its own `valtio` `store` instance:

```
┌───────────────────────────────┐         ┌───────────────────────────────┐
│  Background service worker    │         │  UI (popup/sidepanel/tab)     │
│  src/entrypoints/background   │         │  App.tsx + tabs + components  │
│                               │         │                               │
│  own `store` (proxy<AppState>)│◄───────►│  own `store` (proxy<AppState>)│
│  own StudySessionTimerManager │   msg   │  useStudyTimer (no manager)   │
│  own HybridStorage instance   │  bridge │  useSnapshot(store) for UI    │
└─────────────┬─────────────────┘         └──────────────┬────────────────┘
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

- **Storage is the source of truth.** Each context's `store` is a synced in-memory cache of what sits in `hybridStorage`. When the UI mutates its `store`, `subscribe(store)` triggers `persistStore()` -> `repo.save()`. When the background's `store` mutates, the same happens from the background's `subscribe`. Cross-context sync: `repo.subscribe()` wires `hybridStorage.addChangeListener`, which fires in _both_ contexts on storage events, and `setupStorageSynchronization` re-imports the changed key into the local `store` via `repo.patch` (guarded by `isApplyingFromStorage` to avoid a persist loop).
- **The timer lives in the background** so it survives the popup closing. The UI never creates a `StudySessionTimerManager` in extension mode (`useStudyTimer` guards on `!isExtension`). It talks to the background's manager over `browser.runtime` messages (`timer.start`/`timer.stop`/`timer.getState`/`timer.updateState`), and the background broadcasts `timer.broadcastState` back. This topology is key to the architecture. It is not friction to remove.
- **The background reads settings from its own `store`** (a synced cache) rather than re-fetching from storage on every use. This is the intended primary/replica pattern. The cross-context staleness window is inherent to the storage-event-based sync rather than an architectural flaw.

### Web: one context, one owner

In web mode there is **one** JS context. `useStudyTimer` creates the `StudySessionTimerManager` at module scope (guarded by `!isExtension`), and `BrowserRuntimeStub` emulates the message bridge so the _same_ `useStudyTimer` code works unchanged. The timer state still flows: manager private field -> `HybridStorage` (for reload-survival) -> `useState` in the hook (for render). This is a primary + persistence + render-replica pattern, not duplication.

### Implication for judging depth

Any module that looks "duplicated" or "split across contexts" needs evaluation against this dual-context model first. The `browserRuntime` seam and the per-context `store` instances are **earned** (two adapters). Criticisms that ignore the duality (e.g. "the background shouldn't read `snapshot(store)`") are wrong by default. Real friction is narrower: places where a lib module _writes_ to the store singleton (crosses the seam the wrong way) or where coupling prevents testing.

---

## Module map

### Entrypoints (`src/entrypoints/`)

Four kinds of entrypoint, all adapters at the WXT seam:

| Kind           | Interface                      | Role                                                                                                |
| -------------- | ------------------------------ | --------------------------------------------------------------------------------------------------- |
| Background     | `defineBackground`             | Extension-only: context menus, keyboard commands, **owns the timer manager**, site blocking, badges |
| Content script | `defineContentScript`          | Extension-only: injected into pages. Site-blocking overlay, text-selection capture, overlay iframe  |
| Offscreen      | `defineUnlistedScript`         | Chrome-only: plays audio in the background context (DOM-less service worker cannot play audio)      |
| UI boots       | `main.tsx` -> `<AppContainer>` | Thin React boots (popup/sidepanel/tab). Each renders the same `App` at different dimensions         |

Keep entrypoints thin. They satisfy the extension host's expectations and delegate to `AppContainer`.

### App shell (`src/`)

- **`AppContainer.tsx`**: wraps `AppContextProvider` + dimension tracking. The single entry to the React tree.
- **`App.tsx`**: tab bar, header, soundtrack, scroll-to-top, style hooks, GC-on-mount, OAuth redirect. Mostly JSX wiring of tabs. The interesting logic lives in the style hooks and the GC effect (see [Cross-cutting concerns](#cross-cutting-concerns)).
- **`contexts/AppContext.tsx`**: the Container Mode seam (`{ mode, dimensions, isExtension }`). Small, deep enough.
- **`hooks/useStore.ts`**: the valtio access layer (see [State access hooks](#state-access-hooks)).

### Store (`src/stores/app.ts`)

The **primary state module**. Owns the whole `AppState` shape through a valtio `proxy<AppState>` plus lifecycle functions (`persistStore`, `patchStoreState`, `storeLoadingState`). Persistence lifecycle (serialization, transport, cross-context sync, proxy patching) is delegated to the **repository** (`src/lib/repository.ts`), created via `createRepository` and wired with `serialize`/`deserialize` from `data-transfer.ts`. The store also re-exports default config constants from `@/lib/defaults`. See [ADR 0004](./adr/0004-repository-seam-for-app-state.md) and [ADR 0005](./adr/0005-migration-pipeline.md).

<a id="state-access-hooks"></a>

### State access hooks (`src/hooks/useStore.ts`)

One hook per `AppState` slice, plus `useStoreLoading` and `useAppState` for the whole-state concerns.

**Pattern:** each hook `useSnapshot`s its slice and returns `{ ...snapshot, mutator1, mutator2, ... }` where mutators write directly to `store`. This is the **valtio idiomatic access layer**. It concentrates store-mutation behind per-slice interfaces and gives components a small, typed surface. The hooks are not shallow pass-throughs. Several own real behaviors hidden behind a one-call interface: cascading deletes (`useItems` stamps id/timestamps and cascades exam grades; `useCourses` cascades items + sessions + grades), and presentation behaviors (`useWeeklyGoals` owns the random-color-on-complete behavior).

### Items system (`src/items/`)

The "unified item management system." A discriminated union of **Item** subtypes:

```
Item = ItemTask | ItemExam | ItemEvent | ItemTimetable   (src/items/models.ts)
```

Each subtype has its own directory with a zod schema (`modelSchema`), a form schema (`formSchema`), methods (icon/color/metadata), and a form. A shared `base/` directory holds abstract classes for dialog, methods, schemas, form schemas, and field wrappers. `models.ts` exports the schema map and `ITEM_TYPES`. `methods.ts` provides the dispatch table (`getItemMethods`). `forms.ts` aggregates per-type maps and the model<->form converters.

**Depth:** the core (zod schemas per subtype, form schemas, model<->form converters) is real and deep. One `Item` union, one `parseItem`-shaped interface, four adapters. A single `<ItemDialogProvider>` in `App.tsx` mounts the one `<ItemDialog>` and exposes `useItemDialog()` as a context consumer. Every tab and component that creates or edits items calls `useItemDialog()` from context and renders zero dialog JSX. `useItemDialogState` holds the pure dialog state (open/close/form transitions, no store, no sync). `useItemDialog` wraps it with the `handleSave`/`handleDelete` wiring: it calls `googleCalendarSync.syncItem`/`deleteItem`, stamps the returned `googleEventId` via `updateItem`, and uses `convertItemFormToModel`/`convertItemModelToForm` from `forms.ts` to translate between form and model shapes. The dialog survives tab switches because one provider instance backs the whole app.

### Domain (`src/domain/`)

Pure, framework-free functions per domain cluster. Five modules extracted from the tab components that previously duplicated this logic:

- **`grades.ts`**: course average (`calculateCourseAverage`), grade add/update/clear (`computeUpdatedGrades`), per-course open task / upcoming exam stats (`computeCourseStats`).
- **`degree-plan.ts`**: prerequisite checking (`checkPrerequisites`), course status enum (`getCourseStatus` returns `'completed' | 'available' | 'blocked'`; the UI maps the enum to colors), credit totals, semester operations (add course, toggle completion, append semester).
- **`wellness.ts`**: active mood keys (`getActiveMoods`), mood selection math (`computeMoodSelection`), hydration goal/day-entry computation (`computeDailyHydration`), and date lookups.
- **`item-sorting.ts`**: `sortTasks` (date or priority order) and `sortExamsByDate`, both via `toSorted()`.
- **`item-filtering.ts`**: `isOverdue`, `getOverdueItems`. Date comparisons are calendar-day, reusing `isDateBefore` from `src/lib/date-utils.ts`.

Domain modules never import the valtio store (see [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md)). Input arrays are `readonly` so valtio snapshot arrays pass through without casts. The tab components call these modules; `src/lib/` stays for date/string/storage utilities, `src/domain/` holds per-cluster business rules.

### Lib (`src/lib/`)

Organized by architectural role:

**Persistence layer.** Three modules form a layered persistence stack:

- **`hybrid-storage.ts`** (`HybridStorage` + `StorageAdapter`): the transport. Four adapters select the backend at runtime: `BrowserStorageAdapter` (extension), `IndexedDBAdapter` (web), `LocalStorageAdapter` (fallback), `InMemoryAdapter` (tests).
- **`repository.ts`** (`createRepository` -> `Repository<S>`): the lifecycle. Owns load/save/subscribe/patch and applies version-gated migrations. The recursive in-place valtio patcher (`updateProxyFromState`) lives here. See [ADR 0004](./adr/0004-repository-seam-for-app-state.md) and [ADR 0005](./adr/0005-migration-pipeline.md).
- **`data-transfer.ts`** (`serialize`/`deserialize` + `exportFile`/`importFile`): the serialization. Produces `ExchangeFormatV2`, the on-disk shape. Owns the `XItem*` parallel type system (Date <-> number timestamps). Legacy arrays are migrated by `migrations/v1-to-v2.ts` (see [ADR 0005](./adr/0005-migration-pipeline.md)).

**Runtime seam.** `browser-runtime-stub.ts` (see [The runtime seam](#runtime-seam)).

**Timer.** `study-session-timer-manager.ts` (`StudySessionTimerManager`): deep class owning focus timer phases, transitions, site blocking, notifications, audio, and persistence. Store access (reads + writes) is injected via constructor callbacks. Side-effect modules (`notifications`, `site-blocking`, `audio`) are imported at module top. The manager never imports `store`. See [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md).

**Google integration.** Two modules behind a seam:

- **`google-oauth.ts`** (`GoogleOAuthManager`): thin wrapper over Google Identity Services (GIS). Web-only by decision. See [ADR 0006](./adr/0006-google-calendar-sync-web-only.md) + [ADR 0007](./adr/0007-google-identity-services-for-oauth.md).
- **`google-calendar-sync.ts`** (`GoogleCalendarSync`): one `syncItem(item, ctx)` path for all item types, converts with a `convertItemToGoogleEvent` switch, skips `Timetable` items. The sync returns the `googleEventId`; the caller stamps it via `updateItem`. See [ADR 0002](./adr/0002-sync-module-does-not-write-store.md). Token refresh is injected via a `getValidAccessToken` callback.

**File attachments.** Two modules:

- **`file-attachment-storage.ts`** (`fileAttachmentStorage` + `FileRepository` interface): stores base64 in `store.fileAttachments.files` (in-memory, in the valtio proxy, serialized into every `persistStore`). Reads/writes go through an injected `FileRepository` (the store supplies it).
- **`file-attachment-gc.ts`** (`runFileAttachmentGC`): scans item notes + `course.syllabusFileId` for referenced file ids and calls `cleanupOrphanedFiles`. Runs on app startup, not from the store. See [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md).

**Calendar queries.** Two modules:

- **`calendar-queries.ts`** (`getItemsInRange`/`getItemsOnDate`): the shared calendar query, returns `CalendarEntry[]`. See [ADR 0001](./adr/0001-calendar-entry-return-shape.md).
- **`recurrence-utils.ts`** (`generateRecurrenceOccurrences`/`isRecurrenceMatch`/`getNextOccurrence`): recurrence expansion, wired into `getItemsInRange` via the `expandRecurrence` option (default `true`).

**Adapters.** `notifications.ts` (ext: `browser.notifications`, web: `Notification` API), `audio.ts` (web: `Audio`, ext: offscreen document message), `site-blocking.ts` (domain/path matching + extension-only tab orchestration).

**Utilities.** `date-utils.ts` (date helpers), `technique-utils.ts` (Pomodoro/flow phase math), `defaults.ts` (default config constants), `semester-events.ts` (auto-generate semester-boundary `ItemEvent`s from `SemesterDates`), `utils.ts` (`uid`, `cn`, color helpers), `navigation-utils.ts`, `translation-utils.ts`.

### Hooks (`src/hooks/`)

- **`useStore.ts`**: [state access hooks](#state-access-hooks). Deep.
- **`useStudyTimer.ts`**: timer UI bridge (`useState` + `browserRuntime` messages). The message bridge is key to the architecture (see [Execution contexts and state ownership](#execution-contexts)).
- **`useModeAwareTab.ts`**: per-mode active tab persistence + hash nav. Deep. Hides the "remember tab per Container Mode" rule.
- **`useGoogleCalendarSync.ts`**: constructs the `getValidAccessToken` callback and exposes pre-wired sync methods. Injects token refresh into `GoogleCalendarSync` via constructor callback (see [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md)).
- **`useSettingsDialog.ts`**: settings dialog open state.
- **Style injectors** (`useDarkModeStyles`, `useAccentColorStyles`, `useBaseStyles`, `useCardOpacityStyles`): each `useLayoutEffect`s a `<style>` tag or `document.documentElement` class. Run in `App.tsx`. `useBaseStyles` is a one-shot static CSS injector that could be a `.css` file.
- **Other UI utilities** (`useHashNavigation`, `useScrollToTop`, `useContextMenu`, `useConfetti`, `useLocalization`): mostly thin.

### Tabs (`src/tabs/`)

Tab screens (Dashboard, Planner, Projects, Timetable, Ugly Calendar, Course Manager, Degree Plan, Study Tracker, Wellness, Settings, plus a feature-gated Test tab). Each is a large component that composes hooks, components, and (for item-creating tabs) the items system. They are the **callers** of the rest of the system, not modules meant to be deep themselves.

### Components (`src/components/`)

Shared UI components, settings dialog components, and `ui/` (shadcn/ui primitives, configured for JSX).

---

## Data model and persistence

### `AppState` (`src/types.d.ts`)

The single valtio state shape, owned by `stores/app.ts`. Comprises item-type collections (`items`, `courses`, `projects`, `sessions`, `examGrades`, `sessionTasks`, `weeklyGoals`, `courseRecords`), per-feature config slices (`theme`, `soundtrack`, `weather`, `googleCalendar`, `wellness`, `focusTimer`, `degreePlan`, `semesterDates`, `fileAttachments`, `dashboard`), and UI state (`activeTabsByMode`, `selectedCourseId`).

### Item: the discriminated union

Each subtype has a zod schema, a form schema, methods (icon/color/metadata), and a form. `forms.ts` aggregates per-type maps for form schema/defaults/hidden/disabled/converter. `models.ts` exports the schema map and `ITEM_TYPES`.

**Recurrence** is modeled on `ItemEvent` (`frequency`/`interval`/`byWeekday`/`count`/`until`) and collected by the form. The shared calendar query expands it by default (`expandRecurrence` option defaults to `true`). See [Calendar / Planner](#calendar-planner).

<a id="persistence-path"></a>

### Persistence path

```
component mutates store
  -> valtio subscribe
  -> persistStore()
  -> repo.save()  <- delegates to hybridStorage.setItem('sp:appStateExchange', ...)
  -> hybridStorage.setItem  <- transport
```

On load / cross-context sync:

```
hybridStorage.getItem('sp:appStateExchange')
  -> repo.load() / repo.subscribe()
  -> deserialize(data)  <- applies migrations, then returns AppState
  -> repo.patch(store, loadedState)  <- delegates to updateProxyFromState, recursive in-place valtio patcher
```

The **timer** persists separately under its own storage key (`sp:studySessionTimerState`) via its own `HybridStorage` instance. This separation is **intentional**. The timer must persist on every tick without triggering a full-app `persistStore` cycle.

### `ExchangeFormatV2`

The on-disk shape. Notable: `items: XItem[]` uses `number` timestamps where the in-memory `Item` uses `Date`. Conversion is regex-based. The `XItem*` types are a **parallel type system** to the zod schemas. They can drift. Legacy arrays (`exams`, `tasks`, `regularEvents`, `timetableEvents`) are migrated by `migrateV1ToV2` in `migrations/v1-to-v2.ts` (see [ADR 0005](./adr/0005-migration-pipeline.md)).

---

## Feature architectures

### Focus timer / Study Session

**Two execution paths** selected by `isExtension`:

- **Extension:** `background.ts` owns the `StudySessionTimerManager`. The UI (`useStudyTimer`) sends `timer.*` messages over `browserRuntime`. The background's `onMessage` forwards timer messages to `timerManager.handleMessage`. The background broadcasts `timer.broadcastState` back. The UI's `onMessage` updates `useState`. Site blocking runs from the background on phase transitions and on `tabs.onUpdated` (re-checks when a tab navigates mid-session). Audio plays via the offscreen document (DOM-less service worker cannot play audio). Badge text shows remaining/elapsed time.
- **Web:** `useStudyTimer` creates the manager in-bundle. `BrowserRuntimeStub` emulates the bridge so the same code works. Site blocking is a no-op (guards on `isExtension`). Audio plays directly. No badge.

**Settings** (`store.focusTimer`) are read by the manager via an injected `getFocusTimerSettings: () => FocusTimerConfig` constructor callback. The background and web singleton each pass `() => snapshot(store).focusTimer`. When notification permission is denied, the manager calls an injected `onNotificationPermissionDenied` callback; the caller layer writes `store.focusTimer.notificationsEnabled = false`. The manager itself never imports `store`. See [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md).

<a id="calendar-planner"></a>

### Calendar / Planner

Five calendar-shaped views share one query module:

| View                 | Query usage                                                         |
| -------------------- | ------------------------------------------------------------------- |
| Planner (month/week) | `getItemsOnDate` + view filters (completed tasks, multi-day toggle) |
| Mini calendar        | `getItemsOnDate` + view filter (completed tasks on non-past dates)  |
| Course records       | `getItemsOnDate` scoped by `courseFilter`                           |
| Ugly calendar        | `getItemsInRange` (events/tasks/exams) + inline timetable expansion |
| Dashboard upcoming   | own filtering (tasks/exams only, no date-cell query)                |

The shared query module `src/lib/calendar-queries.ts` exports `getItemsInRange(items, start, end, opts)` and `getItemsOnDate(items, date, opts)`, both returning `CalendarEntry[]`. Each entry carries the occurrence's effective `startsAt`/`endsAt` and `sequence` alongside the source `item`. The query answers "what occurs on this date." Views apply display filters (`hideCompleted`, `showMultiDay`) themselves. See [ADR 0001](./adr/0001-calendar-entry-return-shape.md).

**Recurrence is expanded.** `recurrence-utils.ts` is wired into `getItemsInRange` via the `expandRecurrence` option (default `true`). A recurring `ItemEvent` produces one `CalendarEntry` per matching date in the visible range. Timetable items are excluded from the shared query (their expansion uses a weekday pattern + timezone, a different mechanism kept inline in `UglyCalendarPlannerTab`).

**Open question: the timetable expansion timezone.** The inline timetable expansion hardcodes `America/Santiago` as the timezone (`UglyCalendarPlannerTab.tsx`). The user never selects a timezone. Resolving the default (a user setting, or the device timezone) needs an ADR.

### Google Calendar sync

Three modules, each behind a seam:

- **`google-oauth.ts`**: Google Identity Services (GIS) token client. Loads the GIS script lazily, exposes `startOAuthFlow` / `refreshAccessToken` / `revokeToken` / `isTokenExpired`. No `REDIRECT_URI`, no client secret, no popup management. Sync is **web-only by decision**: the extension has no GIS adapter and the Google Calendar settings section is hidden in extension mode. See [ADR 0006](./adr/0006-google-calendar-sync-web-only.md) + [ADR 0007](./adr/0007-google-identity-services-for-oauth.md). Token refresh is wired through a `getValidAccessToken` callback injected into `GoogleCalendarSync` by the `useGoogleCalendarSync` hook (following the injected-callback pattern from [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md)).
- **`google-calendar-sync.ts`**: one `syncItem(item, ctx)` path for all item types; it converts the item with a `convertItemToGoogleEvent` switch, POSTs for a new item and PUTs when the item already carries a `googleCalendarEventId`, and skips `Timetable` items (weekly patterns, not dated events). `deleteItem` deletes for any item type. `bulkSyncItems` upserts by routing each item through `syncItem`. Retry is per call. The context carries `courses`/`projects` name maps. The callers stamp the returned `googleEventId` via `updateItem`. This "sync returns the id, caller stamps it" seam is recorded in [ADR 0002](./adr/0002-sync-module-does-not-write-store.md).
- **`useItemDialog.ts`**: the caller's `handleSave` calls `googleCalendarSync.syncItem(item, ctx)`, stamps the returned `googleEventId` via a single `updateItem` on success, and logs errors silently. `handleDelete` calls `googleCalendarSync.deleteItem(item, ctx)`.

### File attachments

`file-attachment-storage.ts` stores **base64 in `store.fileAttachments.files`** (in-memory, in the valtio proxy). Every `persistStore` serializes all base64 files into `ExchangeFormatV2.fileAttachments`. An LRU cache helps reads, not the persistence bloat. `runFileAttachmentGC` (`src/lib/file-attachment-gc.ts`) scans rich-text HTML (`[data-type="file-attachment"]`/`[data-file-id]`) in item notes + `course.syllabusFileId` and calls `cleanupOrphanedFiles`. It runs on app startup, not from the store module. The GC logic (HTML structure knowledge) lives in its own lib module beside the file-attachment module, not in the store. See [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md).

### Localization

i18next with per-namespace JSON (`src/locales/{en,es}/`). The content script (`content.ts`) imports translations directly (no i18next in the content-script context) via a small `getTranslation` helper. `listenLanguageChangeInExtensionBackground` keeps the background's language in sync.

---

<a id="cross-cutting-concerns"></a>

## Cross-cutting concerns

### State access discipline

The intended pattern: **components call `useXxx()` hooks from `useStore.ts`, never import `store` directly.** `store` is exported (lib modules need it), but UI components should go through the hooks. Violations of this (lib modules writing to `store`, components reaching past the hooks) are the most common seam leak.

### Testing

- **Runner:** Vitest + jsdom + Testing Library.
- **Pattern:** tests concentrate on **leaf pure functions and module interfaces**. Pure modules (`date-utils`, `recurrence-utils`, `technique-utils`), the calendar query wiring (`calendar-queries`), the form/model converters (`forms`), the repository seam, the GC scan, the timer manager, the sync dispatch, and the dialog state/save handler all have coverage through their own interfaces with injected stubs.
- **Gap:** the remaining bugs live in **cross-module wiring** (storage sync timing, the timer bridge between contexts, the full persist/patch round-trip), which is largely untested. The hybrid storage transport, the data transfer serialization, the store module itself, site blocking, and all calendar views lack direct tests.
- **Risk:** when the tested surface and the used surface diverge, the tests give false confidence. Keep them aligned.

### Build

- **Web:** Vite (`vite.config.js`, `index.html`, `src/main.tsx`).
- **Extension:** WXT (`wxt.config.ts`, `src/entrypoints/*`). WXT wraps Vite. `@wxt-dev/module-react` adds React. Manifest permissions and host origins are declared in `wxt.config.ts`.
- **Feature flags:** `VITE_FEATURE_UGLY_CALENDAR`, `VITE_FEATURE_TESTING` gate optional tabs.
- **Scripts:** see `AGENTS.md` for the full `vp` command reference.

---

<a id="principles-in-force"></a>

## Principles in force (baseline)

These describe the **current** conventions rather than aspirations. Future work should preserve them unless a candidate explicitly revisits one.

1. **Storage is the source of truth. Per-context `store` instances are synced caches.** Do not propose "unify the stores into one". The duality is key to the architecture.
2. **The `browserRuntime` seam is real (two adapters).** New extension-only behavior goes through `isExtension` guards or lives in `background.ts`. Web parity goes through `BrowserRuntimeStub`.
3. **Components access state via `useXxx()` hooks, not `store` directly.** Lib modules do not import `store`. Store access (reads and writes) goes through injected callbacks supplied by the caller layer. See [ADR 0003](./adr/0003-lib-modules-do-not-import-store.md).
4. **The timer lives in the background in extension mode.** It survives popup close. Do not propose moving it into React.
5. **The timer persists under its own storage key.** Do not propose merging it into the app exchange format. The per-tick persist cadence is different from app-state persist.
6. **Items are a discriminated union of four subtypes.** New item kinds extend the union, not the schema.
7. **Domain language follows `CONTEXT.md`** (Item/Task/Exam/Event/Timetable, Course/DegreeCourse/Degree Plan, Study Session, Project, Wellness, Container Mode). Do not introduce "Entry/Record/Assignment/Homework/Class/Schedule/Module/Activity" synonyms.

---

## How to use this document

- **Before proposing a refactor:** check [Principles in force](#principles-in-force) and [The architectural key constraint](#dual-surface) plus [Execution contexts and state ownership](#execution-contexts). If your proposal contradicts either, it needs an ADR explaining why.
- **When naming a new module:** use `CONTEXT.md` domain terms + `codebase-design` architecture terms. Do not invent synonyms.
- **When evaluating depth:** apply the deletion test. Would deleting the module concentrate complexity (earns its keep) or just move it (shallow)?
