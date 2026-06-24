#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");
const canonical = readFileSync(join(ROOT, "_shared", "brain-mcp.md"));
const errors = [];

const skillNames = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name)
  .sort();

for (const skillName of skillNames) {
  const referencePath = join(SKILLS_ROOT, skillName, "references", "brain-mcp.md");
  let reference;
  try {
    reference = readFileSync(referencePath);
  } catch (error) {
    errors.push(`${skillName}: cannot read references/brain-mcp.md (${error.message})`);
    continue;
  }
  if (!reference.equals(canonical)) {
    errors.push(`${skillName}: references/brain-mcp.md differs from _shared/brain-mcp.md`);
  }
}

if (skillNames.length !== 11) {
  errors.push(`expected 11 skills, found ${skillNames.length}`);
}

if (errors.length > 0) {
  console.error(`Reference check FAILED (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Reference check passed for ${skillNames.length} skill(s).`);
