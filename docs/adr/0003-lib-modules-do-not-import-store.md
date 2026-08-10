# ADR 0003: Lib modules do not import the store

- **Status:** accepted
- **Date:** 2026-08-10

`FileAttachmentStorage` imported the valtio `store` at module top and read and wrote it directly. File attachments are UI-only with no background involvement, so no cross-context justification exists for a lib module mutating the store singleton. Separately, file-attachment garbage collection lived in the store module, parsing rich-text HTML and scanning item notes and course syllabus references, which is app-state knowledge that does not belong there.

We decided lib modules do not import or mutate the valtio `store`. The store supplies a repository adapter at construction time. The module owns id generation, base64 conversion, and the LRU cache, and the repo is a key-value store. The garbage collection splits along the same seam: the reference scan takes the state as an argument and never imports the store, and the file deletion stays on the storage module.

We rejected keeping the store import and moving only the GC, because the module reads and writes the store on every file operation, not just on GC. We rejected write-only callbacks because the module reads too much for them to cover. We rejected moving the GC entirely into the storage module because the reference scan reads app-state shape that does not belong in a lib module.

This mirrors the seam ADR 0002 established for the sync module.