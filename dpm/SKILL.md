---
name: dpm
description: >
  Enable whole-chat DPM behavioral steering over MCP in Cursor Agent, Plan, and Ask
  mode. Calls score_turn before each user-facing reply with a stable visitor_ref and
  applies structuredContent to steer depth, tone, and topics. Use when user says /dpm,
  /dpm on, enable dpm, dpm mode, steer with dpm, or use dpm this chat. Also use on
  every subsequent user message in the same chat while DPM session mode remains active
  until /dpm off. In Cursor Plan mode, apply before CreatePlan output and plan
  revisions. In Ask mode, apply before every answer. Off with /dpm off, stop dpm, or
  normal mode.
disable-model-invocation: false
---

# DPM session mode

DPM scores behavior; you write the reply. While this mode is **active**, call DPM before every user-facing answer.

## Persistence

**ACTIVE for every user-facing reply** until the user says `/dpm off`, `stop dpm`, or `normal mode` (no dpm).

Do not drift off after tool-heavy turns. If unsure whether mode is on, assume **on** until explicitly turned off.

`/dpm on` survives **Agent ↔ Plan ↔ Ask** switches in the **same chat**. New chat → run `/dpm on` again.

Modes: `/dpm` or `/dpm on` (production scoring), `/dpm dry` (sandbox, dry_run: true), `/dpm off`, `/dpm status`.

## Session state (Cursor)

After `/dpm on`, treat DPM session mode as **ACTIVE** for this chat until `/dpm off`.
Carry state across turns and Agent ↔ Plan ↔ Ask switches. If `/dpm on` appeared in
chat history and user has not said `/dpm off`, assume **on**.

While ACTIVE, your **first tool call** on each turn with user-facing output must be
`score_turn` (skip only pure internal tool runs with no prose for the user).

## Prerequisites

1. A DPM MCP server must be **connected** in the host (Cursor, Claude Code, Codex, Copilot, etc.).
2. The connected server must expose **`score_turn`** (and usually `consult_space`).
3. If missing: user copies **mcpServers** JSON from DPM Customer Portal → Space Config → MCP connection.

Do not hardcode MCP server slugs. Use whichever connected server provides `score_turn`.

## Agent loop (mandatory while active)

**FORBIDDEN:** Drafting any user-facing reply, plan, or answer before `score_turn` returns.

Before composing **any reply the user will read**:

1. **Resolve `visitor_ref`** (see below) — same value all session unless user changes config.
2. **Call `score_turn`** on the DPM MCP server with:
   - `visitor_ref` (required)
   - `message` = user's latest message (required)
   - `previous_assistant_message` = your prior assistant reply in this chat when you have one (strongly recommended)
   - `context_hint` — set from Cursor mode when applicable (see below)
   - `agent_identity` from config or host-specific id (optional)
   - `dry_run: true` only when user invoked `/dpm dry` or config says so
3. Read **`structuredContent`** from the tool result — **not** the `content` digest alone.
4. **Steer** your reply:
   - **First:** inject `structuredContent.guidance.system_prompt` when present
   - **Else:** use bands and directives below
5. **Then** write the user-facing reply.

Default tool is **`score_turn`**. Use **`consult_space`** only for lightweight query-only steering without a full turn pair.

## Cursor host modes

| Mode | Call score_turn before… | context_hint | agent_identity (suggested) |
|------|-------------------------|--------------|----------------------------|
| Agent | Every user-facing reply | `cursor agent mode` | `cursor-coding-agent` |
| Plan | CreatePlan output, plan revisions, direct answers | `cursor plan mode` | `cursor-plan-agent` |
| Ask | Every explanation or answer | `cursor ask mode` | `cursor-ask-agent` |

Skip `score_turn` only for pure internal tool runs with no user-facing prose. Ask/Plan read-only modes **still call MCP** — score_turn does not edit files.

## visitor_ref

Required on every MCP call. Identifies the **end user** within this space.

- Use one **stable** ref for this chat/session (never rotate per turn).
- Prefix conventions: `ghost_*` (anonymous), `cookie_*` (pseudonymous), or your own id.

**Resolution order:**

1. If `/dpm dry` → still use same visitor_ref; set `dry_run: true` on calls.
2. If `~/.config/dpm/config.json` exists and has `visitor_ref`, use it.
3. Else use `ghost_<short_stable_id>` derived once at session start and **reuse**.

## When to skip score_turn

Skip only when the turn has **no user-facing prose** — e.g. pure internal tool runs the user did not ask to be explained.

Any direct answer, explanation, plan, or recommendation to the user **requires** scoring first while mode is active.

## Using structuredContent

| Field | Use |
|-------|-----|
| `guidance.system_prompt` | **Prefer this** — paste-ready steering block |
| `intent_stage` | Match funnel — exploratory vs ready to decide |
| `receptivity` | Back off when resistant; be direct when receptive |
| `directives` | Depth, format, escalation, resistance, confusion flags |
| `concepts.surface` / `avoid` | Topics to emphasize or skip |

The **`content`** field is a digest + reminder only — **never sufficient for steering**.

## Status command

When user says `/dpm status`, report: active or off, current `visitor_ref`, `dry_run` on/off, which DPM MCP server you are using.

## Boundaries

- `/dpm off` or `stop dpm`: stop calling MCP before replies; answer normally.
- `/dpm-help`: display help only; do not toggle mode.
- Do not commit API keys or paste secrets into skill files.
