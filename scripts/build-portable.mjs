#!/usr/bin/env node

/**
 * Build a provider-neutral distribution of the Brain finance skills under
 * dist/portable/. The Claude plugin format is one packaging target; this bundle
 * carries the same skill instructions in a form any MCP-capable agent runtime
 * (OpenAI Agents SDK, OpenAI Responses API hosted MCP tool, Google Gemini, and
 * others) can consume.
 *
 * Outputs:
 *   dist/portable/skills-manifest.json   machine-readable index of every skill
 *   dist/portable/<skill>/instructions.md  SKILL.md body, frontmatter stripped,
 *                                          with the manual MCP prerequisite
 *   dist/portable/<skill>/brain-mcp.md     the shared connection + auth contract
 *
 * The portable bundle defers authentication to the host exactly like the Claude
 * plugin: it embeds no token, tenant id, or secret. Endpoint and scopes are
 * discovered at runtime through Brain OAuth (see _shared/brain-mcp.md).
 *
 * Zero dependencies. Run: node scripts/build-portable.mjs
 */
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");
const DIST_ROOT = join(ROOT, "dist", "portable");
const MCP_ENDPOINT = "https://mcp.brain.fi";
const PREREQUISITE = [
  "> **Prerequisite:** Connect the Brain MCP server",
  `> (\`${MCP_ENDPOINT}\`) to your agent runtime before using this skill.`,
  "> Authentication is completed at runtime through Brain OAuth; no token is",
  "> embedded in this bundle.",
].join("\n");
const SECRET_PATTERN =
  /brain_sk_(?:live|test)_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

function stripFrontmatter(source, skillName) {
  const frontmatter = source.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatter === null) {
    throw new Error(`${skillName}: source SKILL.md has no frontmatter`);
  }
  const name = frontmatter[1].match(/^name:\s*(\S.*?)\s*$/m)?.[1];
  const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1];
  const body = source.slice(frontmatter[0].length).replace(/^\s+/, "");
  return { name, description, body };
}

rmSync(DIST_ROOT, { recursive: true, force: true });
mkdirSync(DIST_ROOT, { recursive: true });

const skillNames = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name)
  .sort();

const manifestSkills = [];

for (const skillName of skillNames) {
  const sourceRoot = join(SKILLS_ROOT, skillName);
  const meta = JSON.parse(readFileSync(join(sourceRoot, "brain-meta.json"), "utf8"));
  const sourceSkill = readFileSync(join(sourceRoot, "SKILL.md"), "utf8");
  const { name, description, body } = stripFrontmatter(sourceSkill, skillName);
  if (name === undefined || description === undefined) {
    throw new Error(`${skillName}: SKILL.md frontmatter is missing name or description`);
  }

  const stageRoot = join(DIST_ROOT, skillName);
  mkdirSync(stageRoot, { recursive: true });

  const instructions = `# ${name}\n\n${PREREQUISITE}\n\n${body}`;
  const instructionsPath = join(stageRoot, "instructions.md");
  writeFileSync(instructionsPath, instructions);
  copyFileSync(
    join(sourceRoot, "references", "brain-mcp.md"),
    join(stageRoot, "brain-mcp.md"),
  );

  if (!instructions.includes(PREREQUISITE)) {
    throw new Error(`${skillName}: portable instructions missing the MCP prerequisite`);
  }
  const reference = readFileSync(join(stageRoot, "brain-mcp.md"), "utf8");
  if (SECRET_PATTERN.test(`${instructions}\n${reference}`)) {
    throw new Error(`${skillName}: credential-shaped content found in portable bundle`);
  }

  const synced = meta.synced ?? {};
  manifestSkills.push({
    id: skillName,
    agent_key: meta.agent_key,
    name,
    description,
    risk_level: synced.risk_level,
    minimum_confidence: synced.minimum_confidence,
    default_authority: synced.default_authority,
    has_default_action: synced.has_default_action,
    propose_tool: meta.propose_tool,
    action_types: meta.action_types ?? [],
    readable_data: synced.readable_data ?? [],
    triggers: synced.triggers ?? [],
    intent_patterns: synced.intent_patterns ?? [],
    instructions: `./${skillName}/instructions.md`,
  });
}

const manifest = {
  schema_version: "1.0",
  product: "Brain Finance Agent Skills",
  description:
    "Provider-neutral index of policy-gated, propose-only Brain finance skills. " +
    "Any MCP-capable agent runtime can register the Brain MCP server and route to these skills.",
  mcp: {
    endpoint: MCP_ENDPOINT,
    transport: "http",
    auth: "oauth2",
    protected_resource_metadata: `${MCP_ENDPOINT}/.well-known/oauth-protected-resource`,
    note: "Authentication is resolved at runtime by the host. No credential is embedded.",
  },
  skills: manifestSkills,
};
writeFileSync(
  join(DIST_ROOT, "skills-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

if (skillNames.length !== 11) {
  throw new Error(`expected 11 skills, built ${skillNames.length}`);
}

console.log(`Built provider-neutral bundle for ${skillNames.length} skill(s) in dist/portable/.`);
