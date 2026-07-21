---
name: brain-vendor-risk
description: Check vendor risk, review a new vendor, and verify vendor bank-detail or payment-destination changes using Brain. Use this whenever the user is onboarding a vendor, assessing supplier risk, validating changed bank details, checking a new payment destination, or asking whether a vendor is safe, even if they do not use the phrase "vendor risk". Proposes a risk flag for explicit confirmation or rejection; nothing auto-runs.
---

# Brain Vendor Risk

Drive Brain to assess a vendor or payment-destination change against vendor,
destination, and counterparty-history evidence. The result is a reviewable risk
proposal with a clear basis, not an automatic approval or rejection.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user is onboarding a vendor, reviewing an existing supplier, validating a
bank-detail change, or checking whether a payment destination is trustworthy.
Treat changed destination details as a fresh risk review even when the vendor is
already known.

## Evidence to gather first

Brain requires `vendor`, `payment_destination`, and `counterparty_history`
evidence before it will propose. Read only the `ledger:read`, `wiki:read`, and
`raw:read` scopes:

1. `ledger.counterparties.list` to resolve the vendor and its Brain identifier.
2. `ledger.transactions.list` for prior payment history, first-seen dates,
   amounts, currencies, and destination-change timing.
3. `wiki.page.get` or `wiki.question` for approved vendor context and prior review
   notes.
4. Use `raw.artifact.get` by `raw_id` for Brain-supplied payment-destination or
   raw-source evidence when provenance or parsed evidence is needed.

If any required evidence is unavailable, stop and name the missing item. Never
treat a matching vendor name or an email request as destination verification.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Resolve the vendor, destination change, and counterparty history.
3. Compare the current destination with prior verified payment history and record
   the specific risk indicators or corroborating evidence.
4. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.8). Below the floor, return an inconclusive review
   with the evidence needed next.
5. Propose the risk flag and stop. Nothing auto-runs.
6. Return the proposal for explicit confirmation or rejection.

## The propose call

Use `agent.action.propose` with `action.kind: "anomaly_flag"`.

```
agent.action.propose {
  action: {
    kind: "anomaly_flag",
    payload: {
      operation: "vendor_risk_review",
      vendor_id,
      payment_destination,
      risk_indicators,
      confidence,
      basis
    },
    linked_entities: [{ type: "counterparty", id: <vendor_id> }]
  }
}
```

The bearer token supplies the tenant. The call runs through Policy and returns a
proposal id, policy decision, and next step.

## High-risk authority ceiling

This is a high-risk skill with no default action. Its authority ceiling is
confirm/reject: Brain may present the proposal for an explicit human decision,
but nothing auto-runs. This boundary exists because approving a false vendor or
changed destination can redirect funds; evidence collection must remain separate
from the human decision.

## Output format

Return:

- the vendor and destination reviewed,
- each risk indicator and corroborating fact,
- confidence and any missing or conflicting evidence,
- the proposal id and policy decision,
- the single next step: explicitly confirm or reject in Brain.

## Examples

**Example 1**
User: "Review this new vendor before we add them."
Behaviour: gather all three required evidence classes, propose a risk flag at or
above 0.8 confidence, and return it for explicit confirmation or rejection.

**Example 2**
User: "Our supplier emailed new bank details. Are they safe to use?"
Behaviour: compare the destination against prior history and approved context. If
destination evidence is unavailable, stop and request independent verification.

**Example 3**
User: "This vendor has been paid before, so approve the new account automatically."
Behaviour: do not infer safety from vendor history alone. Propose the evidence-backed
risk finding and state that the high-risk decision requires confirmation or
rejection.
