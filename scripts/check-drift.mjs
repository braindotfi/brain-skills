#!/usr/bin/env node
/**
 * Drift check: validates each skills/brain-<name>/brain-meta.json against
 * spec/brain-agents.json.
 *
 * - Definition-derived fields (category, risk_level, default_authority,
 *   has_default_action, triggers, intent_patterns, readable_data,
 *   required_evidence, minimum_confidence, capabilities) MUST deep-equal the spec.
 *   The spec is generated from brain-core, so a mismatch means a published skill
 *   has drifted from the live agent definition.
 * - Skill-authored routing fields (propose_tool, action_types) are validated
 *   against the MCP tool enums and the money-mover rule, not against the spec.
 *
 * Zero dependencies. Run: node scripts/check-drift.mjs
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");
const spec = JSON.parse(readFileSync(join(ROOT, "spec", "brain-agents.json"), "utf8"));
const mcpToolSpec = JSON.parse(
  readFileSync(join(ROOT, "spec", "brain-mcp-tools.json"), "utf8"),
);
const SPEC_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MCP_DOC_START = "<!-- BEGIN GENERATED MCP TOOL ARGUMENTS -->";
const MCP_DOC_END = "<!-- END GENERATED MCP TOOL ARGUMENTS -->";

const AGENT_ACTION_TYPES = new Set([
  "reconciliation_match", "anomaly_flag", "categorize_transaction",
  "merge_counterparty", "link_document", "other",
]);
const PAYMENT_ACTION_TYPES = new Set([
  "ach_outbound", "ach_inbound", "wire", "onchain_transfer",
  "erp_writeback", "card_payment", "x402_settle", "escrow_release",
]);
const MONEY_MOVERS = new Set(["payment", "treasury"]);
const SYNCED = [
  "category", "risk_level", "default_authority", "has_default_action",
  "capabilities", "minimum_confidence", "triggers", "intent_patterns",
  "readable_data", "required_evidence",
];

const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function typeName(schema) {
  if (schema.type === "array") {
    return `array<${typeName(schema.items ?? { type: "unknown" })}>`;
  }
  return schema.type ?? "unknown";
}

function notesFor(schema) {
  const notes = [];
  if (Array.isArray(schema.enum)) notes.push(`enum: ${schema.enum.join(", ")}`);
  if (typeof schema.pattern === "string") notes.push(`pattern: ${schema.pattern}`);
  if (typeof schema.format === "string") notes.push(`format: ${schema.format}`);
  if (typeof schema.minimum === "number") notes.push(`minimum: ${schema.minimum}`);
  if (typeof schema.maximum === "number") notes.push(`maximum: ${schema.maximum}`);
  if (typeof schema.minLength === "number") notes.push(`minLength: ${schema.minLength}`);
  if (typeof schema.maxLength === "number") notes.push(`maxLength: ${schema.maxLength}`);
  if (schema.default !== undefined) notes.push(`default: ${schema.default}`);
  if (schema.additionalProperties === true) notes.push("additional properties allowed");
  if (typeof schema.description === "string") notes.push(schema.description);
  return notes.length === 0 ? "-" : notes.join("; ");
}

function tableCell(value) {
  return String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
}

function renderMcpToolTables(tools) {
  const lines = [MCP_DOC_START];
  for (const tool of tools) {
    const required = new Set(tool.input_schema.required ?? []);
    lines.push("");
    lines.push(`### \`${tool.name}\` (scope \`${tool.scope}\`)`);
    lines.push("");
    lines.push(tool.description);
    lines.push("");
    lines.push("| Arg | Type | Required | Notes |");
    lines.push("| --- | --- | --- | --- |");
    for (const [arg, schema] of Object.entries(tool.input_schema.properties ?? {})) {
      lines.push(
        `| \`${arg}\` | ${tableCell(typeName(schema))} | ${required.has(arg) ? "yes" : "no"} | ${tableCell(notesFor(schema))} |`,
      );
    }
  }
  lines.push("");
  lines.push(MCP_DOC_END);
  return lines.join("\n");
}

function checkMcpToolDocs(errors) {
  const docPath = join(ROOT, "_shared", "brain-mcp.md");
  const doc = readFileSync(docPath, "utf8");
  const start = doc.indexOf(MCP_DOC_START);
  const end = doc.indexOf(MCP_DOC_END);
  if (start === -1 || end === -1 || end < start) {
    errors.push("_shared/brain-mcp.md: missing generated MCP tool argument block");
    return;
  }
  const actual = doc.slice(start, end + MCP_DOC_END.length);
  const expected = renderMcpToolTables(mcpToolSpec.tools);
  if (actual !== expected) {
    errors.push(
      "_shared/brain-mcp.md: MCP tool argument tables drift from spec/brain-mcp-tools.json",
    );
  }
}

const errors = [];
const generatedAtMs = Date.parse(spec.generated_at);
if (!Number.isFinite(generatedAtMs)) {
  errors.push(`spec: generated_at is missing or invalid (${JSON.stringify(spec.generated_at)})`);
} else if (Date.now() - generatedAtMs > SPEC_MAX_AGE_MS) {
  errors.push(
    `spec: generated_at ${spec.generated_at} is older than 30 days; regenerate from brain-core`,
  );
}
const skillDirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name.startsWith("brain-"))
  .map((d) => d.name);

if (skillDirs.length === 0) {
  console.error("No brain-* skill directories found.");
  process.exit(1);
}

for (const dir of skillDirs) {
  const metaPath = join(SKILLS_ROOT, dir, "brain-meta.json");
  if (!existsSync(metaPath)) {
    errors.push(`${dir}: missing brain-meta.json`);
    continue;
  }
  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch (e) {
    errors.push(`${dir}: brain-meta.json is not valid JSON (${e.message})`);
    continue;
  }

  const key = meta.agent_key;
  const ref = spec.agents[key];
  if (!ref) {
    errors.push(`${dir}: agent_key "${key}" not in spec (off-launch-set or renamed?)`);
    continue;
  }

  // 1. Definition-derived fields must match the spec exactly.
  for (const field of SYNCED) {
    if (!eq(meta.synced?.[field], ref[field])) {
      errors.push(
        `${dir}: drift on "${field}"\n    skill: ${JSON.stringify(meta.synced?.[field])}\n    spec:  ${JSON.stringify(ref[field])}`,
      );
    }
  }

  // 2. Routing: propose_tool + action_types are skill-authored, checked by rule.
  const tool = meta.propose_tool;
  if (MONEY_MOVERS.has(key)) {
    if (tool !== "payment_intent.propose") {
      errors.push(`${dir}: money-mover must use payment_intent.propose, got "${tool}"`);
    }
  } else if (tool !== "agent.action.propose") {
    errors.push(`${dir}: non-money skill must use agent.action.propose, got "${tool}"`);
  }

  const allowed = tool === "payment_intent.propose" ? PAYMENT_ACTION_TYPES : AGENT_ACTION_TYPES;
  for (const at of meta.action_types ?? []) {
    if (!allowed.has(at)) {
      errors.push(`${dir}: action_type "${at}" not valid for ${tool}`);
    }
  }

  // 3. Money-mover no-auto guarantee: payment and treasury must never carry a
  //    default action, so no financial action can fire without an explicit/event
  //    match. This is the one no-auto invariant that is universal in the source.
  //    It is deliberately NOT generalized to all high-risk agents: fraud_anomaly is
  //    high-risk but notify_only, and its default action "notify" executes nothing,
  //    so the source legitimately allows it. The presence/absence of a default
  //    action for every other agent is already validated as a synced field above.
  if (MONEY_MOVERS.has(key) && ref.has_default_action !== false) {
    errors.push(`${dir}: money-mover "${key}" must have has_default_action=false (got true)`);
  }
}

checkMcpToolDocs(errors);

if (errors.length > 0) {
  console.error(`Drift check FAILED (${errors.length}):\n`);
  for (const e of errors) console.error("  - " + e);
  process.exit(1);
}
console.log(`Drift check passed for ${skillDirs.length} skill(s).`);
