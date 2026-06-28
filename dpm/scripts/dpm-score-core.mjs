import { sessionStatus, resolveVisitorRef } from "./dpm-config-lib.mjs";
import { resolveDefaultMcpCredentials } from "./dpm-spaces-lib.mjs";
import { extractTranscriptEcho, stripUserQueryWrapper } from "./extract-transcript-echo.mjs";
import { mcpScoreTurn, guidanceSystemPrompt } from "./dpm-mcp-client.mjs";
import { writeSteeringCache, guidanceFromCache } from "./dpm-steering-cache.mjs";
import {
  resolveConversationForThread,
  persistMcpSessionId,
} from "./dpm-conversations-lib.mjs";

/**
 * @param {{
 *   message: string,
 *   transcriptPath?: string | null,
 *   threadKey?: string | null,
 *   turnKey: string,
 *   contextHint?: string,
 *   agentIdentity?: string,
 * }} opts
 * @returns {Promise<{ structuredContent: Record<string, unknown>, guidance: string } | null>}
 */
export async function scoreTurnForPrompt(opts) {
  const status = sessionStatus();
  if (!status.active) return null;

  const message = stripUserQueryWrapper(opts.message);
  if (!message) return null;

  const creds = resolveDefaultMcpCredentials();
  if (!creds) {
    throw new Error("DPM MCP credentials missing. Run install-dpm-hooks.mjs --from-mcp-json");
  }

  const visitor_ref = status.visitor_ref ?? resolveVisitorRef();
  const echo = extractTranscriptEcho(opts.transcriptPath ?? null);
  const { conversation_id, mcp_session_id, ephemeral } = resolveConversationForThread(
    opts.threadKey ?? null,
  );

  if (ephemeral) {
    process.stderr.write(
      "dpm-score-core: no thread key — using ephemeral conversation_id for this turn only\n",
    );
  }

  const { structured, mcpSessionId } = await mcpScoreTurn({
    url: creds.url,
    apiKey: creds.apiKey,
    mcpSessionId: mcp_session_id,
    arguments: {
      visitor_ref,
      message,
      conversation_id,
      ...(echo ? { previous_assistant_message: echo } : {}),
      ...(opts.contextHint ? { context_hint: opts.contextHint } : {}),
      ...(opts.agentIdentity ? { agent_identity: opts.agentIdentity } : {}),
      ...(status.dry_run ? { dry_run: true } : {}),
    },
  });

  if (!structured) return null;

  if (opts.threadKey && mcpSessionId) {
    persistMcpSessionId(opts.threadKey, mcpSessionId);
  }

  writeSteeringCache(opts.turnKey, structured, {
    agent_identity: opts.agentIdentity ?? "dpm-hook",
    context_hint: opts.contextHint ?? null,
  });

  return {
    structuredContent: structured,
    guidance: guidanceSystemPrompt(structured),
  };
}

export { guidanceFromCache };

/**
 * @param {string | null | undefined} composerMode
 * @returns {string}
 */
export function resolveCursorContextHint(composerMode) {
  const mode = (composerMode ?? "").toLowerCase();
  if (mode.includes("ask")) return "cursor ask mode";
  if (mode.includes("plan")) return "cursor plan mode";
  if (mode.includes("edit")) return "cursor agent mode";
  return "cursor agent mode";
}
