#!/usr/bin/env node

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");
const MONEY_MOVERS = new Set(["brain-payment", "brain-treasury"]);
const FORBIDDEN_TOOL = /\b[A-Za-z0-9_-]+\.(?:execute|settle|sign)\b/g;
const DESCRIPTION_LIMIT = 500; // Marketplace descriptions must be one line and <500 characters.
const errors = [];

const skillNames = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name)
  .sort();

for (const skillName of skillNames) {
  const skillPath = join(SKILLS_ROOT, skillName, "SKILL.md");
  const skillText = readFileSync(skillPath, "utf8");
  const frontmatter = skillText.match(/^---\n([\s\S]*?)\n---\n/);
  if (frontmatter === null) {
    errors.push(`${skillName}: missing YAML frontmatter`);
    continue;
  }

  const name = frontmatter[1].match(/^name:\s*(\S.*?)\s*$/m)?.[1];
  const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1];
  if (name === undefined || name.length === 0) {
    errors.push(`${skillName}: frontmatter name is required`);
  }
  if (description === undefined || description.length === 0) {
    errors.push(
      `${skillName}: frontmatter description is required and must be one line`,
    );
  } else if (description.length >= DESCRIPTION_LIMIT) {
    errors.push(
      `${skillName}: frontmatter description is ${description.length} characters; maximum is 499`,
    );
  }

  if (MONEY_MOVERS.has(skillName)) {
    const metaText = readFileSync(
      join(SKILLS_ROOT, skillName, "brain-meta.json"),
      "utf8",
    );
    const forbidden = [
      ...`${skillText}\n${metaText}`.matchAll(FORBIDDEN_TOOL),
    ].map((match) => match[0]);
    if (forbidden.length > 0) {
      errors.push(
        `${skillName}: money-mover references forbidden consequential tool(s): ${[...new Set(forbidden)].join(", ")}`,
      );
    }
  }
}

if (skillNames.length !== 11) {
  errors.push(`expected 11 skills, found ${skillNames.length}`);
}

if (errors.length > 0) {
  console.error(`Invariant check FAILED (${errors.length}):`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(`Invariant check passed for ${skillNames.length} skill(s).`);
