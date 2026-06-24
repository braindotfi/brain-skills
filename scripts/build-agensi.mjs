#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_ROOT = join(ROOT, "skills");
const DIST_ROOT = join(ROOT, "dist", "agensi");
const PREREQUISITE = [
  "> **Prerequisite:** Connect the Brain MCP server",
  "> (`https://mcp.brain.fi`) before using this skill.",
].join("\n");
const ZIP_EPOCH = new Date("1980-01-01T00:00:00Z");
const EXPECTED_ENTRIES = [
  "SKILL.md",
  "references/brain-mcp.md",
  "evals/trigger.json",
];
const SECRET_PATTERN =
  /brain_sk_(?:live|test)_[A-Za-z0-9]+|Bearer\s+[A-Za-z0-9._-]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----/;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    ...options,
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    throw new Error(`${command} ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function injectPrerequisite(source, skillName) {
  const frontmatter = source.match(/^---\n[\s\S]*?\n---\n/);
  if (frontmatter === null) {
    throw new Error(`${skillName}: source SKILL.md has no frontmatter`);
  }
  return `${frontmatter[0]}\n${PREREQUISITE}\n\n${source.slice(frontmatter[0].length)}`;
}

function validateEval(skillName, evalText) {
  const evaluation = JSON.parse(evalText);
  if (evaluation.skill_name !== skillName) {
    throw new Error(`${skillName}: eval skill_name does not match package`);
  }
  for (const field of ["should_trigger", "should_not_trigger"]) {
    if (
      !Array.isArray(evaluation[field]) ||
      evaluation[field].length === 0 ||
      evaluation[field].some((prompt) => typeof prompt !== "string" || prompt.length === 0)
    ) {
      throw new Error(`${skillName}: ${field} must contain non-empty prompts`);
    }
  }
}

rmSync(DIST_ROOT, { recursive: true, force: true });
mkdirSync(DIST_ROOT, { recursive: true });

const tempRoot = mkdtempSync(join(tmpdir(), "brain-agensi-"));
const skillNames = readdirSync(SKILLS_ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && entry.name.startsWith("brain-"))
  .map((entry) => entry.name)
  .sort();

try {
  for (const skillName of skillNames) {
    const sourceRoot = join(SKILLS_ROOT, skillName);
    const stageRoot = join(tempRoot, skillName);
    const stageReferenceDir = join(stageRoot, "references");
    const stageEvalsDir = join(stageRoot, "evals");
    mkdirSync(stageReferenceDir, { recursive: true });
    mkdirSync(stageEvalsDir, { recursive: true });

    const sourceSkill = readFileSync(join(sourceRoot, "SKILL.md"), "utf8");
    const builtSkill = injectPrerequisite(sourceSkill, skillName);
    const builtSkillPath = join(stageRoot, "SKILL.md");
    const referencePath = join(stageReferenceDir, "brain-mcp.md");
    const evalPath = join(stageEvalsDir, "trigger.json");

    writeFileSync(builtSkillPath, builtSkill);
    copyFileSync(join(sourceRoot, "references", "brain-mcp.md"), referencePath);
    copyFileSync(join(sourceRoot, "evals", "trigger.json"), evalPath);

    for (const path of [builtSkillPath, referencePath, evalPath]) {
      utimesSync(path, ZIP_EPOCH, ZIP_EPOCH);
    }

    validateEval(skillName, readFileSync(evalPath, "utf8"));
    if (!builtSkill.includes(PREREQUISITE)) {
      throw new Error(`${skillName}: built SKILL.md is missing the MCP prerequisite`);
    }

    const zipPath = join(DIST_ROOT, `${skillName}.zip`);
    run("zip", ["-X", "-q", zipPath, ...EXPECTED_ENTRIES], { cwd: stageRoot });

    const entries = run("unzip", ["-Z1", zipPath])
      .trim()
      .split("\n")
      .filter(Boolean)
      .sort();
    if (JSON.stringify(entries) !== JSON.stringify([...EXPECTED_ENTRIES].sort())) {
      throw new Error(`${skillName}: unexpected zip entries: ${entries.join(", ")}`);
    }

    const archivedSkill = run("unzip", ["-p", zipPath, "SKILL.md"]);
    const archivedReference = run("unzip", ["-p", zipPath, "references/brain-mcp.md"]);
    const archivedEval = run("unzip", ["-p", zipPath, "evals/trigger.json"]);
    validateEval(skillName, archivedEval);

    if (!archivedSkill.includes(PREREQUISITE)) {
      throw new Error(`${skillName}: archived SKILL.md is missing the MCP prerequisite`);
    }
    if (SECRET_PATTERN.test([archivedSkill, archivedReference, archivedEval].join("\n"))) {
      throw new Error(`${skillName}: credential-shaped content found in archive`);
    }
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

if (skillNames.length !== 11) {
  throw new Error(`expected 11 skills, built ${skillNames.length}`);
}

console.log(`Built and validated ${skillNames.length} Agensi skill archives.`);
