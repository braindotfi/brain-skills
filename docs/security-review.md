# Security Review

Static review of the `brain-finance` plugin against Agensi's eight-point
checklist. The review covers every `skills/*/SKILL.md`, `brain-meta.json`,
`references/brain-mcp.md`, root `.mcp.json`, and JavaScript file under `scripts/`.

Review date: 2026-06-24

## 1. Prompt injection

**Finding: PASS**

The skills constrain the agent to authenticated Brain evidence and named MCP
tools. They do not instruct the host to obey content found in transactions,
documents, vendor messages, or tool output. Unverified external text is treated
as data, not instructions.

Evidence:

- `skills/brain-payment/SKILL.md:35-39` rejects free-text routing details and
  requires a verified destination.
- `skills/brain-vendor-risk/SKILL.md:34-39` forbids inventing a raw-read tool and
  rejects vendor names or email requests as destination verification.
- `skills/brain-fraud-anomaly/SKILL.md:34-40` limits raw evidence to authenticated
  Brain context and forbids a fraud conclusion from merchant text alone.
- `_shared/brain-mcp.md:38-39` limits each call to the scopes declared by the
  selected skill.

## 2. Data exfiltration

**Finding: PASS**

Skills read only declared Brain scopes and send proposals only to Brain's MCP
surface. No skill directs data to a third party, arbitrary URL, webhook, shell,
or local file.

Evidence:

- `.mcp.json:2-6` defines one MCP server, `brain`, at
  `https://mcp.brain.fi`.
- `_shared/brain-mcp.md:59-67` enumerates the scope-gated read tools.
- `_shared/brain-mcp.md:68-72` lists the proposal and write-capable tools.
  Writes are limited to `agent.action.propose`, `payment_intent.propose`,
  `payment_intent.cancel`, and `raw.contribute`; `payment_intent.list` is
  read-only.
- `scripts/smoke-plugin.mjs:94-99` rejects a package whose MCP path, transport,
  or URL differs from the expected Brain configuration.

## 3. Secret detection

**Finding: PASS**

No token, key, password, tenant identifier, or credential-shaped value is
embedded in the reviewed files. Authentication is supplied at runtime.

Evidence:

- `_shared/brain-mcp.md:18-24` requires runtime credentials and explicitly
  forbids credentials in a skill.
- `scripts/smoke-live-mcp.mjs:14-17` reads `BRAIN_AGENT_TOKEN` from the
  environment and fails closed when the enabled test has no token.
- `scripts/smoke-plugin.mjs:101-106` rejects Brain key- and bearer-shaped values
  in packaged plugin content.

The static scan included common key prefixes, bearer tokens, passwords, private
keys, high-entropy credential assignments, and credential-bearing URLs. It
found only documentation placeholders and environment-variable names.

## 4. Dangerous commands

**Finding: PASS**

No skill contains shell commands. The package scripts do not run a shell,
download executables, mutate user financial data, or invoke execute/settle
operations.

Evidence:

- `scripts/smoke-install.mjs:13-18` invokes the local `claude` executable
  directly with an argument array rather than through a shell.
- `scripts/smoke-install.mjs:27-37` limits those invocations to plugin validate,
  local marketplace add, install, and details commands.
- `scripts/check-drift.mjs:16-22` performs local filesystem reads only.
- `_shared/brain-mcp.md:77-83` states that no execute or settle tool exists and
  forbids instructions to move funds, settle, or sign.

## 5. Obfuscation

**Finding: PASS**

The reviewed skills, metadata, references, MCP configuration, and scripts are
plain-text Markdown, JSON, and JavaScript. There are no encoded payloads,
minified scripts, dynamic code generation, `eval`, or concealed command
strings.

Evidence:

- `scripts/check-drift.mjs:24-37` declares the allowed tools, action types, and
  synchronized fields directly.
- `scripts/smoke-plugin.mjs:9-21` declares the complete 11-skill launch set
  directly.
- `.mcp.json:1-8` is a readable, single-server configuration.

## 6. External fetches

**Finding: PASS**

The only runtime HTTP fetch target in the package is
`https://mcp.brain.fi`. Other URLs in manifests and Markdown are metadata,
schema, documentation, or repository links; no code fetches them.

Evidence:

- `scripts/smoke-live-mcp.mjs:20-37` contains the package's only `fetch` call,
  an MCP `initialize` request to `https://mcp.brain.fi`.
- `.mcp.json:2-6` configures the same endpoint.
- `scripts/smoke-plugin.mjs:96-99` enforces the endpoint and HTTP transport.

## 7. Credential access

**Finding: PASS**

The plugin does not inspect keychains, browser storage, dotfiles, cloud
credential directories, or host configuration. The live smoke test accesses
only its documented environment variable.

Evidence:

- `scripts/smoke-live-mcp.mjs:7-17` requires an explicit opt-in flag and reads
  only `BRAIN_AGENT_TOKEN`.
- `scripts/smoke-live-mcp.mjs:22-26` sends that token only as the authorization
  header to Brain's MCP endpoint.
- `skills/brain-payment/SKILL.md:13-15` and the equivalent block in every skill
  defer authentication to the runtime contract rather than accessing
  credentials themselves.

## 8. Privilege escalation

**Finding: PASS**

No reviewed file requests elevated privileges, changes permissions, installs a
system service, modifies shell startup files, or attempts to escape the host's
permission model. Brain independently enforces tenant and scope authorization.

Evidence:

- `_shared/brain-mcp.md:20-24` binds authorization to the runtime JWT, tenant,
  granted scopes, and on-chain `scope_hash` on Base Sepolia testnet. Mainnet
  deployment and external contract audit are pending.
- `_shared/brain-mcp.md:53-55` states that scope checks occur for every call.
- `scripts/smoke-install.mjs:9-11` isolates validation in a temporary
  `CLAUDE_CONFIG_DIR`.
- `scripts/smoke-install.mjs:40-42` removes that temporary directory after the
  test.

## Financial and high-risk boundaries

The two money-moving skills are proposal-only:

- `skills/brain-payment/brain-meta.json:2-9` selects
  `payment_intent.propose` and has no default action;
  `skills/brain-payment/SKILL.md:75-80` stops before signing or fund movement.
- `skills/brain-treasury/brain-meta.json:2-9` selects
  `payment_intent.propose` and has no default action;
  `skills/brain-treasury/SKILL.md:76-81` stops before signing or fund movement.

The high-risk boundaries are agent-specific:

- Vendor Risk has a confirm/reject ceiling
  (`skills/brain-vendor-risk/SKILL.md:77-83`).
- Fraud and Anomaly defaults only to non-consequential notification;
  `freeze_card` requires an explicit request and is never trigger-selected
  (`skills/brain-fraud-anomaly/SKILL.md:79-86`).
- Compliance is notify-only with a confirm/reject ceiling
  (`skills/brain-compliance/SKILL.md:81-86`).

## Reviewer-facing summary

Brain Finance skills are policy-gated and propose-only. The plugin is
non-custodial: it never holds funds, signs transactions, settles payments, or
executes financial actions. Authentication is resolved at runtime, no secrets
are packaged, and every call remains subject to Brain's tenant scopes, policy,
and audit controls.
