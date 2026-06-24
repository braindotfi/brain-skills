# Anthropic Plugin Directory Draft

Status: draft only. Submit through Anthropic's plugin directory form after
Phase 0. Do not open a marketplace pull request.

## Plugin

- Name: `brain-finance`
- Publisher: Brain Finance, Inc.
- Category: Productivity / Finance
- Version: `0.1.0-beta.1`
- Repository: <https://github.com/braindotfi/brain-skills>
- Documentation: <https://docs.brain.fi/build/use-brain-agent-skills>
- License: MIT

## Description

Eleven policy-gated finance skills for Claude and MCP. Reconcile accounts,
review risk, forecast cash, and prepare payment or treasury proposals without
signing or moving funds.

## Trust and security

Brain Finance is a policy-gated set of 11 finance skills for reconciliation,
payments, treasury, cash forecasting, collections, fraud review, vendor risk,
subscriptions, disputes, revenue intelligence, and compliance.

Each skill gathers authorized evidence, proposes an action, returns Brain's
policy decision, and stops. The plugin is non-custodial: it never holds funds,
signs transactions, settles payments, or exposes an execute tool.

Authentication is completed at runtime through Brain OAuth. No access token,
tenant credential, or secret is packaged in a skill. Every MCP call remains
subject to tenant scopes, policy, approvals, and audit controls.

## Quality self-check

- [ ] Phase 0 passed on Claude Code and Agensi.
- [x] All 11 skills contain valid frontmatter and trigger evals.
- [x] The plugin and marketplace manifests pass strict Claude validation.
- [x] An isolated install discovers 11 skills and one MCP server.
- [x] Skill metadata passes drift validation against Brain's generated spec.
- [x] Installation, authentication, safety boundaries, and beta status are
      documented.
- [x] The source repository is public and MIT licensed.
- [x] Versioning is synchronized across plugin, marketplace, and package
      metadata.

## Security self-check

- [x] Prompt injection: external financial text is evidence, not instruction.
- [x] Data exfiltration: runtime HTTP calls target only `mcp.brain.fi`.
- [x] Secret detection: credentials are runtime-only and scans reject
      credential-shaped content.
- [x] Dangerous commands: no skill runs shell commands or financial execution.
- [x] Obfuscation: source is readable Markdown, JSON, and JavaScript.
- [x] External fetches: the sole runtime fetch target is Brain's MCP endpoint.
- [x] Credential access: no keychain, browser storage, or credential files are
      accessed.
- [x] Privilege escalation: no elevated permissions or host modifications are
      requested.

Full evidence: `docs/security-review.md` after the security-review PR lands.

## Reviewer note

The package includes `.mcp.json` so one plugin install configures the Brain MCP
server. The service is still a beta release gate; approve directory submission
only after the Phase 0 evidence packet confirms live OAuth and authorized calls.
