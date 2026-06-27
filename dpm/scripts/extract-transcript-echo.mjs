import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getConfigDir } from "./dpm-config-lib.mjs";
import { prepareAssistantEcho } from "./prepare-assistant-echo.mjs";

/**
 * @param {string | null | undefined} transcriptPath
 * @returns {string}
 */
export function extractTranscriptEcho(transcriptPath) {
  if (!transcriptPath || typeof transcriptPath !== "string") return "";
  const path = transcriptPath.trim();
  if (!path || !existsSync(path)) return "";

  let raw = "";
  try {
    raw = readFileSync(path, "utf8");
  } catch {
    return "";
  }

  const lines = raw.split(/\r?\n/).filter((line) => line.trim());
  let lastAssistantText = "";

  for (const line of lines) {
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue;
    }
    if (!row || row.role !== "assistant") continue;
    const content = row.message?.content;
    if (!Array.isArray(content)) continue;
    const parts = [];
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      if (block.type === "text" && typeof block.text === "string") {
        const text = block.text.trim();
        if (text && !text.startsWith("[REDACTED]")) {
          parts.push(text);
        }
      }
    }
    if (parts.length > 0) {
      lastAssistantText = parts.join("\n\n");
    }
  }

  return prepareAssistantEcho(lastAssistantText, { profile: "coding" });
}

/**
 * @param {string} userPrompt
 * @returns {string}
 */
export function stripUserQueryWrapper(userPrompt) {
  if (typeof userPrompt !== "string") return "";
  const match = userPrompt.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  return (match ? match[1] : userPrompt).trim();
}
