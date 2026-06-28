# DPM Agent Skills

Agent-agnostic [Agent Skills](https://agentskills.io) for global DPM behavioral steering over MCP.

Works with Cursor, Claude Code, Codex, and other agentskills.io-compatible hosts.

## Install

```bash
# 1. Skills (Cursor, Claude Code, Codex)
npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex

# 2. Unique per-machine visitor_ref (once)
node ~/.agents/skills/dpm/scripts/init-config.mjs

# 3. Pre-prompt hooks (Cursor + Claude Code, recommended)
node ~/.agents/skills/dpm/scripts/install-dpm-hooks.mjs --all --from-mcp-json .cursor/mcp.json

# 4. Global cross-chat session rule (Cursor only, once)
# ~/.agents/skills/dpm/cursor-rules/dpm-global-session.mdc → ~/.cursor/rules/
```

Then connect DPM MCP (Portal → MCP connection → mcpServers JSON) and type **`/dpm on`** in any chat.

Skill paths may also be `~/.cursor/skills/dpm/` or `~/.claude/skills/dpm/` depending on host.

## Global session

- **`~/.config/dpm/session.json`** — `active` flag shared across all chats
- **`/dpm on`** in one chat → steering in every chat until **`/dpm off`**
- Requires **`dpm-global-session.mdc`** in `~/.cursor/rules/` (Cursor only)

## Pre-prompt hooks (recommended)

When `/dpm on` is active, hooks call `score_turn` before each user message:

| Host | Hook | Delivery |
|------|------|----------|
| Cursor | `beforeSubmitPrompt` | Cache at `~/.config/dpm/steering/<generation_id>.json` → agent **Read** |
| Claude Code | `UserPromptSubmit` | Direct context injection |

Install once with `install-dpm-hooks.mjs --all`. Works in Cursor Agent, Plan, and Ask.

Without hooks, the agent skill calls MCP `score_turn` before each reply (fallback).

## Scripts

Scripts live under **`dpm/scripts/`** and install with the `dpm` skill.

| Script | Purpose |
|--------|---------|
| `init-config.mjs` | Create unique `ghost_<hex>` in `config.json` |
| `dpm-session.mjs` | `on \| off \| dry \| status` for global session |
| `install-dpm-hooks.mjs` | Install Cursor + Claude Code pre-prompt hooks |
| `prepare-assistant-echo.mjs` | Compact prior reply for `previous_assistant_message` |

## Skills

| Skill | Command |
|-------|---------|
| `dpm` | `/dpm`, `/dpm on`, `/dpm off`, `/dpm dry`, `/dpm status` |
| `dpm-help` | `/dpm-help` — install reference and uninstall steps |

## State files

| File | Purpose |
|------|---------|
| `~/.config/dpm/config.json` | Stable per-machine `visitor_ref` |
| `~/.config/dpm/conversations.json` | Stable `conversation_id` per chat thread (hooks) |
| `~/.config/dpm/session.json` | Global active / dry_run |
| `~/.config/dpm/spaces.json` | MCP URLs (hooks) |
| `~/.config/dpm/secrets.json` | API keys (hooks) |
| `~/.config/dpm/steering/*.json` | Hook steering cache |

## Uninstall

1. `node ~/.agents/skills/dpm/scripts/dpm-session.mjs off`
2. Remove DPM entries from `~/.cursor/hooks.json` and `~/.claude/settings.json`
3. `npx skills remove dpm dpm-help -g -y -a cursor -a claude-code -a codex`
4. Optional: delete `~/.config/dpm/secrets.json`, `spaces.json`, `steering/`

Or use the Portal **one-shot agent uninstall prompt**.

## Sync / publish

Canonical source: `contextmind-dpm/src/assets/dpm-skills/`. Run `node tools/dpm-skills-public/sync.mjs` then push to this repo.
