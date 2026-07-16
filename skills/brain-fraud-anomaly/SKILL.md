---
name: brain-fraud-anomaly
description: Assess whether a transaction may be fraudulent, flag suspicious activity, and respond safely to card-freeze requests using Brain. Use this whenever the user questions an unfamiliar transaction, reports a duplicate charge, asks whether a merchant is risky, sees unusual account activity, or explicitly asks to freeze a card. Trigger-driven findings are notify-only; freeze_card is explicit-request-only and never a trigger default.
---

# Brain Fraud and Anomaly

Drive Brain to assess suspicious transaction evidence and propose an anomaly flag
with a clear basis. Brain's default behavior for this high-risk agent is
`notify_only`: event triggers may surface a warning, but they do not initiate a
consequential card action.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user sees an unfamiliar, duplicated, or otherwise unusual transaction; asks
whether activity may be fraudulent; questions a merchant; or explicitly requests
a card freeze. The outcome is an evidence-backed anomaly proposal and a precise
next step, not an automatic card change.

## Evidence to gather first

Brain expects `transaction` evidence before it will propose. Read only the
`ledger:read`, `wiki:read`, and `raw:read` scopes:

1. `ledger.transactions.list` for the transaction, nearby account activity,
   duplicate candidates, amount, currency, and merchant identity.
2. `ledger.accounts.list` or `ledger.account.get` to confirm the affected account.
3. `wiki.page.get` or `wiki.question` for known merchant aliases or prior user
   context when available.
4. Use raw-source evidence only when Brain supplies it through the authenticated
   context. The canonical MCP contract exposes no general-purpose raw read tool,
   so do not invent one.

If the transaction cannot be resolved, stop and ask for the Brain transaction
identifier or ingestion of the missing activity. Do not label a charge fraudulent
from merchant name alone.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Resolve the transaction and compare it with nearby activity, known merchant
   context, and duplicate candidates.
3. Record the specific anomaly indicators and evidence that argues against fraud.
4. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.85). Below the floor, return an inconclusive warning.
5. Propose the anomaly flag and stop.
6. If the user explicitly requested `freeze_card`, preserve that request in the
   proposal and direct the user to the approved card-control path. Do not infer a
   freeze request from an anomaly trigger.

## The propose call

Use `agent.action.propose` with `action.kind: "anomaly_flag"`.

```
agent.action.propose {
  action: {
    kind: "anomaly_flag",
    payload: {
      operation: "fraud_anomaly_review",
      transaction_id,
      anomaly_indicators,
      explicit_freeze_request,
      confidence,
      basis
    },
    linked_entities: [{ type: "transaction", id: <transaction_id> }]
  }
}
```

The bearer token supplies the tenant. The call runs through Policy and returns a
proposal id, policy decision, and next step.

## High-risk boundary

This agent legitimately has a default `notify` action because notification changes
nothing. The consequential action, `freeze_card`, is different: it is reachable
only after an explicit user request and is never selected from an anomaly trigger.
The documented MCP surface has no card-freeze tool, so this skill records the
request and hands it to the approved card-control path rather than inventing or
calling a card operation.

## Output format

Return:

- the transaction and account reviewed,
- anomaly indicators and contrary evidence,
- confidence and any unresolved evidence,
- the proposal id and policy decision,
- whether an explicit freeze request was recorded,
- the single next step: review the flag or use the approved card-control path.

## Examples

**Example 1**
User: "Is this $4,000 charge from a new merchant fraud?"
Behaviour: inspect the transaction and context, propose an anomaly flag only at or
above 0.85 confidence, and otherwise return an inconclusive warning.

**Example 2**
User: "I was charged twice for the same purchase."
Behaviour: compare duplicate candidates, propose a flag with the matching evidence,
and do not infer a card-freeze request.

**Example 3**
User: "I do not recognize this purchase. Freeze my card."
Behaviour: assess and flag the transaction, record that `freeze_card` was explicitly
requested, and direct the user to the approved card-control path.
