# Architecture Decision Records

A collection of records that capture architectural decisions for StudyHub. This includes both decisions **made** (the baseline) and decisions **rejected** (why a candidate was declined).

## Format

Each ADR is a short Markdown file named `NNNN-short-title.md` (zero-padded number, kebab-case title). The value of an ADR is in recording **that** a decision was made and **why**, not in filling out sections. Use the template below as a starting point, not a checklist. Omit a section when it adds no value.

```markdown
# ADR NNNN: Title

- **Supersedes:** ADR NNNN (if applicable)
- **Superseded by:** ADR NNNN (if applicable)

## Decision

What did we decide? State it in one paragraph, plainly.

## Consequences

What follows from this decision? What becomes easier, what becomes harder,
what trade-off did we accept? What should a future explorer _not_ re-suggest?

## Alternatives considered

What else was on the table, and why did we reject it? (This is the part that
stops future architecture reviews from re-litigating the same ground.)
```

Prefer short prose paragraphs over filled-out headers. Avoid implementation details. State the decision, state why, state what was rejected. That is the whole point. Add headers only when the decision has real consequences or real alternatives to record.

## When to write an ADR

- **When a deepening candidate is rejected with a reason that is key to the architecture**. A future architecture review would need this reason to avoid re-suggesting the same thing. Ephemeral reasons ("not worth it right now") and self-evident ones don't warrant an ADR.
- **When a decision in ADRs is revisited and changed**. Record the change so the baseline doc stays trustworthy.
- **When an open question in ADRs is resolved**. For example, "Google Calendar sync is web-only by design" or "recurrence expansion is in scope."

## Index

- [ADR 0001: Baseline architecture](./0001-baseline-architecture.md)
