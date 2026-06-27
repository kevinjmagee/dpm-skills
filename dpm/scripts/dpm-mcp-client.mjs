import { existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { getConfigDir } from "./dpm-config-lib.mjs";

/** @returns {Promise<{ Client: typeof import('@modelcontextprotocol/sdk/client/index.js').Client, StreamableHTTPClientTransport: typeof import('@modelcontextprotocol/sdk/client/streamableHttp.js').StreamableHTTPClientTransport } | null>} */
async function loadMcpSdk() {
  const searchPaths = [
    process.env.DPM_MCP_SDK_ROOT?.trim(),
    join(getConfigDir(), "hook-deps", "node_modules", "@modelcontextprotocol", "sdk"),
    join(process.cwd(), "node_modules", "@modelcontextprotocol", "sdk"),
  ].filter(Boolean);

  for (const base of searchPaths) {
    const clientPath = join(base, "dist", "esm", "client", "index.js");
    const transportPath = join(base, "dist", "esm", "client", "streamableHttp.js");
    if (!existsSync(clientPath) || !existsSync(transportPath)) continue;
    try {
      const clientMod = await import(pathToFileURL(clientPath).href);
      const transportMod = await import(pathToFileURL(transportPath).href);
      return {
        Client: clientMod.Client,
        StreamableHTTPClientTransport: transportMod.StreamableHTTPClientTransport,
      };
    } catch {
      continue;
    }
  }

  try {
    const clientMod = await import("@modelcontextprotocol/sdk/client/index.js");
    const transportMod = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    return {
      Client: clientMod.Client,
      StreamableHTTPClientTransport: transportMod.StreamableHTTPClientTransport,
    };
  } catch {
    return null;
  }
}

/**
 * @param {{ url: string, apiKey: string, arguments: Record<string, unknown> }} params
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function mcpScoreTurn(params) {
  const sdk = await loadMcpSdk();
  if (!sdk) {
    throw new Error(
      "MCP SDK not found. Run: node <skill-dir>/scripts/install-dpm-hooks.mjs --all",
    );
  }

  const { Client, StreamableHTTPClientTransport } = sdk;
  const transport = new StreamableHTTPClientTransport(new URL(params.url), {
    requestInit: {
      headers: {
        Authorization: `Bearer ${params.apiKey}`,
      },
    },
  });
  const client = new Client({ name: "dpm-hook", version: "1.0.0" });
  try {
    await client.connect(transport);
    const result = await client.callTool({
      name: "score_turn",
      arguments: params.arguments,
    });
    const structured = result.structuredContent;
    if (structured && typeof structured === "object") {
      return structured;
    }
    return null;
  } finally {
    await client.close();
  }
}

/** @param {Record<string, unknown> | null | undefined} structured */
export function guidanceSystemPrompt(structured) {
  if (!structured || typeof structured !== "object") return "";
  const guidance = structured.guidance;
  if (guidance && typeof guidance === "object" && typeof guidance.system_prompt === "string") {
    return guidance.system_prompt.trim();
  }
  return "";
}
