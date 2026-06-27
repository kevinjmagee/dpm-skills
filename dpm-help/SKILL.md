---
name: dpm-help
description: >
  One-shot reference for DPM session mode slash commands and install steps.
  Trigger: /dpm-help, dpm help, what dpm commands, how do I use /dpm.
  Does NOT enable DPM mode or call MCP.
---

# DPM Help

Display this card when invoked. **One-shot** — do NOT enable DPM mode unless the user separately asks.

## Commands

| Command | Effect |
|---------|--------|
| `/dpm` or `/dpm on` | Global ON — `dpm-session.mjs on`; steering in **all chats** until off |
| `/dpm dry` | Global ON with `dry_run: true` |
| `/dpm off` | Global OFF — `dpm-session.mjs off` |
| `/dpm status` | Show session.json state, visitor_ref, dry_run |

Also off: `stop dpm`, `normal mode` (no dpm).

## One-time setup

1. Install skills: `npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex`
2. Initialize visitor ref: `node ~/.agents/skills/dpm/scripts/init-config.mjs`
3. **Cursor only:** copy `~/.agents/skills/dpm/cursor-rules/dpm-global-session.mdc` → `~/.cursor/rules/`
4. Connect MCP from Portal
5. Install hooks: `node ~/.agents/skills/dpm/scripts/install-dpm-hooks.mjs --all --from-mcp-json .cursor/mcp.json`
6. Type `/dpm on` once

## Uninstall (agent prompt)

Use the Portal **one-shot agent uninstall prompt**, or run in order:

1. `node <skill-dir>/scripts/dpm-session.mjs off`
2. Remove DPM entries from `~/.cursor/hooks.json` and `~/.claude/settings.json`
3. `npx skills remove dpm dpm-help -g -y -a cursor -a claude-code -a codex`
4. Optional: delete `~/.config/dpm/secrets.json`, `spaces.json`, `steering/`

## State files

| File | Purpose |
|------|---------|
| `~/.config/dpm/config.json` | Stable per-machine `visitor_ref` |
| `~/.config/dpm/session.json` | Global active / dry_run |
| `~/.config/dpm/spaces.json` | MCP URLs (hooks) |
| `~/.config/dpm/secrets.json` | API keys (hooks) |
| `~/.config/dpm/steering/*.json` | Hook steering cache |

## Agent loop (when session active + hooks)

**Cursor:** Read hook cache → apply `guidance.system_prompt` → reply (MCP fallback if cache missing).

**Claude Code:** Hook injects steering — do not double-call `score_turn`.

Public repo: https://github.com/kevinjmagee/dpm-skills
