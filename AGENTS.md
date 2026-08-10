# AGENTS.md

Guidance for OpenCode sessions working in StudyHub. Read alongside [`CONTEXT.md`](./CONTEXT.md) (domain vocabulary) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) (system baseline).

## Commands

```sh
vp dev              # Vite web app (localhost:5173)
vp build            # Vite production build (web)
vp run ext:dev      # WXT extension dev (Chrome); ext:dev:firefox for Firefox
vp run ext:build    # WXT extension build
vp run ext:zip      # Zip extension build for upload
vp test             # Vitest run (jsdom)
vp test watch       # Vitest watch
vp test --coverage
vp check --fix      # lint+format, fix if possible
vp run check:full   # lint -> build -> test (run before declaring work done)
```

Run a single test file: `npx vitest run path/to/file.test.ts`. By name: `npx vitest run -t "test name"`.

## Toolchain

- **Node 22** pinned via `mise.toml` (`package.json` only requires >=18). Run `mise install` if `node` is wrong.
- **Two build targets, one React app:**
  - Web: Vite+ (`vite.config.js`, `index.html`, `src/main.tsx`).
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
- Existing tests concentrate on leaf pure functions (`date-utils`, `recurrence-utils`, `timetable/modelSchema`, `MiniCalendar`'s `buildCalendarMatrix`, `calendar-queries`). Cross-module wiring (storage sync, timer bridge, Google sync, GC) is largely untested — don't assume green tests mean the feature works end-to-end.
- `recurrence-utils.ts` (715 lines) is wired into production via `calendar-queries.ts` (`getItemsInRange`/`getItemsOnDate`). Recurring `ItemEvent`s expand into occurrences on each matching date in the visible range. See [ADR 0001](./docs/adr/0001-calendar-entry-return-shape.md).

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

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Built-in Commands vs Scripts

`vp <name>` runs a built-in command. `vp run <name>` runs a `package.json` script or a `vite.config.ts` task. Scripts cannot overwrite built-ins, so `vp dev` and `vp run dev` may do different things. Check `package.json` and `vite.config.ts` first, and run `vp run <name>` when the project defines a script or task with that name.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.
- [ ] If setup, runtime, or package-manager behavior looks wrong, run `vp env doctor` and include its output when asking for help.

<!--VITE PLUS END-->
