#!/usr/bin/env node
/**
 * Claude Code UserPromptSubmit hook — scores via DPM when session active; injects steering.
 */
import { scoreTurnForPrompt } from "./dpm-score-core.mjs";

async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  return JSON.parse(text);
}

function outputContinue() {
  process.stdout.write(JSON.stringify({ continue: true }));
}

async function main() {
  try {
    const input = await readStdinJson();
    const prompt =
      typeof input.user_prompt === "string"
        ? input.user_prompt
        : typeof input.prompt === "string"
          ? input.prompt
          : "";
    const sessionId =
      typeof input.session_id === "string" ? input.session_id : crypto.randomUUID();
    const transcriptPath =
      typeof input.transcript_path === "string" ? input.transcript_path : null;

    if (!prompt) {
      outputContinue();
      return;
    }

    const result = await scoreTurnForPrompt({
      message: prompt,
      transcriptPath,
      turnKey: sessionId,
      contextHint: "claude code agent mode",
      agentIdentity: "claude-code-hook",
    });

    if (!result?.guidance) {
      outputContinue();
      return;
    }

    process.stdout.write(
      JSON.stringify({
        continue: true,
        systemMessage: result.guidance,
        hookSpecificOutput: {
          hookEventName: "UserPromptSubmit",
          additionalContext: result.guidance,
        },
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`dpm-claude-userprompt-hook: ${msg}\n`);
    outputContinue();
  }
}

main();
