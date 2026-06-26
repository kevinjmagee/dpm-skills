# DPM Agent Skills

Agent-agnostic [Agent Skills](https://agentskills.io) for whole-chat DPM behavioral steering over MCP.

Install with the [skills CLI](https://skills.sh):

```bash
# Global (Cursor, Claude Code, Codex)
npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex

# Project (commit into your repo)
npx skills add kevinjmagee/dpm-skills -y -a cursor -a claude-code -a codex
```

Append `-a <agent>` for other hosts (e.g. `-a windsurf`). Targeting agents avoids errors from hosts that do not support global skill installs.

## Skills

| Skill | Command | Purpose |
|-------|---------|---------|
| `dpm` | `/dpm`, `/dpm on`, `/dpm off`, `/dpm dry`, `/dpm status` | Enable whole-chat `score_turn` before each reply |
| `dpm-help` | `/dpm-help` | One-shot command reference |

## Prerequisites

1. Connect a DPM MCP server (Customer Portal → Space Config → MCP connection).
2. Install these skills (commands above).
3. In chat, type `/dpm` to enable steering.

## Optional config

Copy `dpm-config.example.json` to `~/.config/dpm/config.json` and set `visitor_ref`.

## Supported agents

Works with Cursor, Claude Code, Codex, GitHub Copilot, Windsurf, and other agentskills.io-compatible hosts. The `skills` CLI installs to the correct directory per agent.
