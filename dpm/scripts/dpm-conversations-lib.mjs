import { createHash, randomBytes } from "node:crypto";
import { resolve } from "node:path";
import {
  ensureConfigDir,
  getConfigDir,
  readJsonFile,
  writeJsonFile,
} from "./dpm-config-lib.mjs";

export function getConversationsPath() {
  return `${getConfigDir()}/conversations.json`;
}

/** @param {string} transcriptPath */
export function cursorThreadKey(transcriptPath) {
  const normalized = resolve(transcriptPath.trim());
  const hash = createHash("sha256").update(normalized, "utf8").digest("hex");
  return `cursor:${hash}`;
}

/** @param {string} sessionId */
export function claudeThreadKey(sessionId) {
  return `claude:${sessionId.trim()}`;
}

/** @returns {string} */
export function generateConversationId() {
  return `conv_${randomBytes(6).toString("hex")}`;
}

/** @returns {{ threads: Record<string, { conversation_id: string, mcp_session_id?: string | null, updated_at: string }> }} */
function readConversationsFile() {
  const data = readJsonFile(getConversationsPath());
  if (!data || typeof data !== "object" || !data.threads || typeof data.threads !== "object") {
    return { threads: {} };
  }
  return { threads: /** @type {Record<string, object>} */ (data.threads) };
}

/** @param {{ threads: Record<string, unknown> }} file */
function writeConversationsFile(file) {
  writeJsonFile(getConversationsPath(), file);
}

/**
 * Resolve stable conversation_id (+ optional mcp_session_id) for a chat thread.
 * @param {string | null | undefined} threadKey
 * @returns {{ conversation_id: string, mcp_session_id: string | null, ephemeral: boolean }}
 */
export function resolveConversationForThread(threadKey) {
  if (!threadKey || typeof threadKey !== "string" || !threadKey.trim()) {
    return {
      conversation_id: generateConversationId(),
      mcp_session_id: null,
      ephemeral: true,
    };
  }

  const key = threadKey.trim();
  const file = readConversationsFile();
  const existing = file.threads[key];
  const now = new Date().toISOString();

  if (
    existing &&
    typeof existing === "object" &&
    typeof existing.conversation_id === "string" &&
    existing.conversation_id.trim()
  ) {
    file.threads[key] = {
      ...existing,
      updated_at: now,
    };
    writeConversationsFile(file);
    return {
      conversation_id: existing.conversation_id.trim(),
      mcp_session_id:
        typeof existing.mcp_session_id === "string" ? existing.mcp_session_id : null,
      ephemeral: false,
    };
  }

  const conversation_id = generateConversationId();
  file.threads[key] = {
    conversation_id,
    mcp_session_id: null,
    updated_at: now,
  };
  ensureConfigDir();
  writeConversationsFile(file);

  return { conversation_id, mcp_session_id: null, ephemeral: false };
}

/**
 * @param {string} threadKey
 * @param {string | null | undefined} mcpSessionId
 */
export function persistMcpSessionId(threadKey, mcpSessionId) {
  if (!threadKey?.trim() || !mcpSessionId?.trim()) return;
  const file = readConversationsFile();
  const entry = file.threads[threadKey.trim()];
  if (!entry || typeof entry !== "object") return;
  file.threads[threadKey.trim()] = {
    ...entry,
    mcp_session_id: mcpSessionId.trim(),
    updated_at: new Date().toISOString(),
  };
  writeConversationsFile(file);
}

/**
 * @param {{ host: 'cursor', transcriptPath: string } | { host: 'claude', sessionId: string } | { host: 'unknown' }} input
 */
export function resolveThreadKey(input) {
  if (input.host === "cursor" && input.transcriptPath?.trim()) {
    return cursorThreadKey(input.transcriptPath);
  }
  if (input.host === "claude" && input.sessionId?.trim()) {
    return claudeThreadKey(input.sessionId);
  }
  return null;
}
