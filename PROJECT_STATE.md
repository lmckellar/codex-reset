# Project State

Updated: 2026-08-12

## Current state

The first functional static MVP is implemented in `public/`. It presents an intentionally unknown initial state without claiming an unobserved reset, and includes:

- current confidence and concise evidence text
- explicit current reset state
- a live time-since-reset counter when `lastResetAt` is populated
- last-known-reset context and recent history
- observation provenance, including a safe clickable HTTP(S) source when supplied
- a machine-readable `public/reset-data.json` ledger
- a responsive cathedral-parody visual treatment with reduced-motion support

The site fetches the JSON ledger without caching and safely falls back to the unknown state already present in the HTML if loading fails. Dates are rendered in the visitor's local timezone. Runtime source links are restricted to HTTP(S), matching the ledger validator.

The dependency-free `scripts/validate-reset-data.mjs` checker now provides a deterministic pre-deploy check for the surveillance-owned ledger. It verifies the documented shape, confidence vocabulary, strict UTC calendar timestamps (rejecting normalized impossible dates), source URL, and newest-first history ordering. It also rejects observations or reset events later than the ledger update, and requires `lastResetAt` to agree with the newest history event. It accepts an optional ledger path so surveillance can validate staged output before atomically replacing the public file.

The `scripts/publish-reset-data.sh` helper now owns that atomic publication step. It validates a staged ledger first, rejects it if its `updatedAt` predates the published ledger, copies it to a temporary file beside the public ledger, preserves the existing file mode, and renames it into place only after validation succeeds. Invalid or stale staged data leaves the public ledger untouched.

The dependency-free `scripts/test-reset-data-validator.mjs` regression runner exercises representative accepted and rejected ledgers in an isolated temporary directory. It covers populated and empty valid ledgers plus the most consequential timestamp, ordering, confidence, provenance URL, and reset-history consistency failures.

The isolated `scripts/test-reset-data-publisher.mjs` integration runner verifies the publication boundary itself: invalid and stale staged data are rejected without modifying the public ledger, valid data replaces it, destination permissions are preserved, and temporary publication files are cleaned up.

## Data contract

The external surveillance process owns reset intelligence. It should update `public/reset-data.json`, preserving the existing fields and ISO 8601 UTC timestamps. Valid confidence labels are:

- `RESET CONFIRMED`
- `PROBABLE BLESSING`
- `UNVERIFIED APPARITION`
- `CONGREGATIONAL HYSTERIA`

Each history entry should contain `resetAt`, `confidence`, and a concise `summary`. Newest events should come first, and the first event must match `lastResetAt`; both should be absent when no reset has been recorded. Reset and observation timestamps must not be later than `updatedAt`. The UI tolerates absent or malformed timestamps and unknown confidence values.

## Validation

- `node scripts/validate-reset-data.mjs`
- `node scripts/validate-reset-data.mjs /path/to/staged-reset-data.json`
- `node scripts/test-reset-data-validator.mjs`
- `node scripts/test-reset-data-publisher.mjs`
- `scripts/publish-reset-data.sh /path/to/staged-reset-data.json`
- `git diff --check`

## Next useful work

Connect the surveillance process to `scripts/publish-reset-data.sh` and replace the unknown initial record with real observations. Once real data exists, perform an end-to-end check against its output shape before adding further presentation features.
