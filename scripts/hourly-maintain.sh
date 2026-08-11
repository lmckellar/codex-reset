#!/usr/bin/env bash
set -euo pipefail

REPO="$HOME/codex-reset"
STATE="$HOME/.local/state/codex-reset-abbey"

mkdir -p "$STATE"
cd "$REPO"

# Never overlap two agent runs.
exec 9>"$STATE/lock"
flock -n 9 || exit 0

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
LOG="$STATE/$STAMP.log"

# Don't trample over manual work.
if [[ -n "$(git status --porcelain)" ]]; then
    echo "$(date -Is) SKIP: repository already dirty" >> "$LOG"
    exit 0
fi

git pull --ff-only origin main >>"$LOG" 2>&1

START_HEAD="$(git rev-parse HEAD)"

set +e
timeout 50m codex exec --full-auto \
    "Read ABBEY.md and carry out one maintenance cycle. Inspect the repository first. Do the highest-value bounded work available, validate it sensibly, update PROJECT_STATE.md, and leave the resulting changes uncommitted for the wrapper." \
    </dev/null >>"$LOG" 2>&1
RC=$?
set -e

if [[ $RC -ne 0 ]]; then
    echo "$(date -Is) Codex failed/timeout: $RC; reverting this run" >>"$LOG"
    git reset --hard "$START_HEAD"
    git clean -fd
    exit "$RC"
fi

# Nothing changed: perfectly valid maintenance cycle.
if [[ -z "$(git status --porcelain)" ]]; then
    echo "$(date -Is) No changes required" >>"$LOG"
    exit 0
fi

git diff --check >>"$LOG" 2>&1
git add -A
git commit -m "chore: abbey maintenance $STAMP" >>"$LOG" 2>&1
git push origin main >>"$LOG" 2>&1

echo "$(date -Is) Success" >>"$LOG"
