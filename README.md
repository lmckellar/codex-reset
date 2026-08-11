# Codex Reset

A static, unnecessarily ecclesiastical status page for the Codex reset state.

## Reset ledger

The surveillance process publishes observations to `public/reset-data.json`. Validate a staged ledger before replacing the public copy:

```sh
node scripts/validate-reset-data.mjs /path/to/staged-reset-data.json
```

With no argument, the validator checks the public ledger:

```sh
node scripts/validate-reset-data.mjs
```

Only publish a staged file after validation succeeds. Replacing the ledger atomically prevents visitors from fetching a partially written JSON document. The expected fields and confidence vocabulary are recorded in `PROJECT_STATE.md`.
