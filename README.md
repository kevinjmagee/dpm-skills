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
node ~/.agents/skills/dpm/scripts/install-dpm-hooks.mjs --all --from-mcp-json ~/.cursor/mcp.json

# 4. Global cross-chat session rule (Cursor only, once)
# ~/.agents/skills/dpm/cursor-rules/dpm-global-session.mdc → ~/.cursor/rules/
```

Then connect DPM MCP (Portal → MCP connection → mcpServers JSON) and type **`/dpm on`** in any chat.

Skill paths may also be `~/.cursor/skills/dpm/` or `~/.claude/skills/dpm/` depending on host.

## One-shot agent install prompt

Instead of running the steps by hand, paste a single prompt into your agent (Cursor / Claude Code / Codex in **Agent mode**) and let it do the whole install. The Portal **MCP connection** panel generates a filled-in version for your space — with the exact `mcpServers` block and endpoint — in two variants: **Global base** (writes `~/.cursor/mcp.json`) and **Project override** (writes a gitignored per-repo `.cursor/mcp.json`).

If you don't have the Portal open, use this template — replace the `mcpServers` block with the one from Portal → **MCP connection**, and swap in a real API key:

```text
You are configuring this machine to use the DPM MCP server as my global baseline.

Do the following in order, asking me only if a step truly cannot proceed:

1. Add (or update) an MCP server entry for this host:
   - Cursor: ~/.cursor/mcp.json (global — loads in every window and every profile, and keeps the API key out of any repo).
   - Claude Desktop: claude_desktop_config.json
   - Claude Code / Codex: their respective MCP config files
   Use this entry exactly:

   {
     "mcpServers": {
       "dpm-<your-space>": {
         "url": "https://<your-dpm-edge-host>/v1/spaces/YOUR-SPACE-UUID/mcp",
         "headers": { "Authorization": "Bearer dpm_YOUR_API_KEY" }
       }
     }
   }

2. Install the DPM agent skills globally so /dpm works across chats:
   npx skills add kevinjmagee/dpm-skills -g -y -a cursor -a claude-code -a codex

3. Initialize a stable visitor_ref for this machine (after step 2):
   node ~/.agents/skills/dpm/scripts/init-config.mjs
   Confirm ~/.config/dpm/config.json exists and contains a visitor_ref.

4. For Cursor users, copy ~/.agents/skills/dpm/cursor-rules/dpm-global-session.mdc to ~/.cursor/rules/dpm-global-session.mdc so /dpm steering applies across all chats.

5. Install pre-prompt hooks for reliable Cursor + Claude Code steering:
   node ~/.agents/skills/dpm/scripts/install-dpm-hooks.mjs --all --from-mcp-json ~/.cursor/mcp.json

6. Reload MCP servers in the host, enable /dpm on, then verify a turn appears in the Portal turn log.

If the Authorization bearer token above is dpm_YOUR_API_KEY, stop and ask me to paste a real API key from the DPM portal before continuing.
```

For a **per-repo override**, run the same prompt inside the target repo but write a gitignored `.cursor/mcp.json` (reusing your global server name so it overrides), and change step 5 to `--from-mcp-json .cursor/mcp.json`. The Portal's **Project override** variant produces this for you.

## Global base + project override

Cursor merges two MCP config files: global `~/.cursor/mcp.json` (active in every window and every profile — it is **not** per-profile) and per-repo `.cursor/mcp.json`. Use the global file as your baseline space.

To point one repo at a different space, add a project `.cursor/mcp.json` that reuses the **same server name** so it overrides the global entry for that workspace (a **different** name loads both). Keep project files gitignored — they hold your API key — and re-run the hooks import against the project file so whole-chat `/dpm` follows the repo's space:

```bash
node ~/.agents/skills/dpm/scripts/install-dpm-hooks.mjs --all --from-mcp-json .cursor/mcp.json
```

The Portal **MCP connection** panel generates both a **Global base** and a **Project override** setup prompt.

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
