# Project State

Updated: 2026-08-12

## Current state

The first functional static MVP is implemented in `public/`. It presents an intentionally unknown initial state without claiming an unobserved reset, and includes:

- current confidence and concise evidence text
- explicit current reset state
- a live time-since-reset counter when `lastResetAt` is populated
- last-known-reset context and recent history
- confidence labels on every recent-history event, using the same vocabulary and visual tones as the current status
- observation provenance, including a safe clickable HTTP(S) source when supplied
- a machine-readable `public/reset-data.json` ledger
- a responsive cathedral-parody visual treatment with reduced-motion support

The site fetches the JSON ledger without caching and safely falls back to the unknown state already present in the HTML if loading fails. Dates are rendered in the visitor's local timezone. Runtime source links are restricted to HTTP(S), matching the ledger validator.

The Cloudflare Pages `_headers` artifact applies `Cache-Control: no-store, max-age=0, must-revalidate` specifically to `reset-data.json`. This complements the browser's no-store fetch and prevents reset observations from being held behind the static asset cache while leaving the rest of the site cacheable.

The dependency-free `scripts/validate-reset-data.mjs` checker now provides a deterministic pre-deploy check for the surveillance-owned ledger. It verifies the documented shape, confidence vocabulary, strict UTC calendar timestamps (rejecting normalized impossible dates), source URL, and strictly newest-first history ordering with no duplicate reset times. It also enforces the temporal chain from reset to observation to ledger update, rejects reset events later than the ledger update, and requires `lastResetAt` to agree with the newest history event. It accepts an optional ledger path so surveillance can validate staged output before atomically replacing the public file.

The `scripts/publish-reset-data.sh` helper now owns that atomic publication step. It serializes concurrent publishers, validates a staged ledger first, rejects an `updatedAt` more than five minutes ahead of the publisher clock or older than the published ledger, and rejects different content that reuses the current timestamp while allowing idempotent republication. The future-time guard prevents an erroneous timestamp from blocking subsequent legitimate updates while tolerating ordinary clock skew. It copies accepted data to a temporary file beside the public ledger, preserves the existing file mode, and renames it into place only after validation succeeds. Invalid, future-dated, stale, or conflicting staged data leaves the public ledger untouched.

The dependency-free `scripts/test-reset-data-validator.mjs` regression runner exercises representative accepted and rejected ledgers in an isolated temporary directory. It covers populated and empty valid ledgers plus the most consequential timestamp, ordering, duplicate-event, confidence, provenance URL, and reset-history consistency failures.

The isolated `scripts/test-reset-data-publisher.mjs` integration runner verifies the publication boundary itself: invalid, far-future, stale, and equal-timestamp conflicting data are rejected without modifying the public ledger; equivalent data can be republished; valid newer data replaces it; destination permissions are preserved; and temporary publication files are cleaned up.

The hourly maintenance wrapper independently checks both shell scripts for syntax errors, runs the live ledger validator, and runs both dependency-free regression suites before it commits or pushes a maintenance cycle. This matters especially for the wrapper itself: the current process has already parsed before an agent edits it, so the explicit syntax check prevents a broken next-run version from being committed. A successful agent exit is therefore not sufficient to publish a change that breaks the maintenance entry point, ledger contract, or atomic publication boundary. Failed pre-commit validation is logged and rolled back so it cannot leave a dirty tree that blocks every later cycle.

## Data contract

The external surveillance process owns reset intelligence. It should update `public/reset-data.json`, preserving the existing fields and ISO 8601 UTC timestamps. Valid confidence labels are:

- `RESET CONFIRMED`
- `PROBABLE BLESSING`
- `UNVERIFIED APPARITION`
- `CONGREGATIONAL HYSTERIA`

Each history entry should contain `resetAt`, `confidence`, and a concise `summary`. Events must have unique reset times and appear newest first, and the first event must match `lastResetAt`; both should be absent when no reset has been recorded. When present, the current source observation must be at or after `lastResetAt`, and reset and observation timestamps must not be later than `updatedAt`. The UI tolerates absent or malformed timestamps and unknown confidence values.

## Validation

- `node scripts/validate-reset-data.mjs`
- `node scripts/validate-reset-data.mjs /path/to/staged-reset-data.json`
- `node scripts/test-reset-data-validator.mjs`
- `node scripts/test-reset-data-publisher.mjs`
- `grep -A1 '^/reset-data.json$' public/_headers`
- `scripts/publish-reset-data.sh /path/to/staged-reset-data.json`
- `bash -n scripts/hourly-maintain.sh`
- `git diff --check`

## Next useful work

Connect the surveillance process to `scripts/publish-reset-data.sh` and replace the unknown initial record with real observations. Once real data exists, perform an end-to-end check against its output shape before adding further presentation features.
