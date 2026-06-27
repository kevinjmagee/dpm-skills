#!/usr/bin/env node
/**
 * Cursor sessionStart hook — cache composer_mode for context_hint resolution.
 */
import { writeComposerModeCache } from "./dpm-spaces-lib.mjs";

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

async function main() {
  try {
    const input = await readStdinJson();
    const mode =
      typeof input.composer_mode === "string" ? input.composer_mode.trim() : "agent";
    writeComposerModeCache(mode);
  } catch {
    /* fail open */
  }
  process.stdout.write(JSON.stringify({ continue: true }));
}

main();
