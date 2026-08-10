# ADR 0001: Calendar queries return CalendarEntry, not Item

- **Status:** accepted
- **Date:** 2026-08-10

Calendar views each inlined their own date-filtering logic, with subtle differences in how they handled completed items, multi-day events, and course filters. Separately, recurrence expansion existed but had zero production imports, so a recurring event showed once on its `startsAt` and never on its recurrence dates.

Consolidating the query logic into one shared module required deciding what the query returns. `Item[]` cannot carry occurrence-specific start/end times. A recurring Wednesday study group needs `startsAt: Jan 14 2pm` for its Jan 14 occurrence, but `item.startsAt` gives `Jan 7 2pm`.

We decided calendar queries return `CalendarEntry[]`, where each entry carries the occurrence's effective start/end times and a sequence number alongside the source item. The query answers "what occurs on this date." Views apply display filters themselves. Timetable items are excluded because their expansion uses a different mechanism.

We rejected `Item[]` because it cannot carry occurrence-specific times. We rejected a per-date API only because a month grid would invoke recurrence expansion 42 times instead of once for the visible range.
