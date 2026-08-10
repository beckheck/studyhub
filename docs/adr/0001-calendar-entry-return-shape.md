# ADR 0001: Calendar queries return CalendarEntry, not Item

- **Status:** accepted
- **Date:** 2026-08-10

## Context

Calendar views (MiniCalendar, PlannerTab, CourseRecordCalendar, UglyCalendarPlannerTab) each inlined their own date-filtering logic, with subtle differences in how they handled completed items, multi-day events, and course filters. Separately, `recurrence-utils.ts` (715 lines) expanded recurring events into occurrences but had zero production imports. A recurring event showed once on its `startsAt`, never on its recurrence dates.

Consolidating the query logic into one shared module (`src/lib/calendar-queries.ts`) required deciding what the query returns. `Item[]` is the shape the old views used, but it cannot carry occurrence-specific start/end times. A recurring Wednesday study group needs `startsAt: Jan 14 2pm` for its Jan 14 occurrence, but `item.startsAt` gives `Jan 7 2pm`. react-big-calendar (`UglyCalendarPlannerTab`) needs concrete `start`/`end` Dates per occurrence for positioning.

See [Candidate B](../architecture-review-candidates.md#candidate-b) in the candidates doc and [Calendar / Planner](../ARCHITECTURE.md#calendar-planner) in the architecture doc.

## Decision

Calendar queries (`getItemsInRange`, `getItemsOnDate`) return `CalendarEntry[]` instead of `Item[]`. Each entry carries the occurrence's effective `startsAt`/`endsAt` and a `sequence` number, alongside the source `item`. The query answers "what occurs on this date." Views apply display filters (`hideCompleted`, `showMultiDay`) themselves.

## Consequences

Recurring events display with correct per-occurrence times in all views, including react-big-calendar. The 715-line `recurrence-utils.ts` is now wired into production. Views that only need the item can call `entries.map(e => e.item)`. The query does not filter `hideCompleted` or `showMultiDay` because those are display preferences, not data facts. Timetable items are excluded from the shared query because their expansion uses a different mechanism (weekday pattern + timezone + range). A future explorer should not "simplify" the return type back to `Item[]` or move display filters into the query.

## Alternatives considered

**`Item[]`** (simpler, matches old call pattern): rejected because it cannot carry occurrence-specific times. react-big-calendar positioning breaks for recurring events. The migration cost of `CalendarEntry[]` is small (`entries.map(e => e.item)` recovers the old shape where needed).

**Per-date API only** (`getItemsOnDate`): rejected for efficiency. A month grid calls the query 42 times. With recurrence expansion, each call invokes `generateRecurrenceOccurrences` per recurring event with a 1-day range. A range API (`getItemsInRange`) generates occurrences once for the whole visible range. Both APIs are provided; `getItemsOnDate` delegates to `getItemsInRange` with a 1-day range.