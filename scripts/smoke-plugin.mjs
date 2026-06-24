#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");
const EXPECTED_SKILLS = new Set([
  "brain-reconciliation",
  "brain-subscription",
  "brain-vendor-risk",
  "brain-collections",
  "brain-fraud-anomaly",
  "brain-cash-forecast",
  "brain-dispute",
  "brain-payment",
  "brain-treasury",
  "brain-revenue-intel",
  "brain-compliance",
]);

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const plugin = readJson(join(ROOT, ".claude-plugin", "plugin.json"));
const marketplace = readJson(join(ROOT, ".claude-plugin", "marketplace.json"));
const packageJson = readJson(join(ROOT, "package.json"));
const mcp = readJson(join(ROOT, ".mcp.json"));
const sharedReference = readFileSync(join(ROOT, "_shared", "brain-mcp.md"));

const errors = [];
const legacySkillDirs = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name);
const skillDirs = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name)
  .sort();

if (skillDirs.length !== EXPECTED_SKILLS.size) {
  errors.push(`expected ${EXPECTED_SKILLS.size} skills, found ${skillDirs.length}`);
}
if (legacySkillDirs.length > 0) {
  errors.push(`legacy root skill directories remain: ${legacySkillDirs.join(", ")}`);
}
for (const expected of EXPECTED_SKILLS) {
  if (!skillDirs.includes(expected)) errors.push(`missing skill directory: ${expected}`);
}
for (const actual of skillDirs) {
  if (!EXPECTED_SKILLS.has(actual)) errors.push(`unexpected skill directory: ${actual}`);

  const required = [
    "SKILL.md",
    "brain-meta.json",
    join("evals", "trigger.json"),
    join("references", "brain-mcp.md"),
  ];
  for (const relative of required) {
    if (!existsSync(join(SKILLS_ROOT, actual, relative))) {
      errors.push(`${actual}: missing ${relative}`);
    }
  }

  const skillText = readFileSync(join(SKILLS_ROOT, actual, "SKILL.md"), "utf8");
  const frontmatter = skillText.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatter === null) {
    errors.push(`${actual}: missing YAML frontmatter`);
  } else {
    if (!/^name:\s+\S+/m.test(frontmatter[1])) errors.push(`${actual}: missing frontmatter name`);
    if (!/^description:\s+.+/m.test(frontmatter[1])) {
      errors.push(`${actual}: missing frontmatter description`);
    }
  }

  try {
    readJson(join(SKILLS_ROOT, actual, "brain-meta.json"));
    readJson(join(SKILLS_ROOT, actual, "evals", "trigger.json"));
  } catch (error) {
    errors.push(`${actual}: invalid JSON (${error.message})`);
  }

  const reference = readFileSync(join(SKILLS_ROOT, actual, "references", "brain-mcp.md"));
  if (!reference.equals(sharedReference)) {
    errors.push(`${actual}: references/brain-mcp.md differs from _shared/brain-mcp.md`);
  }
}

const marketplacePlugin = marketplace.plugins?.find((entry) => entry.name === "brain-finance");
if (plugin.name !== "brain-finance") errors.push("plugin name must be brain-finance");
if (marketplacePlugin === undefined) errors.push("marketplace is missing brain-finance");
if (plugin.version !== marketplacePlugin?.version || plugin.version !== packageJson.version) {
  errors.push("plugin, marketplace, and package versions must match");
}
if (marketplacePlugin?.source !== ".") errors.push('marketplace source must be "."');
if (plugin.skills?.[0] !== "./skills/") errors.push("plugin skills path must be ./skills/");
if (plugin.mcpServers !== "./.mcp.json") errors.push("plugin MCP path must be ./.mcp.json");
if (mcp.mcpServers?.brain?.type !== "http") errors.push("Brain MCP transport must be http");
if (mcp.mcpServers?.brain?.url !== "https://mcp.brain.fi") {
  errors.push("Brain MCP URL must be https://mcp.brain.fi");
}

const trackedText = [
  readFileSync(join(ROOT, ".mcp.json"), "utf8"),
  ...skillDirs.map((skill) => readFileSync(join(SKILLS_ROOT, skill, "SKILL.md"), "utf8")),
].join("\n");
if (/brain_sk_(?:live|test)_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._-]{20,}/.test(trackedText)) {
  errors.push("credential-shaped value found in plugin content");
}

if (errors.length > 0) {
  console.error(`Plugin smoke check FAILED (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Plugin smoke check passed for ${skillDirs.length} skills (${plugin.version}).`);
