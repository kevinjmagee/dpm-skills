#!/usr/bin/env node
/**
 * Cursor beforeSubmitPrompt hook — scores via DPM when session active; writes steering cache.
 */
import { scoreTurnForPrompt, resolveCursorContextHint } from "./dpm-score-core.mjs";
import { readComposerModeCache } from "./dpm-spaces-lib.mjs";

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function failOpen() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

async function main() {
  try {
    const input = await readStdinJson();
    const prompt = typeof input.prompt === "string" ? input.prompt : "";
    const generationId =
      typeof input.generation_id === "string" ? input.generation_id : crypto.randomUUID();
    const transcriptPath =
      typeof input.transcript_path === "string" ? input.transcript_path : null;
    const composerMode = readComposerModeCache();

    if (prompt) {
      await scoreTurnForPrompt({
        message: prompt,
        transcriptPath,
        turnKey: generationId,
        contextHint: resolveCursorContextHint(composerMode),
        agentIdentity: "cursor-hook",
      });
    }
    failOpen();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`dpm-cursor-pre-prompt-hook: ${msg}\n`);
    failOpen();
  }
}

main();
