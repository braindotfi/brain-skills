# Claude Community Directory Draft

Status: draft only. As of 2026-06-24,
[`anthropics/claude-plugins-community`](https://github.com/anthropics/claude-plugins-community)
is a read-only mirror. Direct pull requests are closed automatically. Submit
through Anthropic's plugin directory form after Phase 0 instead.

## Marketplace entry

This is the plugin entry currently validated in
`.claude-plugin/marketplace.json`:

```json
{
  "name": "brain-finance",
  "version": "0.1.0-beta.1",
  "description": "Eleven finance skills plus the official Brain MCP connection.",
  "author": {
    "name": "Brain Finance, Inc.",
    "url": "https://brain.fi"
  },
  "source": ".",
  "category": "productivity",
  "homepage": "https://docs.brain.fi/build/use-brain-agent-skills"
}
```

## Directory description

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

## Legacy PR body draft

Retained because the original launch work order requested a PR body. Do not open
this PR while the community repository remains read-only; reuse the content in
the directory submission form.

### Title

```text
Add the Brain Finance policy-gated finance plugin
```

### Body

```markdown
## Plugin

- Name: `brain-finance`
- Source: `https://github.com/braindotfi/brain-skills`
- Version: `0.1.0-beta.1`
- Category: productivity

## What it adds

One install adds 11 finance skills and the official Brain MCP connection for
reconciliation, payments, treasury, cash forecasting, collections, fraud
review, vendor risk, subscriptions, disputes, revenue intelligence, and
compliance.

## Trust boundary

The skills are policy-gated and proposal-only. They never hold funds, sign
transactions, settle payments, or expose an execute tool. Authentication occurs
at runtime through Brain OAuth; no credentials are packaged.

## Verification

- strict Claude plugin validation passes
- isolated installation discovers 11 skills and one MCP server
- generated-spec drift validation passes
- eight-point static security review passes
- Phase 0 OAuth/read/proposal evidence attached to the directory submission
```
