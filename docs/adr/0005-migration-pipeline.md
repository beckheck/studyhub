# ADR 0005: Migration pipeline

- **Status:** accepted
- **Date:** 2026-08-10

The v1-to-v2 migration ran on every `importData` call, including cross-context sync, even when the data was already v2 and the legacy arrays were empty. There was no home for future migrations.

We decided to gate migrations by data version. The repository calls a migration only when the data version matches. The v1-to-v2 migration moves to its own module. Cross-context sync, which always receives v2 data, skips it entirely.

We rejected running migrations unconditionally because it wastes work on every sync and leaves no pattern for future migrations.
