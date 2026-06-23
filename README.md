# Brain Skills

Portable agent skills for [Brain](https://brain.fi), the financial second brain.
Each skill is a `SKILL.md` recipe that teaches an agent how to drive Brain's MCP
server to a specific finance outcome: reconciliation, vendor risk, collections, and
more. Skills work across Claude Code, Codex CLI, and Cursor via the open SKILL.md
standard.

Brain analyzes and proposes. You decide. Your systems execute. These skills never
move money and never execute anything; they read your financial state within
tenant-signed policy and return proposals for you to approve.

## What is in here

```
brain-skills/
├── _shared/brain-mcp.md      canonical connection + auth + tool contract
├── spec/brain-agents.json    public-safe agent spec (generated from Brain)
├── scripts/check-drift.mjs   CI guard: skills must match the spec
├── STATUS.md                 build progress, all skills, in tier order
└── brain-<name>/             one directory per skill
    ├── SKILL.md
    ├── brain-meta.json       synced fields the drift check validates
    ├── references/brain-mcp.md
    └── evals/trigger.json
```

## Install (example)

```
/plugin marketplace add braindotfi/brain-skills
/plugin install brain-reconciliation@brain-skills
```

The skill activates automatically when your task matches its description. It will
ask the host for your Brain credentials at run time; it stores none.

## Authentication

Every skill connects to `POST /v1/agents/mcp` with your own Brain JWT, whose scope
is verified on chain. Skills contain no credentials. You provide them through your
agent host. See `_shared/brain-mcp.md`.

## The no-execute guarantee

There is no execute or settle path on Brain's MCP surface. Skills propose and stop.
Execution happens inside Brain, behind a deterministic pre-execution gate and human
approval where policy requires it. The two money-related skills (`brain-payment`,
`brain-treasury`) propose payment intents only; they never sign or settle.

## How these stay correct

The fields that define each skill (triggers, evidence, scopes, risk, authority) are
generated from Brain's private agent definitions into `spec/brain-agents.json`. CI
runs `scripts/check-drift.mjs` on every change; if a skill drifts from the spec, the
build fails. No skill logic lives in this repo, and this repo never imports Brain's
private code.

## Contributing

This repo holds recipes, not Brain's core. Open an issue before adding a skill; the
launch set and order are tracked in `STATUS.md`.
