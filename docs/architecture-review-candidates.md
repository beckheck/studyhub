# Architecture Review Candidates

> Deepening opportunities surfaced during the architecture review. **Parked for later revisit**. No work is planned until the baseline ([ARCHITECTURE.md](./ARCHITECTURE.md)) is agreed and a candidate is picked for grilling.
>
> Vocabulary: **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality** (from `codebase-design`). Domain terms from `CONTEXT.md`.

---

## Summary table

| ID  | Candidate                                                            | Strength        |
| --- | -------------------------------------------------------------------- | --------------- |
| G   | File attachments store base64 in valtio, persisted on every mutation | Worth exploring |

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
