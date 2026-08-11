# Codex Reset

A static, unnecessarily ecclesiastical status page for the Codex reset state.

## Reset ledger

The surveillance process publishes observations to `public/reset-data.json`. Publish a staged ledger with the validation-and-atomic-replacement helper:

```sh
scripts/publish-reset-data.sh /path/to/staged-reset-data.json
```

The helper leaves the current public ledger untouched if validation fails. To validate without publishing, pass an optional staged path to the validator; with no argument it checks the public ledger:

```sh
node scripts/validate-reset-data.mjs
node scripts/validate-reset-data.mjs /path/to/staged-reset-data.json
```

The expected fields and confidence vocabulary are recorded in `PROJECT_STATE.md`.
