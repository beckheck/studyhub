# AGENTS.md

Guidance for OpenCode sessions working in StudyHub. Read alongside [`CONTEXT.md`](./CONTEXT.md) (domain vocabulary) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) (system baseline).

## Commands

```sh
npm run dev          # Vite web app (localhost:5173)
npm run dev:ext      # WXT extension dev (Chrome); dev:firefox for Firefox
npm run build        # Vite production build (web)
npm run build:ext    # WXT extension build
npm run zip          # Zip extension build for upload
npm run test         # Vitest run (jsdom)
npm run test:watch   # Vitest watch
npm run test:coverage
npm run lint         # ⚠ runs `tsc` ONLY — not eslint. Typecheck, not lint.
npm run check        # lint -> build -> test (run before declaring work done)
```

There is an `eslint.config.js` but no script wires it up. The `lint` script is `tsc`. If you mean to run eslint, invoke `npx eslint` directly.

Run a single test file: `npx vitest run path/to/file.test.ts`. By name: `npx vitest run -t "test name"`.

## Toolchain

- **Node 22** pinned via `mise.toml` (`package.json` only requires >=18). Run `mise install` if `node` is wrong.
- **Two build targets, one React app:**
  - Web: Vite (`vite.config.js`, `index.html`, `src/main.tsx`).
  - Extension: WXT (`wxt.config.ts`, `src/entrypoints/*`). WXT wraps Vite; `@wxt-dev/module-react` adds React.
- **Path alias `@` → `src`** in both `vite.config.js` and `wxt.config.ts` (and `tsconfig.json`). Use `@/...` imports.
- **Feature flags** (env, set in `.env.local`): `VITE_FEATURE_UGLY_CALENDAR`, `VITE_FEATURE_TESTING` gate optional tabs in `App.tsx`.
- **Google OAuth env:** `VITE_GOOGLE_CLIENT_ID` (see `.env.example`). The OAuth `REDIRECT_URI` is hardcoded to `http://localhost:5173/` in `src/lib/google-oauth.ts` — Google Calendar sync is **web-only by construction**; do not assume it works in extension mode without adding a `chrome.identity.launchWebAuthFlow` adapter.

## TypeScript

- `strict: false`, `strictNullChecks: false`, `allowJs: true`, `checkJs: true`. The codebase is mixed JS/TS; `tsconfig` includes `src/**/*.{js,jsx,ts,tsx}`. Don't "fix" strictness settings globally without intent — lots of code relies on the loose config.
- shadcn/ui is configured for **JSX, not TSX** (`components.json`: `"tsx": false`). shadcn primitives live in `src/components/ui/` as `.jsx`.

## Test setup

- Vitest + jsdom + Testing Library. Config: `vitest.config.ts`. Setup: `src/test/setup.ts`.
- **`src/test/setup.ts` globally mocks `crypto.randomUUID` (→ `'test-uuid-123'`) and `Date.now` (→ `1640995200000`, 2022-01-01).** Tests that rely on unique IDs or distinct timestamps will break or give false passes; reset/override in-file when needed.
- Existing tests concentrate on leaf pure functions (`date-utils`, `recurrence-utils`, `timetable/modelSchema`, `MiniCalendar`'s `buildCalendarMatrix`). Cross-module wiring (storage sync, timer bridge, Google sync, calendar queries, GC) is largely untested — don't assume green tests mean the feature works end-to-end.
- `recurrence-utils.ts` (715 lines) and its 964-line test are **not wired into any production view** — recurring `ItemEvent`s currently render once on `startsAt` only.

## Architecture (read `docs/ARCHITECTURE.md` before structural changes)

- **Dual surface, one app.** Six Container Modes (`web`, `popup`, `sidepanel`, `tab`, `overlay`, `newtab`); all render the same `App` via `AppContainer` (`src/AppContainer.tsx`) with different dimensions. `web` has no `browser.*` APIs; the runtime seam is `src/lib/browser-runtime-stub.ts` (`browserRuntime` + `isExtension`).
- **Extension mode = two JS contexts.** Background service worker (`src/entrypoints/background.ts`) and UI each have their own valtio `store` instance, synced via `browser.storage.local` / IndexedDB through `HybridStorage`. Storage is the source of truth; `store` is a synced cache. This duality is **fundamental** — don't propose unifying the stores.
- **Single state module:** `src/stores/app.ts` owns the valtio `proxy<AppState>` + `persistStore` + cross-context sync + GC. Components access state via hooks in `src/hooks/useStore.ts` (e.g. `useItems`, `useCourses`) — **do not import `store` directly from components**; lib modules may read it, writes should go through the hooks or an injected callback.
- **Items are a discriminated union** (`Task | Exam | Event | Timetable`) under `src/items/`. New item kinds extend the union via per-subtype `modelSchema`/`formSchema`/`methods`/`form` files; don't add to the schema ad hoc.
- **Focus timer lives in the background** in extension mode (survives popup close); the UI talks to it over `browserRuntime` messages (`timer.*`). In web mode, `useStudyTimer` creates the manager in-bundle and `BrowserRuntimeStub` emulates the bridge. Don't move the timer into React.
- **Timer persists under its own storage key** (`sp:studySessionTimerState`), separate from the app exchange format — the per-tick persist cadence is different from app-state persist. Don't merge them.

## Conventions

- **Domain language is governed by `CONTEXT.md`.**
- **Prettier:** 120 cols, single quotes, arrow parens `avoid`, semis on. No format-on-save script; run `npx prettier --write` if needed.
- **ESLint** (`eslint.config.js`): only lints `*.{js,jsx}` (not TS), `no-unused-vars` ignores identifiers starting with uppercase or underscore.
- **i18n:** i18next with per-namespace JSON under `src/locales/{en,es}/`; item-type strings under `src/items/locales/`. The content script imports translations directly (no i18next there). Source language is `en`.

## Before proposing a refactor

Check `docs/ARCHITECTURE.md` §7 (principles in force) and §1-2 (the dual-context model). If a proposal contradicts the per-context stores, the `browserRuntime` seam, the background timer, or the separate timer storage key, it needs an ADR. Deepening opportunities are tracked in `docs/architecture-review-candidates.md`, not in the baseline doc.

## Writing Style

- Adhere to E-Prime + ASD-STE100 Simplified Technical English.
- Write for one-read comprehension. Fluid prose instead of performance.
- Avoid passive voice. Identify the agent of every action.
- Avoid jargon, slang and idioms. Use plain, direct language.
- Avoid "it's not A, it's B" or similar constructions. Use more plain, fluid alternatives such as: "it {verb} B instead of A."
- DO NOT use terms such as "load-bearing" or "load-carrying". Use instead a context-sensitive, plain language alternative.
- DO NOT use cleft or pseudo-cleft sentences: a copula plus a relative clause, used to emphasise, where a plain verb works. Write subject, verb, object.
  - "that file is what a reviewer reads" => "a reviewer reads that file"
  - "it is the relay that decides" => "the relay decides"
  - "what makes it safe is the roster" => "the roster makes it safe"
  - "the reason it blocks is the missing observation" => "it blocks because no observation arrived"
- DO NOT use semicolons, hyphens, en dashes, or em dashes as prose punctuation. Prefer short sentences and periods. For parenthetical asides, use commas, parentheses, or separate sentences using a period. For closely related parallel structures, use period or a coordinating conjunction.
- DO NOT use arrow characters. Use `->`, `<-` or `<->` instead.
