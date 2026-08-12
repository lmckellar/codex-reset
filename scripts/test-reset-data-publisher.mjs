#!/usr/bin/env node

import { execFile } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const fixtureRepo = await mkdtemp(join(tmpdir(), "codex-reset-publisher-"));
const fixtureScripts = join(fixtureRepo, "scripts");
const fixturePublic = join(fixtureRepo, "public");
const publicLedger = join(fixturePublic, "reset-data.json");
const publishScript = join(fixtureScripts, "publish-reset-data.sh");

const baselineLedger = {
  schemaVersion: 1,
  state: "unknown",
  confidence: "UNVERIFIED APPARITION",
  lastResetAt: null,
  updatedAt: "2026-08-11T10:00:00Z",
  statusText: "No verified observation is available.",
  source: { name: "Reset surveillance process", url: null, observedAt: null },
  history: []
};
const replacementLedger = {
  ...baselineLedger,
  state: "reset observed",
  confidence: "RESET CONFIRMED",
  lastResetAt: "2026-08-11T10:01:00Z",
  updatedAt: "2026-08-11T10:02:00Z",
  statusText: "A reset was observed by the surveillance process.",
  source: { ...baselineLedger.source, observedAt: "2026-08-11T10:02:00Z" },
  history: [{
    resetAt: "2026-08-11T10:01:00Z",
    confidence: "RESET CONFIRMED",
    summary: "Reset observed."
  }]
};

function serialize(ledger) {
  return `${JSON.stringify(ledger, null, 2)}\n`;
}

let failures = 0;

function check(condition, message) {
  if (condition) {
    console.log(`ok - ${message}`);
  } else {
    failures += 1;
    console.error(`not ok - ${message}`);
  }
}

try {
  await mkdir(fixtureScripts);
  await mkdir(fixturePublic);
  await copyFile(join(scriptDir, "publish-reset-data.sh"), publishScript);
  await copyFile(join(scriptDir, "validate-reset-data.mjs"), join(fixtureScripts, "validate-reset-data.mjs"));

  const baselineText = serialize(baselineLedger);
  await writeFile(publicLedger, baselineText, { mode: 0o640 });
  const baselineMode = (await stat(publicLedger)).mode & 0o777;

  const invalidPath = join(fixtureRepo, "invalid.json");
  await writeFile(invalidPath, serialize({ ...replacementLedger, confidence: "CERTAINLY MAYBE" }));
  try {
    await execFileAsync("bash", [publishScript, invalidPath]);
    check(false, "invalid staged data is rejected");
  } catch {
    check(true, "invalid staged data is rejected");
  }
  check(await readFile(publicLedger, "utf8") === baselineText, "rejection leaves the public ledger untouched");

  const stalePath = join(fixtureRepo, "stale.json");
  await writeFile(stalePath, serialize({ ...baselineLedger, updatedAt: "2026-08-11T09:59:59Z" }));
  try {
    await execFileAsync("bash", [publishScript, stalePath]);
    check(false, "stale staged data is rejected");
  } catch (error) {
    check(error.stderr.includes("Refusing to publish stale ledger"), "stale staged data is rejected");
  }
  check(await readFile(publicLedger, "utf8") === baselineText, "stale rejection leaves the public ledger untouched");

  const conflictingPath = join(fixtureRepo, "conflicting.json");
  await writeFile(conflictingPath, serialize({ ...baselineLedger, state: "conflicting state" }));
  try {
    await execFileAsync("bash", [publishScript, conflictingPath]);
    check(false, "a conflicting ledger cannot reuse the current update timestamp");
  } catch (error) {
    check(error.stderr.includes("Refusing to publish conflicting ledger"), "a conflicting ledger cannot reuse the current update timestamp");
  }
  check(await readFile(publicLedger, "utf8") === baselineText, "conflict rejection leaves the public ledger untouched");

  const equivalentPath = join(fixtureRepo, "equivalent.json");
  await writeFile(equivalentPath, JSON.stringify(baselineLedger));
  await execFileAsync("bash", [publishScript, equivalentPath]);
  check(JSON.parse(await readFile(publicLedger, "utf8")).updatedAt === baselineLedger.updatedAt, "an equivalent ledger may be republished idempotently");

  const validPath = join(fixtureRepo, "valid.json");
  const replacementText = serialize(replacementLedger);
  await writeFile(validPath, replacementText);
  await execFileAsync("bash", [publishScript, validPath]);
  check(await readFile(publicLedger, "utf8") === replacementText, "valid staged data replaces the public ledger");
  check(((await stat(publicLedger)).mode & 0o777) === baselineMode, "publication preserves the public ledger mode");
  check((await readdir(fixturePublic)).every((name) => !name.startsWith(".reset-data.json.")), "publication leaves no temporary ledger behind");
} finally {
  await rm(fixtureRepo, { recursive: true, force: true });
}

if (failures) process.exit(1);
console.log("Validated atomic reset ledger publication");
