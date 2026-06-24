# Canonical Listing Copy

Status: draft only. Do not submit until Phase 0 has passed.

## Trust narrative

Brain Finance is a policy-gated set of 11 finance skills for reconciliation,
payments, treasury, cash forecasting, collections, fraud review, vendor risk,
subscriptions, disputes, revenue intelligence, and compliance.

Each skill gathers authorized evidence, proposes an action, returns Brain's
policy decision, and stops. The plugin is non-custodial: it never holds funds,
signs transactions, settles payments, or exposes an execute tool.

Authentication is completed at runtime through Brain OAuth. No access token,
tenant credential, or secret is packaged in a skill. Every MCP call remains
subject to tenant scopes, policy, approvals, and audit controls.

## Short description

Eleven policy-gated finance skills for Claude and MCP. Reconcile accounts,
review risk, forecast cash, and prepare payment or treasury proposals without
signing or moving funds.

## Standard links

- Repository: <https://github.com/braindotfi/brain-skills>
- Documentation: <https://docs.brain.fi/build/use-brain-agent-skills>
- MCP endpoint: `https://mcp.brain.fi`
- License: MIT
- Version: `0.1.0-beta.1`

## Submission gate

Do not submit this copy until the human Phase 0 runbook proves installation,
OAuth consent, an authorized read, and a confirm/reject proposal from both
supported hosts.
