---
name: dpm
description: >
  Enable whole-chat DPM behavioral steering over MCP. Calls score_turn before each
  user-facing reply with a stable visitor_ref and applies structuredContent to steer
  depth, tone, and topics. Use when user says /dpm, /dpm on, enable dpm, dpm mode,
  steer with dpm, or use dpm this chat. Off with /dpm off, stop dpm, or normal mode.
---

# DPM session mode

DPM scores behavior; you write the reply. While this mode is **active**, call DPM before every user-facing answer.

## Persistence

**ACTIVE for every user-facing reply** until the user says `/dpm off`, `stop dpm`, or `normal mode` (no dpm).

Do not drift off after tool-heavy turns. If unsure whether mode is on, assume **on** until explicitly turned off.

Modes: `/dpm` or `/dpm on` (production scoring), `/dpm dry` (sandbox, dry_run: true), `/dpm off`, `/dpm status`.

## Prerequisites

1. A DPM MCP server must be **connected** in the host (Cursor, Claude Code, Codex, Copilot, etc.).
2. The connected server must expose **`score_turn`** (and usually `consult_space`).
3. If missing: user copies **mcpServers** JSON from DPM Customer Portal → Space Config → MCP connection.

Do not hardcode MCP server slugs. Use whichever connected server provides `score_turn`.

## Agent loop (mandatory while active)

Before composing **any reply the user will read**:

1. **Resolve `visitor_ref`** (see below) — same value all session unless user changes config.
2. **Call `score_turn`** on the DPM MCP server with:
   - `visitor_ref` (required)
   - `message` = user's latest message (required)
   - `previous_assistant_message` = your prior assistant reply in this chat when you have one (strongly recommended)
   - `context_hint` from config if set (optional)
   - `agent_identity` from config or `"coding-agent"` (optional)
   - `dry_run: true` only when user invoked `/dpm dry` or config says so
3. Read **`structuredContent`** from the tool result — **not** the short human `content` summary.
4. **Steer** your reply:
   - **First:** inject `structuredContent.guidance.system_prompt` when present
   - **Else:** use bands and directives below
   - `intent_stage`, `receptivity`, `sophistication`, `cohort` (note `cohort.hedge`)
   - `directives.recommended_depth`, `directives.preferred_format`, imperative flags
   - `concepts.surface`, `avoid`, `deepen`, `scaffold`, `next`, `labels`
5. **Then** write the user-facing reply.

Default tool is **`score_turn`**. Use **`consult_space`** only for lightweight query-only steering without a full turn pair.

## visitor_ref

Required on every MCP call. Identifies the **end user** within this space.

- Use one **stable** ref for this chat/session (never rotate per turn).
- Prefix conventions: `ghost_*` (anonymous), `cookie_*` (pseudonymous), or your own id.
- Examples: `ghost_session_1`, `cookie_user_42`

**Resolution order:**

1. If `/dpm dry` → still use same visitor_ref; set `dry_run: true` on calls.
2. If `~/.config/dpm/config.json` exists and has `visitor_ref`, use it.
3. Else use `ghost_<short_stable_id>` derived once at session start and **reuse**.

Profiles do **not** carry across different MCP space connections.

## When to skip score_turn

Skip only when the turn has **no user-facing prose** — e.g. pure internal tool runs the user did not ask to be explained, or silent file edits with no summary requested.

Any direct answer, explanation, or recommendation to the user **requires** scoring first while mode is active.

## Using structuredContent

| Field | Use |
|-------|-----|
| `guidance.system_prompt` | **Prefer this** — paste-ready steering block |
| `intent_stage` | Match funnel — exploratory vs ready to decide |
| `receptivity` | Back off when resistant; be direct when receptive |
| `sophistication` | Adjust technical depth |
| `cohort` | Segment-aware framing (check `hedge` / confidence) |
| `directives` | Depth, format, escalation, resistance, confusion flags |
| `concepts.surface` | Topics to emphasize |
| `concepts.avoid` | Topics to skip or defer |
| `concepts.deepen` | Skip basics — user knows these |
| `concepts.scaffold` | Explain foundations |
| `concepts.next` | Suggested follow-ons |
| `concepts.labels` | Human-readable names for concept ids |

**When signals conflict:** resistant receptivity → shorter reply; do not increase depth. `escalate_to_human` → offer handoff. `cohort.hedge` → soften segment claims.

DPM does **not** generate the reply text.

## Status command

When user says `/dpm status`, report:

- Active or off
- Current `visitor_ref`
- `dry_run` on/off
- Which DPM MCP server you are using (if known)

## Boundaries

- `/dpm off` or `stop dpm`: stop calling MCP before replies; answer normally.
- `/dpm-help`: display help only; do not toggle mode.
- Do not commit API keys or paste secrets into skill files.
