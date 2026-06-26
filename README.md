# DPM Agent Skills

Agent-agnostic [Agent Skills](https://agentskills.io) for whole-chat DPM behavioral steering over MCP.

Install with the [skills CLI](https://skills.sh):

```bash
# Global (all detected agents on your machine)
npx skills add kevinjmagee/dpm-skills -g -y

# Project (commit into your repo)
npx skills add kevinjmagee/dpm-skills -y
```

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

## Source

Canonical skill sources live in the private [contextmind-dpm](https://github.com/kevinjmagee/contextmind-dpm) monorepo under `src/assets/dpm-skills/`. This repo is the public distribution mirror.

**Note:** This repo may transfer to `contextmind/dpm-skills` when the ContextMind GitHub organization is created.

## License

See repository license file.
