#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const validatorPath = join(scriptDir, "validate-reset-data.mjs");
const fixtureDir = await mkdtemp(join(tmpdir(), "codex-reset-validator-"));

const validLedger = {
  schemaVersion: 1,
  state: "reset observed",
  confidence: "RESET CONFIRMED",
  lastResetAt: "2026-08-11T10:00:00Z",
  updatedAt: "2026-08-11T10:05:00Z",
  statusText: "A reset was observed by the surveillance process.",
  source: {
    name: "Reset surveillance process",
    url: "https://example.com/observation",
    observedAt: "2026-08-11T10:04:00Z"
  },
  history: [
    {
      resetAt: "2026-08-11T10:00:00Z",
      confidence: "RESET CONFIRMED",
      summary: "Reset observed."
    },
    {
      resetAt: "2026-08-10T09:00:00Z",
      confidence: "PROBABLE BLESSING",
      summary: "Earlier probable reset."
    }
  ]
};

const cases = [
  { name: "accepts a valid populated ledger", mutate: () => {}, valid: true },
  {
    name: "rejects normalized impossible dates",
    mutate: (ledger) => { ledger.updatedAt = "2026-02-30T10:05:00Z"; },
    error: "updatedAt is not a valid date"
  },
  {
    name: "rejects undocumented confidence labels",
    mutate: (ledger) => { ledger.confidence = "CERTAINLY MAYBE"; },
    error: "confidence must use the documented confidence vocabulary"
  },
  {
    name: "rejects non-HTTP source URLs",
    mutate: (ledger) => { ledger.source.url = "javascript:alert(1)"; },
    error: "source.url must be an HTTP(S) URL or null"
  },
  {
    name: "rejects observations later than the ledger update",
    mutate: (ledger) => { ledger.source.observedAt = "2026-08-11T10:06:00Z"; },
    error: "source.observedAt must not be later than updatedAt"
  },
  {
    name: "rejects observations earlier than the reported reset",
    mutate: (ledger) => { ledger.source.observedAt = "2026-08-11T09:59:59Z"; },
    error: "source.observedAt must not be earlier than lastResetAt"
  },
  {
    name: "rejects history that is not newest first",
    mutate: (ledger) => { ledger.history.reverse(); },
    error: "history must contain unique reset times ordered newest first"
  },
  {
    name: "rejects duplicate reset times",
    mutate: (ledger) => { ledger.history[1].resetAt = ledger.history[0].resetAt; },
    error: "history must contain unique reset times ordered newest first"
  },
  {
    name: "rejects disagreement between last reset and history",
    mutate: (ledger) => { ledger.lastResetAt = "2026-08-11T09:59:00Z"; },
    error: "lastResetAt must match the newest history event"
  },
  {
    name: "accepts a valid ledger with no recorded reset",
    mutate: (ledger) => {
      ledger.state = "unknown";
      ledger.confidence = "UNVERIFIED APPARITION";
      ledger.lastResetAt = null;
      ledger.history = [];
    },
    valid: true
  }
];

let failures = 0;

try {
  for (const [index, testCase] of cases.entries()) {
    const ledger = structuredClone(validLedger);
    testCase.mutate(ledger);
    const fixturePath = join(fixtureDir, `${index}.json`);
    await writeFile(fixturePath, `${JSON.stringify(ledger, null, 2)}\n`);

    try {
      await execFileAsync(process.execPath, [validatorPath, fixturePath]);
      if (!testCase.valid) throw new Error("validator unexpectedly accepted the fixture");
      console.log(`ok ${index + 1} - ${testCase.name}`);
    } catch (error) {
      const output = `${error.stderr || ""}${error.stdout || ""}`;
      if (!testCase.valid && output.includes(testCase.error)) {
        console.log(`ok ${index + 1} - ${testCase.name}`);
      } else {
        failures += 1;
        console.error(`not ok ${index + 1} - ${testCase.name}`);
        console.error(testCase.valid ? output.trim() || error.message : `${error.message}\n${output}`.trim());
      }
    }
  }
} finally {
  await rm(fixtureDir, { recursive: true, force: true });
}

if (failures) process.exit(1);
console.log(`Validated ${cases.length} ledger contract cases`);
