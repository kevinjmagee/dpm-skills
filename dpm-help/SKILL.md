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
| `/dpm` or `/dpm on` | Global ON — `dpm-session.mjs on`; score_turn in **all chats** until off |
| `/dpm dry` | Global ON with `dry_run: true` |
| `/dpm off` | Global OFF — `dpm-session.mjs off` |
| `/dpm status` | Show session.json state, visitor_ref, dry_run |

Also off: `stop dpm`, `normal mode` (no dpm).

## One-time setup

1. Install skills: `npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex`
2. Initialize visitor ref: `node ~/.cursor/skills/dpm/scripts/init-config.mjs`
3. **Cursor only:** copy `cursor-rules/dpm-global-session.mdc` → `~/.cursor/rules/`
4. Connect MCP from Portal → type `/dpm on` once

## State files

| File | Purpose |
|------|---------|
| `~/.config/dpm/config.json` | Stable per-machine `visitor_ref` |
| `~/.config/dpm/session.json` | Global active / dry_run |

## Agent loop (when session active)

```
Read session.json → if active:
  echo = compact prior user-visible reply (summary-first + head+tail if coding and >7k)
  result = score_turn({ visitor_ref, message, previous_assistant_message: echo, context_hint })
  reply = steered by structuredContent
```

Public repo: https://github.com/kevinjmagee/dpm-skills
