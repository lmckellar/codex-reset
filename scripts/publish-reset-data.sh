#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage: scripts/publish-reset-data.sh STAGED_LEDGER" >&2
    exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
STAGED_LEDGER="$1"
PUBLIC_LEDGER="$REPO_DIR/public/reset-data.json"

# Create the temporary file beside the destination so the final rename is atomic.
TEMP_LEDGER="$(mktemp "$REPO_DIR/public/.reset-data.json.XXXXXX")"
trap 'rm -f -- "$TEMP_LEDGER"' EXIT

cp -- "$STAGED_LEDGER" "$TEMP_LEDGER"
node "$SCRIPT_DIR/validate-reset-data.mjs" "$TEMP_LEDGER"
chmod --reference="$PUBLIC_LEDGER" "$TEMP_LEDGER"
mv -- "$TEMP_LEDGER" "$PUBLIC_LEDGER"
trap - EXIT

echo "Published $STAGED_LEDGER to public/reset-data.json"
