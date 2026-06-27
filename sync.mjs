#!/usr/bin/env node
/**
 * Sync src/assets/dpm-skills/ to tools/dpm-skills-public/ for publishing
 * kevinjmagee/dpm-skills on GitHub.
 */

import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");
const ASSETS = join(ROOT, "src/assets/dpm-skills");
const OUT = __dirname;

const FILES = [
  ["dpm/SKILL.md", "dpm/SKILL.md"],
  ["dpm-help/SKILL.md", "dpm-help/SKILL.md"],
  ["dpm-config.example.json", "dpm-config.example.json"],
  ["scripts/dpm-config-lib.mjs", "scripts/dpm-config-lib.mjs"],
  ["scripts/init-config.mjs", "scripts/init-config.mjs"],
  ["scripts/dpm-session.mjs", "scripts/dpm-session.mjs"],
  ["cursor-rules/dpm-global-session.mdc", "cursor-rules/dpm-global-session.mdc"],
];

for (const [, dest] of FILES) {
  mkdirSync(join(OUT, dirname(dest)), { recursive: true });
}

for (const [src, dest] of FILES) {
  cpSync(join(ASSETS, src), join(OUT, dest));
}

console.log("Synced dpm-skills assets to tools/dpm-skills-public/");
