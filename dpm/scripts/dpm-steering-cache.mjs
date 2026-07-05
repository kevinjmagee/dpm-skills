import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync, statSync } from "node:fs";
import { join } from "node:path";
import { getConfigDir, ensureConfigDir } from "./dpm-config-lib.mjs";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_FILES = 50;

export function getSteeringCacheDir() {
  return join(getConfigDir(), "steering");
}

function safeTurnKey(turnKey) {
  return String(turnKey ?? "unknown").replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function getSteeringCachePath(turnKey) {
  return join(getSteeringCacheDir(), `${safeTurnKey(turnKey)}.json`);
}

/** @param {string} turnKey @param {Record<string, unknown>} structured @param {Record<string, unknown>} [meta] */
export function writeSteeringCache(turnKey, structured, meta = {}) {
  ensureConfigDir();
  mkdirSync(getSteeringCacheDir(), { recursive: true });
  const payload = {
    turn_key: turnKey,
    scored_at: new Date().toISOString(),
    structuredContent: structured,
    ...meta,
  };
  writeFileSync(getSteeringCachePath(turnKey), `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  pruneSteeringCache();
  return payload;
}

/** @param {string} turnKey */
export function readSteeringCache(turnKey) {
  const path = getSteeringCachePath(turnKey);
  if (!existsSync(path)) return null;
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    if (!data || typeof data !== "object") return null;
    const scoredAt = Date.parse(data.scored_at ?? "");
    if (Number.isFinite(scoredAt) && Date.now() - scoredAt > CACHE_TTL_MS) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function pruneSteeringCache() {
  const dir = getSteeringCacheDir();
  if (!existsSync(dir)) return;
  let entries = [];
  try {
    entries = readdirSync(dir)
      .filter((name) => name.endsWith(".json"))
      .map((name) => {
        const full = join(dir, name);
        return { full, mtime: statSync(full).mtimeMs };
      })
      .sort((a, b) => b.mtime - a.mtime);
  } catch {
    return;
  }
  for (const entry of entries.slice(MAX_CACHE_FILES)) {
    try {
      unlinkSync(entry.full);
    } catch {
      /* ignore */
    }
  }
}

/** @param {Record<string, unknown> | null | undefined} cached */
export function guidanceFromCache(cached) {
  if (!cached || typeof cached !== "object") return "";
  const structured = cached.structuredContent;
  if (!structured || typeof structured !== "object") return "";
  return formatAgentSteering(structured);
}

/**
 * Compose coaching prompt + compact structured digest for hook/agent injection.
 * @param {Record<string, unknown>} structured
 * @returns {string}
 */
export function formatAgentSteering(structured) {
  if (!structured || typeof structured !== "object") return "";
  const guidance = structured.guidance;
  const coaching =
    guidance && typeof guidance === "object" && typeof guidance.system_prompt === "string"
      ? guidance.system_prompt.trim()
      : "";

  const signals = structured.signals && typeof structured.signals === "object" ? structured.signals : {};
  const directives =
    structured.directives && typeof structured.directives === "object" ? structured.directives : {};
  const topics = structured.topics && typeof structured.topics === "object" ? structured.topics : {};
  const cohort =
    structured.cohort && typeof structured.cohort === "object" ? structured.cohort : {};

  const intent = signals.intent_stage ?? structured.intent_stage ?? "unknown";
  const depth = directives.recommended_depth ?? "moderate";
  const cohortLabel = cohort.label ?? "unknown";
  const hedge = cohort.hedge === true;

  const topicLine = (key) => {
    const arr = topics[key];
    return Array.isArray(arr) && arr.length ? arr.join(", ") : null;
  };

  const flags = Object.entries(directives)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const digestLines = [
    "",
    "STRUCTURED STEERING (authoritative)",
    `- Intent: ${intent} | Depth: ${depth} | Cohort: ${cohortLabel}${hedge ? " (hedge)" : ""}`,
  ];

  const surface = topicLine("surface");
  const deepen = topicLine("deepen");
  const scaffold = topicLine("scaffold");
  const avoid = topicLine("avoid");
  const next = topicLine("next");
  const topicParts = [];
  if (surface) topicParts.push(`surface: ${surface}`);
  if (deepen) topicParts.push(`deepen: ${deepen}`);
  if (scaffold) topicParts.push(`scaffold: ${scaffold}`);
  if (avoid) topicParts.push(`avoid: ${avoid}`);
  if (next) topicParts.push(`next: ${next}`);
  if (topicParts.length) digestLines.push(`- Topics — ${topicParts.join(" | ")}`);
  if (flags.length) digestLines.push(`- Flags: ${flags.join(", ")}`);

  return coaching ? `${coaching}${digestLines.join("\n")}` : digestLines.join("\n").trim();
}
