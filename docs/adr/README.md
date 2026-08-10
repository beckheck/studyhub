# Architecture Decision Records

A collection of records that capture architectural decisions for StudyHub. This includes both decisions **made** (the baseline) and decisions **rejected** (why a candidate was declined).

## Format

Each ADR is a short Markdown file named `NNNN-short-title.md` (zero-padded number, kebab-case title). Follow this template:

```markdown
# ADR NNNN: Title

- **Status:** proposed | accepted | rejected | deprecated | superseded
- **Date:** YYYY-MM-DD
- **Supersedes:** ADR NNNN (if applicable)
- **Superseded by:** ADR NNNN (if applicable)

## Context

What is the issue we're facing? What constraints are in play? (Reference
[ARCHITECTURE.md](../ARCHITECTURE.md) where relevant. Do not re-explain the
dual-surface model or the principles in force. Link to them instead.)

## Decision

What did we decide? State it in one paragraph, plainly.

## Consequences

What follows from this decision? What becomes easier, what becomes harder,
what trade-off did we accept? What should a future explorer _not_ re-suggest?

## Alternatives considered

What else was on the table, and why did we reject it? (This is the part that
stops future architecture reviews from re-litigating the same ground.)
```

## When to write an ADR

- **When a deepening candidate is rejected with a reason that is key to the architecture**. A future architecture review would need to know this reason to avoid re-suggesting the same thing. Ephemeral reasons ("not worth it right now") and self-evident ones don't warrant an ADR.
- **When a decision in [ARCHITECTURE.md](../ARCHITECTURE.md) is revisited and changed**. Record the change so the baseline doc stays trustworthy.
- **When an open question in [ARCHITECTURE.md](../ARCHITECTURE.md#open-questions) is resolved**. For example, "Google Calendar sync is web-only by design" or "recurrence expansion is in scope."

## Index

- [ADR 0001: Calendar queries return CalendarEntry, not Item](./0001-calendar-entry-return-shape.md)
- [ADR 0002: Sync module does not write store](./0002-sync-module-does-not-write-store.md)
- [ADR 0003: Lib modules do not import the store](./0003-lib-modules-do-not-import-store.md)
- [ADR 0004: Repository seam for app state](./0004-repository-seam-for-app-state.md)
- [ADR 0005: Migration pipeline](./0005-migration-pipeline.md)
- [ADR 0006: Google Calendar sync is web-only by design](./0006-google-calendar-sync-web-only.md)
- [ADR 0007: Google Identity Services replaces the custom OAuth flow](./0007-google-identity-services-for-oauth.md)
