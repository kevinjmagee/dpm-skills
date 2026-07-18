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

/** @param {unknown} value */
function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

/**
 * Format one scoped block (conversation or visitor) into digest lines.
 * @param {string} scopeLabel
 * @param {Record<string, unknown>} scope
 * @returns {string[]}
 */
function formatScopeDigest(scopeLabel, scope) {
  const signals = asObject(scope.signals);
  const directives = asObject(scope.directives);
  const topics = asObject(scope.topics);
  const cluster = asObject(scope.behavior_cluster ?? scope.cohort);
  const scopeMeta = asObject(scope.meta);

  const intent = signals.intent_stage ?? "unknown";
  const receptivity = signals.receptivity;
  const depth = directives.recommended_depth ?? "moderate";
  const clusterLabel = cluster.label ?? "unknown";
  const hedge = cluster.hedge === true;
  const clusterSource = cluster.source;

  const topicLine = (key) => {
    const arr = topics[key];
    return Array.isArray(arr) && arr.length ? arr.join(", ") : null;
  };

  const flags = Object.entries(directives)
    .filter(([, v]) => v === true)
    .map(([k]) => k);

  const lines = [
    `[${scopeLabel}] Intent: ${intent} | Depth: ${depth} | Cluster: ${clusterLabel}${hedge ? " (hedge)" : ""}${clusterSource ? ` (${clusterSource})` : ""}`,
  ];
  if (receptivity) lines[0] += ` | Receptivity: ${receptivity}`;

  const metaParts = [];
  if (scopeMeta.personalization_source) metaParts.push(`src=${scopeMeta.personalization_source}`);
  if (scopeMeta.evidence_turns !== undefined) metaParts.push(`ev=${scopeMeta.evidence_turns}`);
  if (scopeMeta.profile_version !== undefined) metaParts.push(`pv=${scopeMeta.profile_version}`);
  if (scopeMeta.label_source) metaParts.push(`label=${scopeMeta.label_source}`);
  if (clusterSource) metaParts.push(`cluster=${clusterSource}`);
  if (metaParts.length) lines.push(`  Meta — ${metaParts.join(" | ")}`);

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
  if (topicParts.length) lines.push(`  Topics — ${topicParts.join(" | ")}`);
  if (flags.length) lines.push(`  Flags: ${flags.join(", ")}`);

  return lines;
}

/**
 * Compose coaching prompt + compact dual-scope structured digest for hook/agent injection.
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

  const meta = asObject(structured.meta);
  const contractVersion = meta.contract_version ?? structured.contract_version;
  const isDualScope =
    contractVersion === 5 ||
    contractVersion === 4 ||
    (structured.conversation && typeof structured.conversation === "object") ||
    (structured.visitor && typeof structured.visitor === "object");

  const digestLines = ["", "STRUCTURED STEERING (authoritative)"];

  if (isDualScope) {
    const conversation = asObject(structured.conversation);
    const visitor = asObject(structured.visitor);
    digestLines.push(...formatScopeDigest("conversation", conversation));
    digestLines.push(...formatScopeDigest("visitor", visitor));
  } else {
    // Legacy v3 flat fallback (test systems only)
    digestLines.push(...formatScopeDigest("conversation", {
      signals: structured.signals,
      directives: structured.directives,
      topics: structured.topics,
      behavior_cluster: structured.behavior_cluster ?? structured.cohort,
    }));
  }

  return coaching ? `${coaching}${digestLines.join("\n")}` : digestLines.join("\n").trim();
}
