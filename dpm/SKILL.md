---
name: dpm
description: >
  Enable global DPM behavioral steering over MCP in Cursor Agent, Plan, and Ask mode,
  Claude Code, and Codex. Uses ~/.config/dpm/session.json for cross-chat persistence —
  when active, call score_turn before each user-facing reply with a stable per-machine
  visitor_ref from config.json. Compact previous_assistant_message (summary-first for
  coding hosts). Use when user says /dpm, /dpm on, enable dpm, dpm mode, or on every
  turn while session.json active until /dpm off. Off with /dpm off, stop dpm, or
  normal mode.
disable-model-invocation: false
---

# DPM session mode

DPM scores behavior; you write the reply. While **session.json** has `active: true`, call DPM before every user-facing answer in **any chat**.

## Global persistence (cross-chat)

DPM session state lives in **`~/.config/dpm/session.json`**, not chat history.

- **`/dpm on`** → run `node <skill-dir>/scripts/dpm-session.mjs on` — active in **all** chats until off
- **`/dpm off`** → run `dpm-session.mjs off` — disables globally
- **`/dpm status`** → run `dpm-session.mjs status`
- Survives **Agent ↔ Plan ↔ Ask** and **new composer tabs**

Skill directory examples: `~/.cursor/skills/dpm/scripts/`, `~/.claude/skills/dpm/scripts/`, `~/.agents/skills/dpm/scripts/`.

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
3. **Global rule** (Cursor only): copy `<skill-dir>/cursor-rules/dpm-global-session.mdc` → `~/.cursor/rules/`.
4. **Pre-prompt hooks** (recommended): `node <skill-dir>/scripts/install-dpm-hooks.mjs --all --from-mcp-json .cursor/mcp.json`

## Hook-installed steering (recommended)

When hooks are installed, DPM scores **before** the agent runs on each user message (while `session.json` is active):

| Host | Hook | Agent action |
|------|------|--------------|
| Cursor | `beforeSubmitPrompt` | **Read** `~/.config/dpm/steering/<generation_id>.json`; apply `guidance.system_prompt` |
| Claude Code | `UserPromptSubmit` | None — host injects steering via hook output |

Install once:

```bash
node <skill-dir>/scripts/install-dpm-hooks.mjs --all --from-mcp-json .cursor/mcp.json
```

Do **not** call MCP `score_turn` when hook cache already contains this turn. Use MCP only as fallback.

## Agent loop (mandatory while session active, no hook)

**FORBIDDEN:** User-facing reply, plan, or answer before steering is available.

1. **Read** `~/.config/dpm/session.json` — if not active, skip DPM.
2. **Try hook cache** (Cursor): Read `~/.config/dpm/steering/<generation_id>.json`.
3. **If no cache:** call **`score_turn`** with:
   - `visitor_ref` (required)
   - `message` = user's latest message (required)
   - `previous_assistant_message` = compacted echo when you have a prior reply (strongly recommended; omit turn 0)
   - `context_hint` from host mode (see table)
   - `agent_identity` from host table (recommended)
   - `dry_run: true` when session.json or `/dpm dry` says so
4. Read **`structuredContent`** — prefer `guidance.system_prompt`.
5. **Then** write the user-facing reply.

## Echo & compact `previous_assistant_message`

Pair scoring uses **assistant_{N-1} + user_N**. Never merge assistant text into `message`.

### Step 1 — Extract user-visible text

- **Include:** explanations, recommendations, plan bodies, code blocks shown to the user, file paths in prose.
- **Exclude:** tool-call JSON, raw diffs/patches, thinking blocks, one-line placeholders ("Done") unless that is all the user saw.
- **After tool-heavy turns:** echo the summary/explanation you showed the user, not raw tool output.
- **Plan mode:** on the turn after plan output, echo the plan body (compact if needed).

### Step 2 — Compact (coding hosts: ≤ 7,000 chars)

When the extracted echo exceeds **7,000 characters**:

1. **SUMMARY** (required for coding): 1–2 sentences — what was explained, decided, or changed.
2. **HEAD** (~3,200 chars): opening context.
3. **MARKER:** `[... middle omitted for DPM scoring; N chars total ...]`
4. **TAIL** (~3,200 chars): conclusions, final code snippet.

Tier-3 reads the **first 4,000 chars** of the assistant echo — **SUMMARY must lead** so conclusions reach pair classification.

Reference implementation: `node <skill-dir>/scripts/prepare-assistant-echo.mjs` (apply the same algorithm inline each turn).

## Agent host modes

| Host | Skill path | `context_hint` | `agent_identity` |
|------|------------|----------------|------------------|
| Cursor Agent | `~/.cursor/skills/dpm/` | `cursor agent mode` | `cursor-coding-agent` |
| Cursor Plan | same | `cursor plan mode` | `cursor-plan-agent` |
| Cursor Ask | same | `cursor ask mode` | `cursor-ask-agent` |
| Claude Code | `~/.claude/skills/dpm/` | `claude code agent mode` | `claude-code-agent` |
| Codex | `~/.agents/skills/dpm/` | `codex agent mode` | `codex-agent` |

## visitor_ref (per machine)

**Resolution order:**

1. Read `~/.config/dpm/config.json` → `visitor_ref` if set
2. If missing: run `node <skill-dir>/scripts/init-config.mjs`, re-read config
3. Use that ref for **all chats** on this machine — never rotate per turn

**Forbidden** (never use): `ghost_session_cursor`, `ghost_cursor`, `ghost_user`, `ghost_session`, `ghost_dev`

On `/dpm status`, report `visitor_ref` and source (`config.json` vs newly initialized).

## Two-key identity (`visitor_ref` + `conversation_id`)

| Key | Stored in | Scope |
|-----|-----------|-------|
| `visitor_ref` | `~/.config/dpm/config.json` | One per machine — shared across all chats |
| `conversation_id` | `~/.config/dpm/conversations.json` | One per composer tab (Cursor) or Claude session |

Hooks derive `conversation_id` automatically (`dpm-conversations-lib.mjs`). Parallel chats on the same machine share `visitor_ref` but get distinct `conversation_id` values so session overlay accumulates within each thread.

## Using structuredContent

Prefer `guidance.system_prompt`. Also use `intent_stage`, `receptivity`, `directives`, `concepts.surface` / `avoid`. The MCP `content` field is a digest only.

## Boundaries

- `/dpm-help`: help card only; do not toggle session
- Do not commit API keys or secrets
