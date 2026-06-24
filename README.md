# Brain Finance Plugin

One distributable plugin containing 11 portable agent skills for
[Brain](https://brain.fi), the financial second brain. Each `SKILL.md` recipe
teaches an agent how to drive Brain's MCP server to a specific finance outcome:
reconciliation, vendor risk, collections, payments, treasury, and more.

Brain analyzes and proposes. You decide. Your systems execute. These skills never
move money and never execute anything; they read your financial state within
tenant-signed policy and return proposals for you to approve.

## What is in here

```text
brain-skills/
├── .claude-plugin/
│   ├── plugin.json           brain-finance plugin manifest
│   └── marketplace.json      brain-skills marketplace catalog
├── .mcp.json                 remote Brain MCP connection
├── _shared/brain-mcp.md      canonical connection + auth + tool contract
├── spec/brain-agents.json    public-safe agent spec generated from Brain
├── scripts/                  drift, packaging, install, and live smoke checks
├── STATUS.md                 build progress for all skills
└── skills/brain-<name>/      one directory per skill
    ├── SKILL.md
    ├── brain-meta.json
    ├── references/brain-mcp.md
    └── evals/trigger.json
```

## Install

```text
/plugin marketplace add braindotfi/brain-skills
/plugin install brain-finance@brain-skills
```

One install adds all 11 skills and the `brain` MCP server configuration. Each
skill activates automatically when the task matches its description.

This release is `0.1.0-beta.1`. Packaging and offline installation are complete;
the live MCP connection remains unavailable until `https://mcp.brain.fi` is
deployed.

## Authentication

The plugin connects to `https://mcp.brain.fi`. Brain resolves authentication at
runtime and verifies the agent's scope on chain. Skills contain no credentials.
See `_shared/brain-mcp.md`.

## The no-execute guarantee

There is no execute or settle path on Brain's MCP surface. Skills propose and
stop. Execution happens inside Brain, behind a deterministic pre-execution gate
and human approval where policy requires it. The two money-related skills
(`brain-payment`, `brain-treasury`) propose payment intents only; they never sign
or settle.

## How these stay correct

The fields that define each skill are generated from Brain's private agent
definitions into `spec/brain-agents.json`. CI validates the Claude plugin,
performs an isolated marketplace installation, verifies all 11 skill packages,
and runs `scripts/check-drift.mjs`.

The live MCP smoke test is present but gated until the server is deployed.

## Development

```bash
npm test
```

Enable the live connection check only after the endpoint is deployed:

```bash
BRAIN_MCP_LIVE_TEST=true BRAIN_AGENT_TOKEN=... npm run test:live
```

## Contributing

This repo holds recipes and distribution metadata, not Brain's core. The launch
set and status are tracked in `STATUS.md`.
