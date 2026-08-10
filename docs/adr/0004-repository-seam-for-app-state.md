# ADR 0004: Repository seam for app state

- **Status:** accepted
- **Date:** 2026-08-10

The persistence lifecycle for `AppState` was smeared across three modules with no single interface. Transport, serialization, cross-context sync, and the valtio proxy patcher each lived in a different module, with the patcher untyped and untested.

We decided to consolidate the persistence lifecycle behind a single repository interface. The repository owns load, save, subscribe, and proxy patching. `stores/app.ts` delegates to it. The timer uses the same factory with its own key and adapters, preserving the intentional separation between app-state persist and per-tick timer persist (principle 5). Serialization becomes stateless pure functions, and the caller owns loading state because it is a UI concern.

The `XItem*` parallel type system and the regex-based date conversion stay out of scope. Deriving the exchange format from the zod schemas is a separate decision.

We rejected keeping the smeared lifecycle and fixing only the race, because the deeper problems (the untyped patcher, the impure import, the migration running on every sync, the untestable path) would remain. We rejected a full schema-driven patcher in this ADR because `AppState` has no zod schema today, and building one is a second deepening. We rejected the repo owning loading state because it is a UI concern.

ADR 0003 established a `FileRepository` adapter for `FileAttachmentStorage` and called itself "a down payment on Candidate E." This ADR completes that seam for the whole `AppState`.
