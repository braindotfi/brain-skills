# Agensi Listing Draft

Status: draft only. Do not create an Agensi account or submit a listing until
Phase 0 has passed.

## Listing metadata

- Publisher: Brain Finance, Inc.
- Product: Brain Finance Agent Skills
- Listing tier: Free
- Category: Finance / Accounting Automation
- Format: one standalone skill archive per workflow
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

## Package files

Build the 11 archives on demand with `npm run build:agensi`, then publish them
from `dist/agensi/`. Generated archives are intentionally gitignored and are not
stored in the repository:

- `brain-reconciliation.zip`
- `brain-subscription.zip`
- `brain-vendor-risk.zip`
- `brain-collections.zip`
- `brain-fraud-anomaly.zip`
- `brain-cash-forecast.zip`
- `brain-dispute.zip`
- `brain-payment.zip`
- `brain-treasury.zip`
- `brain-revenue-intel.zip`
- `brain-compliance.zip`

Each archive contains `SKILL.md`, `references/brain-mcp.md`, and trigger evals.

## Required manual MCP note

Agensi installs the skill files but does not carry the Claude plugin's root
`.mcp.json`. Before using any Brain skill, the user must connect this remote MCP
server:

```text
https://mcp.brain.fi
```

The generated Agensi `SKILL.md` repeats this prerequisite near the top. The host
must then complete Brain OAuth at runtime. Never place a token in the archive or
listing configuration.

## Listing checks

- [ ] Phase 0 passed on the Agensi host.
- [ ] All 11 archives were rebuilt from the reviewed commit.
- [ ] Every archive shows the manual MCP prerequisite.
- [ ] Every archive passes trigger-fixture and secret scans.
- [ ] The listing links to the public source and security review.
- [ ] No account was created and no listing was submitted during draft prep.
