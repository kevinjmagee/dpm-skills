import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

export const FORBIDDEN_VISITOR_REFS = new Set([
  "ghost_session_cursor",
  "ghost_cursor",
  "ghost_user",
  "ghost_session",
  "ghost_dev",
]);

/** @returns {string} */
export function getConfigDir() {
  if (process.env.DPM_CONFIG_HOME) {
    return process.env.DPM_CONFIG_HOME;
  }
  return join(homedir(), ".config", "dpm");
}

export function getConfigPath() {
  return join(getConfigDir(), "config.json");
}

export function getSessionPath() {
  return join(getConfigDir(), "session.json");
}

export function ensureConfigDir() {
  mkdirSync(getConfigDir(), { recursive: true });
}

/** @returns {string} */
export function generateVisitorRef() {
  return `ghost_${randomBytes(6).toString("hex")}`;
}

/** @param {unknown} ref */
export function isForbiddenVisitorRef(ref) {
  if (typeof ref !== "string") return true;
  const normalized = ref.trim().toLowerCase();
  return FORBIDDEN_VISITOR_REFS.has(normalized) || normalized.length === 0;
}

/** @returns {Record<string, unknown> | null} */
export function readJsonFile(path) {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/** @param {string} path @param {Record<string, unknown>} data */
export function writeJsonFile(path, data) {
  ensureConfigDir();
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

/** @returns {{ created: boolean, path: string, visitor_ref: string, source: string }} */
export function initConfig() {
  const path = getConfigPath();
  const existing = readJsonFile(path);
  const existingRef =
    existing && typeof existing.visitor_ref === "string" ? existing.visitor_ref.trim() : "";

  if (existingRef && !isForbiddenVisitorRef(existingRef)) {
    return { created: false, path, visitor_ref: existingRef, source: "existing config" };
  }

  const visitor_ref = generateVisitorRef();
  const next = {
    ...(existing && typeof existing === "object" ? existing : {}),
    visitor_ref,
    dry_run: existing?.dry_run === true,
  };
  if (typeof next.agent_identity !== "string") {
    next.agent_identity = "coding-agent";
  }
  writeJsonFile(path, next);
  return { created: true, path, visitor_ref, source: "newly initialized" };
}

/** @returns {Record<string, unknown>} */
export function readConfig() {
  const path = getConfigPath();
  const data = readJsonFile(path);
  if (!data || typeof data !== "object") {
    return {};
  }
  return data;
}

/** @returns {string} */
export function resolveVisitorRef() {
  const init = initConfig();
  return init.visitor_ref;
}

/** @param {{ dry?: boolean }} [opts] */
export function sessionOn(opts = {}) {
  const dry = opts.dry === true;
  const { visitor_ref, path: configPath } = initConfig();
  const sessionPath = getSessionPath();
  const session = {
    active: true,
    dry_run: dry,
    visitor_ref,
    enabled_at: new Date().toISOString(),
    config_path: configPath,
  };
  writeJsonFile(sessionPath, session);
  return { sessionPath, session, configPath };
}

export function sessionOff() {
  const sessionPath = getSessionPath();
  const existing = readJsonFile(sessionPath);
  const visitor_ref =
    existing && typeof existing.visitor_ref === "string"
      ? existing.visitor_ref
      : resolveVisitorRef();
  const session = {
    active: false,
    dry_run: false,
    visitor_ref,
    disabled_at: new Date().toISOString(),
  };
  writeJsonFile(sessionPath, session);
  return { sessionPath, session };
}

/** @returns {{ active: boolean, dry_run: boolean, visitor_ref: string | null, config_path: string, session_path: string, visitor_ref_source: string }} */
export function sessionStatus() {
  const configPath = getConfigPath();
  const sessionPath = getSessionPath();
  const config = readConfig();
  const session = readJsonFile(sessionPath);

  const configRef =
    typeof config.visitor_ref === "string" && !isForbiddenVisitorRef(config.visitor_ref)
      ? config.visitor_ref.trim()
      : null;

  let visitor_ref = configRef;
  let visitor_ref_source = configRef ? "config.json" : "none";

  if (!visitor_ref && session && typeof session.visitor_ref === "string") {
    visitor_ref = session.visitor_ref;
    visitor_ref_source = "session.json";
  }

  const active = session?.active === true;

  return {
    active,
    dry_run: session?.dry_run === true,
    visitor_ref,
    config_path: configPath,
    session_path: sessionPath,
    visitor_ref_source,
    enabled_at: typeof session?.enabled_at === "string" ? session.enabled_at : null,
  };
}
