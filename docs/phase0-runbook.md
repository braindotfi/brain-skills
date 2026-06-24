# Phase 0 Verification Runbook

Phase 0 is a human-run launch gate. It proves that two independent hosts can
install a Brain skill, complete OAuth consent, make an authorized read call, and
create a policy-gated proposal without executing anything.

Do not use production accounts, counterparties, money, or credentials. Use a
dedicated sandbox tenant whose payment policy always returns `confirm` or
`reject`. An `allow`/`approved` result fails this runbook.

## Preconditions

- [ ] `https://mcp.brain.fi` is deployed and reachable over HTTPS.
- [ ] A dedicated sandbox Brain tenant exists.
- [ ] The sandbox tenant has one test source account and one test counterparty.
- [ ] The sandbox policy cannot auto-execute the proposed test payment.
- [ ] The OAuth client requests `ledger:read` and `payment_intent:propose` only.
- [ ] The tester can inspect Brain's PaymentIntent and audit records.

## Host 1: Claude Code plugin

1. In Claude Code, add the public marketplace:

   ```text
   /plugin marketplace add braindotfi/brain-skills
   ```

2. Install the complete plugin:

   ```text
   /plugin install brain-finance@brain-skills
   ```

3. Open Claude Code's MCP view and select the `brain` server.
4. Start authentication, sign in to the sandbox Brain tenant, review the
   requested scopes, and approve OAuth consent.
5. Ask Claude to list Brain ledger accounts.
6. Ask Claude to prepare, but not execute, a small sandbox payment proposal
   using the test source account and counterparty.

Acceptance:

- [ ] The plugin installs all 11 skills.
- [ ] The `brain` MCP server points to `https://mcp.brain.fi`.
- [ ] OAuth consent names the sandbox tenant and expected scopes.
- [ ] `ledger.accounts.list` returns the sandbox account.
- [ ] `payment_intent.propose` returns a PaymentIntent and policy decision.
- [ ] The PaymentIntent status is `pending_approval` or `rejected`.
- [ ] No execute, settle, or sign tool is available.
- [ ] No balance or settlement record changes.
- [ ] Brain records the read and proposal audit events.

## Host 2: Agensi skill package

1. Download one archive from `dist/agensi/`, such as
   `brain-reconciliation.zip` for the read proof or `brain-payment.zip` for the
   proposal proof.
2. Import the archive into Agensi's skills directory.
3. Add `https://mcp.brain.fi` as the Brain remote MCP server. Agensi packages do
   not carry the plugin-root `.mcp.json`; the built `SKILL.md` states this
   prerequisite.
4. Start authentication, sign in to the same sandbox Brain tenant, review the
   requested scopes, and approve OAuth consent.
5. Ask Agensi to list Brain ledger accounts.
6. With `brain-payment.zip` installed, ask it to prepare the same type of
   sandbox payment proposal and stop at the policy result.

Acceptance:

- [ ] The imported skill shows the manual MCP prerequisite.
- [ ] The host connects only to `https://mcp.brain.fi`.
- [ ] OAuth consent names the sandbox tenant and expected scopes.
- [ ] `ledger.accounts.list` returns the sandbox account.
- [ ] `payment_intent.propose` returns a PaymentIntent and policy decision.
- [ ] The PaymentIntent status is `pending_approval` or `rejected`.
- [ ] No execute, settle, or sign tool is available.
- [ ] No balance or settlement record changes.
- [ ] Brain records the read and proposal audit events.

## Scripted protocol verification

The script verifies the same MCP sequence without replacing the two manual host
proofs. It creates one sandbox PaymentIntent proposal, so use test identifiers
and a confirm/reject policy.

```bash
BRAIN_PHASE0_VERIFY=true \
BRAIN_AGENT_TOKEN='runtime token from the sandbox proof' \
BRAIN_PHASE0_SOURCE_ACCOUNT_ID='sandbox source account' \
BRAIN_PHASE0_DESTINATION_COUNTERPARTY_ID='sandbox counterparty' \
BRAIN_PHASE0_AMOUNT='0.01' \
BRAIN_PHASE0_CURRENCY='USD' \
node scripts/verify-phase0.mjs
```

Optional: set `BRAIN_PHASE0_ACTION_TYPE`; it defaults to `ach_outbound`.

The script must:

- [ ] complete `initialize`;
- [ ] list tools and find `ledger.accounts.list` and
      `payment_intent.propose`;
- [ ] reject any exposed tool ending in `.execute`, `.settle`, or `.sign`;
- [ ] call `ledger.accounts.list`;
- [ ] call `payment_intent.propose`;
- [ ] receive a non-empty policy decision;
- [ ] receive only `pending_approval` or `rejected`;
- [ ] leave execution and settlement untouched.

## Evidence to retain

- [ ] Host names and versions.
- [ ] Plugin or archive version and commit.
- [ ] OAuth consent screenshots with tokens redacted.
- [ ] Tool-list output with credentials redacted.
- [ ] Read-call request id and audit event id.
- [ ] PaymentIntent id, policy decision id, status, and audit event id.
- [ ] Before/after balance evidence showing no movement.
- [ ] Tester, UTC timestamp, and final pass/fail decision.

Never paste an access token into the evidence packet.
