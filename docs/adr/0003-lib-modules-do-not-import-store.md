# ADR 0003: Lib modules do not import the store

- **Status:** accepted
- **Date:** 2026-08-10

## Context

`FileAttachmentStorage` (`src/lib/file-attachment-storage.ts`) imports the valtio `store` at module top (line 6) and reads and writes it directly: `store.fileAttachments.files[fileId] = { ...metadata, fileData: base64 }` (lines 53-54) and `delete store.fileAttachments.files[fileId]` (line 140). File attachments are UI-only with no background involvement, so no cross-context justification exists for a lib module mutating the store singleton. Separately, `performGarbageCollection` (`src/stores/app.ts:356-405`) parses rich-text HTML with `DOMParser`, scans `[data-type="file-attachment"]` and `course.syllabusFileId`, and knows the app's data shape. File-attachment lifecycle logic lives in the store module instead of the file-attachment module. See [Candidate D](../architecture-review-candidates.md#candidate-d) in the candidates doc.

This mirrors the seam [ADR 0002](./0002-sync-module-does-not-write-store.md) established for `GoogleCalendarSync`: a lib module owns its job (file storage, GC of unreferenced files) and does not import or mutate the app store. The store supplies a repository adapter.

## Decision

Lib modules do not import or mutate the valtio `store`. The store supplies a repository adapter (or callbacks) at construction time. `FileAttachmentStorage` takes a `FileRepository` interface (`getFile`, `getFileMetadata`, `putFile`, `deleteFile`, `listMetadata`) via its constructor. `stores/app.ts` constructs and exports `fileAttachmentStorage` with a store-backed adapter, alongside the existing `dataTransfer` singleton. The module owns id generation, base64 conversion, and the LRU cache; the repo is a key-value store.

The file-attachment garbage collection splits along the same seam. `cleanupOrphanedFiles(referencedIds)` stays on `fileAttachmentStorage` (pure file work: delete unreferenced). The reference scan (DOMParser over `items[].notes`, walk of `course.syllabusFileId`) moves into a sibling `src/lib/file-attachment-gc.ts` exporting `runFileAttachmentGC({ items, courses }): Promise<number>`. The sibling takes the state as an argument, returns the deleted count, and never imports the store. `App.tsx` calls `runFileAttachmentGC(snapshot(store))` on startup.

## Consequences

A future reader will expect `fileAttachmentStorage` to import `store` and mutate it directly, because the file data and metadata live in `store.fileAttachments`. This ADR records that the seam sits between the file lifecycle (base64 conversion, LRU, delete unreferenced) and the store write, and that the seam is intentional. The indirection in `stores/app.ts` (constructing `fileAttachmentStorage` with a repository adapter) is not over-engineering; it enforces the rule.

The module becomes testable through the `FileRepository` interface with an `InMemoryFileRepository` stub, without standing up valtio or the app store. The GC sibling becomes testable with fixture state and a `cleanupOrphanedFiles` stub, without jsdom DOMParser against the real store. The two UI callers (`SyllabusUpload.tsx`, `rich-text-editor.tsx`) import `fileAttachmentStorage` from `@/stores/app` instead of `@/lib/file-attachment-storage`, which is no new coupling because they already live in the React tree that consumes the store via hooks.

A future explorer should not move the store write back into `fileAttachmentStorage` to reduce the caller's work, and should not have the module import `store` from `@/stores/app` to persist files directly. Both moves re-introduce the seam violation this ADR rejects. The same rule applies to any future lib module that touches app state: go through a repository interface or callbacks, not the store singleton.

## Alternatives considered

**`fileAttachmentStorage` keeps importing `store`, only `performGarbageCollection` moves.** Rejected because the module reads `store.fileAttachments.files` and `store.fileAttachments.metadata` on every `getFile`, `getFileMetadata`, and `getAllFileMetadata` call (lines 68, 88, 155). Moving only the GC leaves the read-and-write seam intact. The module stays untestable (valtio required) and the lib-imports-store rule stays broken.

**Write-callbacks only (`onFileStored`, `onFileDeleted`), reads stay on `store`.** Rejected because the module reads too much for write-only callbacks to cover. A repository interface covers both reads and writes symmetrically, and aligns with [Candidate E](../architecture-review-candidates.md#candidate-e)'s eventual repository seam for the whole store, so this decision becomes a down payment on E rather than a divergent shape.

**GC moves entirely into `file-attachment-storage.ts`.** Rejected because the reference scan reads `items[].notes` and `course.syllabusFileId`, which is app-state knowledge. Putting the scan in the storage module would pull the app's data shape into a lib module. The sibling keeps the scan where the state shape lives, and `cleanupOrphanedFiles` stays where the file set lives.
