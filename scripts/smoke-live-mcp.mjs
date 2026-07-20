#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.BRAIN_MCP_LIVE_TEST !== "true") {
  console.log("Live MCP smoke test skipped (set BRAIN_MCP_LIVE_TEST=true to enable).");
  process.exit(0);
}

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const plugin = JSON.parse(readFileSync(join(ROOT, ".claude-plugin", "plugin.json"), "utf8"));
const token = process.env.BRAIN_AGENT_TOKEN;
if (token === undefined || token.length === 0) {
  console.error("BRAIN_AGENT_TOKEN is required when BRAIN_MCP_LIVE_TEST=true.");
  process.exit(1);
}

const response = await fetch("https://mcp.brain.fi", {
  method: "POST",
  headers: {
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    accept: "application/json, text/event-stream",
    "mcp-protocol-version": "2025-06-18",
  },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "brain-finance-plugin-smoke", version: plugin.version },
    },
  }),
});

const text = await response.text();
if (!response.ok) {
  console.error(`Brain MCP initialize failed: HTTP ${response.status}`);
  console.error(text);
  process.exit(1);
}

// Streamable HTTP transports may answer a single JSON-RPC request as either a
// plain JSON body or a text/event-stream frame. Parse both, matching the
// handling in verify-phase0.mjs.
function parseResponse(contentType, raw) {
  if (contentType.includes("text/event-stream")) {
    const events = raw
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line.length > 0 && line !== "[DONE]");
    if (events.length === 0) throw new Error("MCP response contained no SSE data event");
    return JSON.parse(events.at(-1));
  }
  return JSON.parse(raw);
}

const body = parseResponse(response.headers.get("content-type") ?? "", text);
if (body.jsonrpc !== "2.0" || body.result?.serverInfo === undefined) {
  console.error("Brain MCP initialize returned an invalid response.");
  console.error(JSON.stringify(body));
  process.exit(1);
}

console.log(`Live MCP smoke test passed (${body.result.serverInfo.name}).`);
