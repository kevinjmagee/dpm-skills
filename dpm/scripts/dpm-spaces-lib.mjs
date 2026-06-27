import { readFileSync, writeFileSync, existsSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getConfigDir, ensureConfigDir, readJsonFile, writeJsonFile } from "./dpm-config-lib.mjs";

export function getSpacesPath() {
  return join(getConfigDir(), "spaces.json");
}

export function getSecretsPath() {
  return join(getConfigDir(), "secrets.json");
}

export function getComposerModePath() {
  return join(getConfigDir(), "composer-mode.json");
}

/** @returns {Record<string, unknown>} */
export function readSpacesConfig() {
  return readJsonFile(getSpacesPath()) ?? { spaces: {} };
}

/** @returns {Record<string, unknown>} */
export function readSecretsConfig() {
  return readJsonFile(getSecretsPath()) ?? { spaces: {} };
}

/**
 * @param {string} spaceKey
 * @returns {{ url: string, apiKey: string, spaceId?: string } | null}
 */
export function resolveMcpCredentials(spaceKey) {
  const spaces = readSpacesConfig();
  const secrets = readSecretsConfig();
  const defaultKey =
    typeof spaces.default_space === "string" ? spaces.default_space.trim() : "";
  const key = spaceKey || defaultKey;
  const spaceMap = spaces.spaces && typeof spaces.spaces === "object" ? spaces.spaces : {};
  const secretMap = secrets.spaces && typeof secrets.spaces === "object" ? secrets.spaces : {};
  const entry = key && spaceMap[key] && typeof spaceMap[key] === "object" ? spaceMap[key] : null;
  const secretEntry = key && secretMap[key] && typeof secretMap[key] === "object" ? secretMap[key] : null;
  const url = entry && typeof entry.url === "string" ? entry.url.trim() : "";
  const apiKey =
    secretEntry && typeof secretEntry.api_key === "string"
      ? secretEntry.api_key.trim()
      : secretEntry && typeof secretEntry.bearer === "string"
        ? secretEntry.bearer.trim()
        : "";
  if (!url || !apiKey) return null;
  const spaceId = entry && typeof entry.space_id === "string" ? entry.space_id : undefined;
  return { url, apiKey, spaceId };
}

/** @returns {{ url: string, apiKey: string } | null} */
export function resolveDefaultMcpCredentials() {
  return resolveMcpCredentials("");
}

/**
 * @param {string} mcpJsonPath
 * @param {{ preferServerName?: string }} [opts]
 */
export function importFromMcpJson(mcpJsonPath, opts = {}) {
  if (!existsSync(mcpJsonPath)) {
    throw new Error(`MCP config not found: ${mcpJsonPath}`);
  }
  const raw = JSON.parse(readFileSync(mcpJsonPath, "utf8"));
  const servers = raw.mcpServers && typeof raw.mcpServers === "object" ? raw.mcpServers : {};
  const names = Object.keys(servers);
  if (names.length === 0) {
    throw new Error("No mcpServers entries in config");
  }
  const prefer = opts.preferServerName?.trim();
  const name =
    (prefer && servers[prefer] ? prefer : null) ||
    names.find((n) => n.startsWith("dpm-")) ||
    names[0];
  const entry = servers[name];
  if (!entry || typeof entry !== "object") {
    throw new Error(`Invalid mcpServers entry: ${name}`);
  }
  const url = typeof entry.url === "string" ? entry.url.trim() : "";
  const headers = entry.headers && typeof entry.headers === "object" ? entry.headers : {};
  let apiKey = "";
  if (typeof headers.Authorization === "string") {
    apiKey = headers.Authorization.replace(/^Bearer\s+/i, "").trim();
  } else if (typeof headers["x-dpm-api-key"] === "string") {
    apiKey = headers["x-dpm-api-key"].trim();
  }
  if (!url || !apiKey) {
    throw new Error(`Missing url or Authorization in mcpServers.${name}`);
  }
  const spaceIdMatch = url.match(/\/spaces\/([0-9a-f-]{36})\/mcp/i);
  const space_id = spaceIdMatch ? spaceIdMatch[1] : undefined;
  ensureConfigDir();
  const spaces = readSpacesConfig();
  const spacesMap =
    spaces.spaces && typeof spaces.spaces === "object" ? { ...spaces.spaces } : {};
  spacesMap[name] = { url, ...(space_id ? { space_id } : {}) };
  writeJsonFile(getSpacesPath(), {
    ...spaces,
    default_space: name,
    spaces: spacesMap,
  });
  const secrets = readSecretsConfig();
  const secretsMap =
    secrets.spaces && typeof secrets.spaces === "object" ? { ...secrets.spaces } : {};
  secretsMap[name] = { api_key: apiKey };
  const secretsPath = getSecretsPath();
  writeJsonFile(secretsPath, { spaces: secretsMap });
  try {
    chmodSync(secretsPath, 0o600);
  } catch {
    /* windows may not support chmod */
  }
  return { serverName: name, url, space_id };
}

/** @returns {string} */
export function resolveSkillScriptsDir() {
  if (process.env.DPM_SKILL_SCRIPTS_DIR?.trim()) {
    return process.env.DPM_SKILL_SCRIPTS_DIR.trim();
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    here,
    join(homedir(), ".agents", "skills", "dpm", "scripts"),
    join(homedir(), ".claude", "skills", "dpm", "scripts"),
    join(homedir(), ".cursor", "skills", "dpm", "scripts"),
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "dpm-config-lib.mjs"))) {
      return dir;
    }
  }
  return here;
}

/** @param {string} composerMode */
export function writeComposerModeCache(composerMode) {
  writeJsonFile(getComposerModePath(), {
    composer_mode: composerMode,
    updated_at: new Date().toISOString(),
  });
}

/** @returns {string | null} */
export function readComposerModeCache() {
  const data = readJsonFile(getComposerModePath());
  if (!data || typeof data.composer_mode !== "string") return null;
  return data.composer_mode.trim() || null;
}
