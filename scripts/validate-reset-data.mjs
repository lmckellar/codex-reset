#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (process.argv.length > 3) {
  console.error("Usage: node scripts/validate-reset-data.mjs [ledger-path]");
  process.exit(2);
}

const ledgerPath = process.argv[2]
  ? pathToFileURL(resolve(process.argv[2]))
  : new URL("../public/reset-data.json", import.meta.url);
const ledgerName = process.argv[2] || "public/reset-data.json";
const confidenceLabels = new Set([
  "RESET CONFIRMED",
  "PROBABLE BLESSING",
  "UNVERIFIED APPARITION",
  "CONGREGATIONAL HYSTERIA"
]);
const errors = [];

function requireObject(value, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    errors.push(`${path} must be an object`);
    return false;
  }
  return true;
}

function requireText(value, path) {
  if (typeof value !== "string" || !value.trim()) errors.push(`${path} must be a non-empty string`);
}

function requireConfidence(value, path) {
  if (!confidenceLabels.has(value)) errors.push(`${path} must use the documented confidence vocabulary`);
}

function parseUtcTimestamp(value, path, { nullable = false } = {}) {
  if (nullable && value === null) return null;
  const match = typeof value === "string"
    ? value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/)
    : null;
  if (!match) {
    errors.push(`${path} must be an ISO 8601 UTC timestamp${nullable ? " or null" : ""}`);
    return null;
  }
  const timestamp = Date.parse(value);
  const date = new Date(timestamp);
  const calendarParts = [
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds()
  ];
  const suppliedParts = match.slice(1, 7).map(Number);
  if (Number.isNaN(timestamp) || calendarParts.some((part, index) => part !== suppliedParts[index])) {
    errors.push(`${path} is not a valid date`);
    return null;
  }
  return timestamp;
}

let ledger;
try {
  ledger = JSON.parse(await readFile(ledgerPath, "utf8"));
} catch (error) {
  console.error(`${ledgerName} could not be read: ${error.message}`);
  process.exit(1);
}

if (requireObject(ledger, "ledger")) {
  if (ledger.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  requireText(ledger.state, "state");
  requireConfidence(ledger.confidence, "confidence");
  parseUtcTimestamp(ledger.lastResetAt, "lastResetAt", { nullable: true });
  parseUtcTimestamp(ledger.updatedAt, "updatedAt");
  requireText(ledger.statusText, "statusText");

  if (requireObject(ledger.source, "source")) {
    requireText(ledger.source.name, "source.name");
    parseUtcTimestamp(ledger.source.observedAt, "source.observedAt", { nullable: true });
    if (ledger.source.url !== null) {
      try {
        const url = new URL(ledger.source.url);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        errors.push("source.url must be an HTTP(S) URL or null");
      }
    }
  }

  if (!Array.isArray(ledger.history)) {
    errors.push("history must be an array");
  } else {
    let previousTimestamp = Infinity;
    ledger.history.forEach((event, index) => {
      const path = `history[${index}]`;
      if (!requireObject(event, path)) return;
      const timestamp = parseUtcTimestamp(event.resetAt, `${path}.resetAt`);
      requireConfidence(event.confidence, `${path}.confidence`);
      requireText(event.summary, `${path}.summary`);
      if (timestamp !== null && timestamp > previousTimestamp) errors.push("history must be ordered newest first");
      if (timestamp !== null) previousTimestamp = timestamp;
    });
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log(`${ledgerName} is valid`);
