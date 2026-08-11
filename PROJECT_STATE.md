# Project State

Updated: 2026-08-11

## Current state

The first functional static MVP is implemented in `public/`. It presents an intentionally unknown initial state without claiming an unobserved reset, and includes:

- current confidence and concise evidence text
- a live time-since-reset counter when `lastResetAt` is populated
- last-known-reset context and recent history
- observation provenance
- a machine-readable `public/reset-data.json` ledger
- a responsive cathedral-parody visual treatment with reduced-motion support

The site fetches the JSON ledger without caching and safely falls back to the unknown state already present in the HTML if loading fails. Dates are rendered in the visitor's local timezone.

## Data contract

The external surveillance process owns reset intelligence. It should update `public/reset-data.json`, preserving the existing fields and ISO 8601 UTC timestamps. Valid confidence labels are:

- `RESET CONFIRMED`
- `PROBABLE BLESSING`
- `UNVERIFIED APPARITION`
- `CONGREGATIONAL HYSTERIA`

Each history entry should contain `resetAt`, `confidence`, and a concise `summary`. Newest events should come first. The UI tolerates absent or malformed timestamps and unknown confidence values.

## Validation

- JSON syntax checked with `jq`.
- Static site served locally and both `/` and `/reset-data.json` requested successfully.
- HTML checked for local asset references and responsive/reduced-motion behavior by inspection.

## Next useful work

Connect the surveillance process to the ledger and replace the unknown initial record with real observations. Once real data exists, verify history ordering and source links against its output shape before adding further presentation features.
