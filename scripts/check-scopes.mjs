#!/usr/bin/env node
/**
 * Scope check: validates that every declared readable_data scope is served by
 * at least one MCP tool in spec/brain-mcp-tools.json, except documented
 * residuals that are pending brain-core surface work.
 *
 * Zero dependencies. Run: node scripts/check-scopes.mjs
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");

const toolSpec = JSON.parse(
  readFileSync(join(ROOT, "spec", "brain-mcp-tools.json"), "utf8"),
);

const servedScopes = new Set(
  (toolSpec.tools ?? [])
    .map((tool) => tool.scope)
    .filter((scope) => typeof scope === "string" && scope.length > 0),
);

// Known residuals: no public MCP read tool exposes this scope yet. Pending
// brain-core surface work.
const KNOWN_UNBACKED = new Map([
  ["policy:read", new Set(["compliance"])],
  ["audit:read", new Set(["compliance"])],
]);

const errors = [];
const warnings = [];
const skillMetas = new Map();

const skillDirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name)
  .sort();

for (const dir of skillDirs) {
  const metaPath = join(SKILLS_ROOT, dir, "brain-meta.json");
  if (!existsSync(metaPath)) {
    errors.push(`${dir}: missing brain-meta.json`);
    continue;
  }

  let meta;
  try {
    meta = JSON.parse(readFileSync(metaPath, "utf8"));
  } catch (error) {
    errors.push(`${dir}: brain-meta.json is not valid JSON (${error.message})`);
    continue;
  }

  const agentKey = meta.agent_key;
  if (typeof agentKey !== "string" || agentKey.length === 0) {
    errors.push(`${dir}: agent_key is required`);
    continue;
  }

  const readableData = meta.synced?.readable_data;
  if (!Array.isArray(readableData)) {
    errors.push(`${dir}: synced.readable_data must be an array`);
    continue;
  }

  skillMetas.set(agentKey, { dir, readableData });

  for (const scope of readableData) {
    if (servedScopes.has(scope)) continue;

    const allowlistedSkills = KNOWN_UNBACKED.get(scope);
    if (allowlistedSkills?.has(agentKey)) {
      warnings.push(
        `${dir}: readable_data scope "${scope}" is not served by a public MCP read tool yet; pending brain-core surface work`,
      );
      continue;
    }

    errors.push(
      `${dir}: readable_data scope "${scope}" is not served by any MCP tool and is not in KNOWN_UNBACKED`,
    );
  }
}

for (const [scope, allowlistedSkills] of KNOWN_UNBACKED.entries()) {
  if (servedScopes.has(scope)) {
    errors.push(
      `KNOWN_UNBACKED "${scope}" is redundant because spec/brain-mcp-tools.json now serves it`,
    );
  }

  for (const agentKey of allowlistedSkills) {
    const meta = skillMetas.get(agentKey);
    if (meta === undefined) {
      errors.push(`KNOWN_UNBACKED "${scope}" references missing agent "${agentKey}"`);
      continue;
    }
    if (!meta.readableData.includes(scope)) {
      errors.push(
        `KNOWN_UNBACKED "${scope}" references ${meta.dir}, but that skill no longer declares it`,
      );
    }
  }
}

for (const warning of warnings) console.warn(`Warning: ${warning}`);

if (errors.length > 0) {
  console.error(`Scope check FAILED (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `Scope check passed for ${skillDirs.length} skill(s); ${warnings.length} allowlisted residual(s).`,
);
