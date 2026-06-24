#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const configDir = mkdtempSync(join(tmpdir(), "brain-claude-plugin-"));
const env = { ...process.env, CLAUDE_CONFIG_DIR: configDir };

function run(args) {
  const result = spawnSync("claude", args, {
    cwd: ROOT,
    env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout);
    process.stderr.write(result.stderr);
    throw new Error(`claude ${args.join(" ")} failed`);
  }
  return result.stdout;
}

try {
  run(["plugin", "validate", ".", "--strict"]);
  run(["plugin", "marketplace", "add", ROOT]);
  run(["plugin", "install", "brain-finance@brain-skills", "--scope", "user"]);
  const details = run(["plugin", "details", "brain-finance@brain-skills"]);
  if (!details.includes("brain-finance 0.1.0-beta.1")) {
    throw new Error("installed plugin details did not include the expected version");
  }
  if (!details.includes("Skills (11)")) throw new Error("installed plugin did not discover 11 skills");
  if (!details.includes("MCP servers (1)")) {
    throw new Error("installed plugin did not discover the Brain MCP server");
  }
  console.log("Claude plugin install smoke test passed.");
} finally {
  rmSync(configDir, { recursive: true, force: true });
}
