# ADR 0008: Deepen the useItems interface with per-type mutators and mapped-type readers

- **Status:** accepted
- **Date:** 2026-08-10

## Context

The Item union (`ItemTask | ItemExam | ItemEvent | ItemTimetable`) is deep in `src/items/models.ts`, but the `useItems` hook in `src/hooks/useStore.ts` flattens it. `getItemsByType(type: Item['type'])` returns `Item[]`, so every caller that narrows by type repairs it with a cast: 8 sites cast `as ItemTask[]` or `as ItemExam[]`. `updateItem(id, updates: Partial<Omit<Item, ...>>)` accepts the full union, so 14 callers cast `as any` on the patch. `deleteItem(id)` silently cascades exam-grade deletion; nothing in the signature tells the caller that grades go with the exam. The cascade is inline in the hook method and untestable without a React harness.

## Decision

We deepen the `useItems` interface in place, keeping the hook as the single state-access module (it earns its keep: 30 callers, cascading deletes).

**Reads.** `getItemsByType` and `addItem` become generic with a mapped type: `getItemsByType<T extends Item['type']>(type: T): Extract<Item, { type: T }>[]`. Callers that pass a string literal get the narrowed array. Callers that pass a variable get `Item[]` as the fallback. The 8 `as ItemXxx[]` casts vanish.

**Writes.** Add per-type mutators: `updateTask`, `updateExam`, `updateEvent`, `updateTimetable`, `deleteTask`, `deleteExam`, `deleteEvent`, `deleteTimetable`. Each accepts the narrowed patch type and returns the narrowed item or boolean. The 14 `as any` callers, all of which already hold a narrowed item, migrate to the per-type mutator with no cast. The per-type name carries the cascade in the signature: `deleteExam` cascades exam grades; `deleteTask` does not.

**Generic fallbacks.** Keep `updateItem(id, patch)` and `deleteItem(id)` on the hook. The generic `deleteItem` still cascades exam grades, so a caller that holds a generic `Item` (like `useItemDialog.handleDeleteItem`) cannot orphan grades. The per-type mutators make the cascade visible; the generic makes it safe. Both coexist.

**Cascade as pure functions.** Extract `cascadeExamDelete(items, examGrades, examId)` and `cascadeCourseClear(state, courseId)` as pure functions that take arrays and return the next state. The hooks call the pure functions and assign the result to `store`. The pure functions do not import `store` (satisfies ADR 0003). The cascade becomes testable through its own interface, not through a React harness.

**Dead code.** Delete `getItemById` (zero callers) and `clearCourseItems` (zero callers; `clearCourseData` re-implements the logic inline). `softDeleteItem` and `restoreItem` stay generic: no cascade, no subtype-specific behavior.

## Consequences

- The 8 read-side casts and 14 write-side casts vanish from 5 tabs, 2 components, and the dialog provider.
- The exam-grade cascade is visible in the `deleteExam` name and testable through the `cascadeExamDelete` pure function.
- A future caller that holds a generic `Item` can still call `deleteItem` safely; the generic cascade prevents orphaned grades.
- Adding a new Item subtype requires adding a per-type mutator pair (`updateXxx`, `deleteXxx`) to the hook. The generic fallbacks cover the transition period.
- This deepening unlocks Candidate 2 (tab-embedded domain logic): typed reads mean domain functions that operate on tasks or exams get typed inputs for free.

## Alternatives considered

We rejected a new query module (`src/lib/item-query.ts` with pure `tasks(items): ItemTask[]` functions) because it duplicates the hook and requires store injection for mutations (ADR 0003). The hook earns its keep; the friction is the interface shape, not the module.

We rejected per-slice hooks (`hooks/items/useTasks.ts`, `useExams.ts`, etc.) because that mixes two deepenings (this candidate and Candidate 7, splitting the state access layer by slice) and forces a migration of all 30 callers across new import paths.

We rejected dropping the cascade from the generic `deleteItem` because a caller that holds a generic `Item` would orphan exam grades silently. The per-type name makes the cascade visible, not exclusive. Both paths cascade.
