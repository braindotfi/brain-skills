#!/usr/bin/env node

const ENDPOINT = "https://mcp.brain.fi";
const ENABLE_VAR = "BRAIN_PHASE0_VERIFY";

if (process.env[ENABLE_VAR] !== "true") {
  console.log(
    `Phase 0 verification skipped (set ${ENABLE_VAR}=true to enable).`,
  );
  process.exit(0);
}

const requiredEnvironment = [
  "BRAIN_AGENT_TOKEN",
  "BRAIN_PHASE0_SOURCE_ACCOUNT_ID",
  "BRAIN_PHASE0_DESTINATION_COUNTERPARTY_ID",
  "BRAIN_PHASE0_AMOUNT",
  "BRAIN_PHASE0_CURRENCY",
];
const missing = requiredEnvironment.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error(
    `Phase 0 verification is enabled but missing: ${missing.join(", ")}`,
  );
  process.exit(1);
}

const token = process.env.BRAIN_AGENT_TOKEN;
const actionType = process.env.BRAIN_PHASE0_ACTION_TYPE ?? "ach_outbound";
let requestId = 0;

function parseResponse(contentType, text) {
  if (contentType.includes("text/event-stream")) {
    const data = text
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim())
      .filter((line) => line.length > 0 && line !== "[DONE]");
    if (data.length === 0)
      throw new Error("MCP response contained no SSE data event");
    return JSON.parse(data.at(-1));
  }
  return JSON.parse(text);
}

async function rpc(method, params = {}) {
  const id = ++requestId;
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json, text/event-stream",
      "mcp-protocol-version": "2025-06-18",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${method} failed with HTTP ${response.status}: ${text}`);
  }
  const body = parseResponse(response.headers.get("content-type") ?? "", text);
  if (body.jsonrpc !== "2.0" || body.id !== id) {
    throw new Error(`${method} returned an invalid JSON-RPC envelope`);
  }
  if (body.error !== undefined) {
    throw new Error(`${method} failed: ${JSON.stringify(body.error)}`);
  }
  return body.result;
}

const initialized = await rpc("initialize", {
  protocolVersion: "2025-06-18",
  capabilities: {},
  clientInfo: { name: "brain-finance-phase0-verifier", version: "0.1.0" },
});
if (initialized?.serverInfo === undefined) {
  throw new Error("initialize did not return serverInfo");
}

const listed = await rpc("tools/list");
const toolNames = (listed?.tools ?? []).map((tool) => tool.name);
for (const required of ["ledger.accounts.list", "payment_intent.propose"]) {
  if (!toolNames.includes(required))
    throw new Error(`tools/list is missing ${required}`);
}
const forbidden = toolNames.filter((name) =>
  /\.(execute|settle|sign)$/.test(name),
);
if (forbidden.length > 0) {
  throw new Error(
    `consequential MCP tools must not be exposed: ${forbidden.join(", ")}`,
  );
}

const accounts = await rpc("tools/call", {
  name: "ledger.accounts.list",
  arguments: { limit: 1 },
});
if (!Array.isArray(accounts?.content) || accounts.content.length === 0) {
  throw new Error("ledger.accounts.list returned no MCP content");
}

const proposal = await rpc("tools/call", {
  name: "payment_intent.propose",
  arguments: {
    action_type: actionType,
    source_account_id: process.env.BRAIN_PHASE0_SOURCE_ACCOUNT_ID,
    destination_counterparty_id:
      process.env.BRAIN_PHASE0_DESTINATION_COUNTERPARTY_ID,
    amount: process.env.BRAIN_PHASE0_AMOUNT,
    currency: process.env.BRAIN_PHASE0_CURRENCY,
  },
});
const intent = proposal?.structuredContent;
if (intent === undefined || typeof intent !== "object" || intent === null) {
  throw new Error(
    "payment_intent.propose returned no structured PaymentIntent",
  );
}
if (
  typeof intent.policy_decision_id !== "string" ||
  intent.policy_decision_id.length === 0
) {
  throw new Error("payment_intent.propose returned no policy decision");
}
if (!["pending_approval", "rejected"].includes(intent.status)) {
  throw new Error(
    `Phase 0 requires a confirm/reject sandbox policy; received unsafe status ${JSON.stringify(intent.status)}`,
  );
}

console.log(
  `Phase 0 verification passed against ${initialized.serverInfo.name}.`,
);
console.log(
  `Discovered ${toolNames.length} tools; no execute, settle, or sign tool is exposed.`,
);
console.log(
  `Read call passed; proposal stopped at ${intent.status} (${intent.id}).`,
);
