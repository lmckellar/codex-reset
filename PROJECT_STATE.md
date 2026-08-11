# Project State

Updated: 2026-08-11

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

The dependency-free `scripts/validate-reset-data.mjs` checker now provides a deterministic pre-deploy check for the surveillance-owned ledger. It verifies the documented shape, confidence vocabulary, UTC timestamps, source URL, and newest-first history ordering. It accepts an optional ledger path so surveillance can validate staged output before atomically replacing the public file.

## Data contract

The external surveillance process owns reset intelligence. It should update `public/reset-data.json`, preserving the existing fields and ISO 8601 UTC timestamps. Valid confidence labels are:

- `RESET CONFIRMED`
- `PROBABLE BLESSING`
- `UNVERIFIED APPARITION`
- `CONGREGATIONAL HYSTERIA`

Each history entry should contain `resetAt`, `confidence`, and a concise `summary`. Newest events should come first. The UI tolerates absent or malformed timestamps and unknown confidence values.

## Validation

- `node scripts/validate-reset-data.mjs`
- `node scripts/validate-reset-data.mjs /path/to/staged-reset-data.json`
- `git diff --check`

## Next useful work

Connect the surveillance process to the ledger, validate a staged file before atomically publishing it, and replace the unknown initial record with real observations. Once real data exists, perform an end-to-end check against its output shape before adding further presentation features.
