# DPM Agent Skills

Agent-agnostic [Agent Skills](https://agentskills.io) for global DPM behavioral steering over MCP.

## Install

```bash
# Skills (Cursor, Claude Code, Codex)
npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex

# Unique per-machine visitor_ref (once)
node ~/.cursor/skills/dpm/scripts/init-config.mjs

# Global cross-chat session (Cursor — copy rule file)
# cursor-rules/dpm-global-session.mdc → ~/.cursor/rules/
```

Then connect DPM MCP and type `/dpm on` in any chat.

## Global session

- **`~/.config/dpm/session.json`** — `active` flag shared across all Cursor chats
- **`/dpm on`** in one chat → scoring in every chat until **`/dpm off`**
- Requires **`dpm-global-session.mdc`** in `~/.cursor/rules/` (included in this repo)

## Scripts

| Script | Purpose |
|--------|---------|
| `scripts/init-config.mjs` | Create unique `ghost_<hex>` in `config.json` |
| `scripts/dpm-session.mjs` | `on \| off \| dry \| status` for global session |
| `scripts/prepare-assistant-echo.mjs` | Compact user-visible prior reply for `previous_assistant_message` |

## Skills

| Skill | Command |
|-------|---------|
| `dpm` | `/dpm`, `/dpm on`, `/dpm off`, `/dpm dry`, `/dpm status` |
| `dpm-help` | `/dpm-help` |

## Supported agents

Cursor, Claude Code, Codex, GitHub Copilot, Windsurf, and other agentskills.io-compatible hosts.
