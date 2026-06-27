---
name: dpm
description: >
  Enable global DPM behavioral steering over MCP in Cursor Agent, Plan, and Ask mode.
  Uses ~/.config/dpm/session.json for cross-chat persistence — when active, call
  score_turn before each user-facing reply with a stable per-machine visitor_ref from
  config.json. Use when user says /dpm, /dpm on, enable dpm, dpm mode, or on every
  turn while session.json active until /dpm off. Off with /dpm off, stop dpm, or
  normal mode.
disable-model-invocation: false
---

# DPM session mode

DPM scores behavior; you write the reply. While **session.json** has `active: true`, call DPM before every user-facing answer in **any chat**.

## Global persistence (cross-chat)

DPM session state lives in **`~/.config/dpm/session.json`**, not chat history.

- **`/dpm on`** → run `node <skill-dir>/scripts/dpm-session.mjs on` — active in **all** Cursor chats until off
- **`/dpm off`** → run `dpm-session.mjs off` — disables globally
- **`/dpm status`** → run `dpm-session.mjs status`
- Survives **Agent ↔ Plan ↔ Ask** and **new composer tabs**

Skill directory examples: `~/.cursor/skills/dpm/scripts/` or `~/.agents/skills/dpm/scripts/`.

**Every turn while active:** Read `session.json` first. If `active === true`, proceed with the agent loop below.

## Slash commands

| Command | Script |
|---------|--------|
| `/dpm`, `/dpm on` | `dpm-session.mjs on` |
| `/dpm dry` | `dpm-session.mjs dry` |
| `/dpm off`, `stop dpm` | `dpm-session.mjs off` |
| `/dpm status` | `dpm-session.mjs status` |

After `on`, confirm: "DPM active globally until /dpm off" and show `visitor_ref`.

## Prerequisites

1. DPM MCP server **connected** (Portal → MCP connection → mcpServers JSON).
2. **`init-config.mjs`** run once for per-machine `visitor_ref`.
3. **Global rule** installed: copy `cursor-rules/dpm-global-session.mdc` → `~/.cursor/rules/` (Cursor).

## Agent loop (mandatory while session active)

**FORBIDDEN:** User-facing reply, plan, or answer before `score_turn` returns.

1. **Read** `~/.config/dpm/session.json` — if not active, skip DPM.
2. **Resolve `visitor_ref`** (see below).
3. **Call `score_turn`** with:
   - `visitor_ref` (required)
   - `message` = user's latest message (required)
   - `previous_assistant_message` when available (strongly recommended)
   - `context_hint` from Cursor mode (see table)
   - `dry_run: true` when session.json or `/dpm dry` says so
4. Read **`structuredContent`** — prefer `guidance.system_prompt`.
5. **Then** write the user-facing reply.

## visitor_ref (per machine)

**Resolution order:**

1. Read `~/.config/dpm/config.json` → `visitor_ref` if set
2. If missing: run `node <skill-dir>/scripts/init-config.mjs`, re-read config
3. Use that ref for **all chats** on this machine — never rotate per turn

**Forbidden** (never use): `ghost_session_cursor`, `ghost_cursor`, `ghost_user`, `ghost_session`, `ghost_dev`

On `/dpm status`, report `visitor_ref` and source (`config.json` vs newly initialized).

## Cursor host modes

| Mode | Call score_turn before… | context_hint |
|------|-------------------------|--------------|
| Agent | Every user-facing reply | `cursor agent mode` |
| Plan | CreatePlan output, revisions, direct answers | `cursor plan mode` |
| Ask | Every explanation or answer | `cursor ask mode` |

## Using structuredContent

Prefer `guidance.system_prompt`. Also use `intent_stage`, `receptivity`, `directives`, `concepts.surface` / `avoid`. The MCP `content` field is a digest only.

## Boundaries

- `/dpm-help`: help card only; do not toggle session
- Do not commit API keys or secrets
