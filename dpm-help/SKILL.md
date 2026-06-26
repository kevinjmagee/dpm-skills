---
name: dpm-help
description: >
  One-shot reference for DPM session mode slash commands and install steps.
  Trigger: /dpm-help, dpm help, what dpm commands, how do I use /dpm.
  Does NOT enable DPM mode or call MCP.
---

# DPM Help

Display this card when invoked. **One-shot** — do NOT enable DPM mode, write flag files, or call MCP unless the user separately asks.

## Commands

| Command | Effect |
|---------|--------|
| `/dpm` or `/dpm on` | Enable whole-chat steering — score_turn before each user-facing reply |
| `/dpm dry` | Same, but `dry_run: true` (sandbox; excluded from learning) |
| `/dpm off` | Disable — stop calling DPM before replies |
| `/dpm status` | Show active/off, visitor_ref, dry_run, MCP server, Cursor mode hint |

Also off: `stop dpm`, `normal mode` (no dpm).

**Cursor:** `/dpm on` works in Agent, Plan, and Ask mode (same chat). Use `context_hint`: `cursor agent mode`, `cursor plan mode`, or `cursor ask mode`.

## Prerequisites

1. **MCP connected** — Portal → Space Config → MCP connection → copy mcpServers JSON into your agent host.
2. **Skills installed** — run `npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex` or download the skills ZIP from the same portal panel.

## Optional config

File: `~/.config/dpm/config.json`

```json
{
  "visitor_ref": "ghost_YOUR_ID",
  "context_hint": "your surface",
  "dry_run": false,
  "agent_identity": "coding-agent"
}
```

## Agent loop (when /dpm is on)

```
for each user message you will answer:
  result = score_turn({ visitor_ref, message, previous_assistant_message, ... })
  reply = your LLM(steered by result.structuredContent, user message)
```

Use **`structuredContent`**, not the short text summary in `content`.

## Install paths

| Scope | macOS / Linux | Windows |
|-------|---------------|---------|
| Global (cross-tool) | `~/.agents/skills/dpm/` | `%USERPROFILE%\.agents\skills\dpm\` |
| Cursor global | `~/.cursor/skills/dpm/` | `%USERPROFILE%\.cursor\skills\dpm\` |
| Project (team) | `.agents/skills/dpm/` in repo | same |

Each folder needs a `SKILL.md` file. Also install `dpm-help/` alongside `dpm/`.

Public repo: https://github.com/kevinjmagee/dpm-skills
