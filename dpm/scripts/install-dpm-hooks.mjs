#!/usr/bin/env node
/**
 * Install DPM pre-prompt hooks for Cursor and Claude Code.
 *
 * Usage:
 *   node install-dpm-hooks.mjs --all [--from-mcp-json path]
 *   node install-dpm-hooks.mjs --cursor [--from-mcp-json path]
 *   node install-dpm-hooks.mjs --claude-code [--from-mcp-json path]
 */
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import {
  importFromMcpJson,
  resolveSkillScriptsDir,
} from "./dpm-spaces-lib.mjs";
import { getConfigDir } from "./dpm-config-lib.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const HOOK_SCRIPT_NAMES = [
  "dpm-config-lib.mjs",
  "dpm-spaces-lib.mjs",
  "dpm-conversations-lib.mjs",
  "dpm-steering-cache.mjs",
  "dpm-mcp-client.mjs",
  "dpm-score-core.mjs",
  "extract-transcript-echo.mjs",
  "prepare-assistant-echo.mjs",
  "dpm-cursor-pre-prompt-hook.mjs",
  "dpm-claude-userprompt-hook.mjs",
  "dpm-cursor-session-start-hook.mjs",
];

function parseArgs(argv) {
  const flags = new Set();
  let fromMcpJson = null;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--all") flags.add("cursor"), flags.add("claude-code");
    else if (arg === "--cursor") flags.add("cursor");
    else if (arg === "--claude-code") flags.add("claude-code");
    else if (arg === "--from-mcp-json") fromMcpJson = argv[++i] ?? null;
  }
  if (flags.size === 0) flags.add("cursor"), flags.add("claude-code");
  return { targets: flags, fromMcpJson };
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(path, data) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function nodeScriptCommand(scriptPath) {
  const normalized = resolve(scriptPath).replace(/\\/g, "/");
  return `node "${normalized}"`;
}

function ensureHookDeps() {
  const depsDir = join(getConfigDir(), "hook-deps");
  const pkgPath = join(depsDir, "package.json");
  mkdirSync(depsDir, { recursive: true });
  if (!existsSync(pkgPath)) {
    writeJson(pkgPath, {
      name: "dpm-hook-deps",
      private: true,
      type: "module",
      dependencies: {
        "@modelcontextprotocol/sdk": "^1.29.0",
      },
    });
  }
  const sdkPath = join(depsDir, "node_modules", "@modelcontextprotocol", "sdk");
  if (!existsSync(sdkPath)) {
    console.log("Installing @modelcontextprotocol/sdk in ~/.config/dpm/hook-deps …");
    execSync("npm install --omit=dev --no-fund --no-audit", {
      cwd: depsDir,
      stdio: "inherit",
    });
  }
}

function copyHookScriptsToCursorHooks(scriptsDir) {
  const cursorHooksDir = join(homedir(), ".cursor", "hooks");
  mkdirSync(cursorHooksDir, { recursive: true });
  for (const name of HOOK_SCRIPT_NAMES) {
    const src = join(scriptsDir, name);
    if (existsSync(src)) {
      cpSync(src, join(cursorHooksDir, name), { force: true });
    }
  }
  return cursorHooksDir;
}

function installCursorHooks(scriptsDir) {
  const hooksDir = copyHookScriptsToCursorHooks(scriptsDir);
  const hooksJsonPath = join(homedir(), ".cursor", "hooks.json");
  const existing = readJson(hooksJsonPath, { version: 1, hooks: {} });
  const hooks = existing.hooks && typeof existing.hooks === "object" ? { ...existing.hooks } : {};

  const prePromptCmd = nodeScriptCommand(join(hooksDir, "dpm-cursor-pre-prompt-hook.mjs"));
  const sessionStartCmd = nodeScriptCommand(join(hooksDir, "dpm-cursor-session-start-hook.mjs"));

  const beforeSubmit = Array.isArray(hooks.beforeSubmitPrompt) ? [...hooks.beforeSubmitPrompt] : [];
  const filteredBefore = beforeSubmit.filter(
    (entry) =>
      !String(entry?.command ?? "").includes("dpm-cursor-pre-prompt-hook") &&
      !String(entry?.command ?? "").includes("dpm-pre-prompt"),
  );
  filteredBefore.unshift({
    command: prePromptCmd,
    matcher: "UserPromptSubmit",
    timeout: 20,
  });
  hooks.beforeSubmitPrompt = filteredBefore;

  const sessionStart = Array.isArray(hooks.sessionStart) ? [...hooks.sessionStart] : [];
  const filteredSession = sessionStart.filter(
    (entry) => !String(entry?.command ?? "").includes("dpm-cursor-session-start-hook"),
  );
  filteredSession.unshift({
    command: sessionStartCmd,
    timeout: 5,
  });
  hooks.sessionStart = filteredSession;

  writeJson(hooksJsonPath, { version: 1, hooks });
  console.log(`Cursor hooks: ${hooksJsonPath}`);
  console.log(`Cursor hook scripts: ${hooksDir}`);
}

function installClaudeCodeHooks(scriptsDir) {
  const settingsPath = join(homedir(), ".claude", "settings.json");
  const existing = readJson(settingsPath, {});
  const hookCmd = nodeScriptCommand(join(scriptsDir, "dpm-claude-userprompt-hook.mjs"));

  const userPromptSubmit = Array.isArray(existing.UserPromptSubmit)
    ? [...existing.UserPromptSubmit]
    : [];

  const filtered = userPromptSubmit.map((block) => {
    if (!block || typeof block !== "object" || !Array.isArray(block.hooks)) return block;
    return {
      ...block,
      hooks: block.hooks.filter(
        (h) => !String(h?.command ?? "").includes("dpm-claude-userprompt-hook"),
      ),
    };
  });

  filtered.unshift({
    matcher: "*",
    hooks: [
      {
        type: "command",
        command: hookCmd,
        timeout: 20,
      },
    ],
  });

  writeJson(settingsPath, { ...existing, UserPromptSubmit: filtered });
  console.log(`Claude Code hooks: ${settingsPath}`);
}

function main() {
  const { targets, fromMcpJson } = parseArgs(process.argv.slice(2));
  const scriptsDir = resolveSkillScriptsDir();
  if (!existsSync(join(scriptsDir, "install-dpm-hooks.mjs"))) {
    console.error(`Skill scripts not found at ${scriptsDir}`);
    process.exit(1);
  }

  if (fromMcpJson) {
    const resolved = resolve(fromMcpJson);
    const imported = importFromMcpJson(resolved);
    console.log(`Imported MCP space "${imported.serverName}" into ~/.config/dpm/spaces.json`);
  }

  ensureHookDeps();

  if (targets.has("cursor")) {
    installCursorHooks(scriptsDir);
  }
  if (targets.has("claude-code")) {
    installClaudeCodeHooks(scriptsDir);
  }

  console.log("\nDPM hooks installed.");
  console.log("Restart Cursor (MCP refresh) and start a new Claude Code session.");
  console.log("Enable steering: node <skill-dir>/scripts/dpm-session.mjs on");
}

main();
