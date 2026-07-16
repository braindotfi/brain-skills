---
name: brain-subscription
description: Review subscriptions, identify duplicate recurring charges, and flag price increases using Brain. Use this whenever the user asks to review subscriptions, cancel a duplicate subscription, find recurring charges, reduce subscription spend, or investigate a subscription price increase, even if they do not call it subscription management. Proposes findings and cancellation recommendations through Brain; it never contacts a vendor or changes a subscription itself.
---

# Brain Subscription

Drive Brain to identify recurring charges, duplicate subscriptions, and material
price changes, then propose a clear review or cancellation recommendation. Brain
holds the transaction and vendor context; this skill turns that evidence into a
reviewable proposal instead of making an external change.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user wants to review recurring spend, find subscriptions they may have
forgotten, cancel a duplicate subscription, or understand a price increase. The
outcome is an evidence-backed proposal for review, not a vendor cancellation.

## Evidence to gather first

Brain expects `transaction` evidence before it will propose. Read only the
`ledger:read` and `wiki:read` scopes:

1. `ledger.transactions.list` for recurring charges, amount history, and duplicate
   candidates in the relevant period.
2. `ledger.counterparties.list` to resolve merchant or vendor identities.
3. `wiki.page.get` or `wiki.question` only when vendor context is needed to
   distinguish an expected plan change from an unexplained increase.

If the charge history is incomplete or the merchant cannot be resolved, stop and
list the missing evidence. Do not infer a cancellation target from a similar name.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Group recurring charges by resolved counterparty and compare cadence, amount,
   and plan context.
3. Classify each finding as a normal recurring charge, likely duplicate, material
   price increase, or unresolved item.
4. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.7). Return lower-confidence findings for human review.
5. Propose the review or cancellation recommendation and stop.
6. Return the proposals and unresolved items to the user.

## The propose call

Use `agent.action.propose` with `action.kind: "other"`.

```
agent.action.propose {
  action: {
    kind: "other",
    payload: {
      operation: "subscription_review",
      recommendation,
      counterparty_id,
      transaction_ids,
      confidence,
      basis
    },
    linked_entities: [{ type: "transaction", id: <transaction_id> }]
  }
}
```

The bearer token supplies the tenant. The call runs through Policy and returns a
proposal id, policy decision, and next step.

## Proposal boundary

This skill proposes findings and stops because cancellation is an external vendor
change that requires an approved Brain handoff. If the user asks to cancel
immediately, explain that the proposal records the evidence and recommendation;
the operator reviews it before any vendor-facing action occurs.

## Output format

Return:

- recurring charges reviewed, grouped by counterparty,
- duplicate or price-change proposals with confidence and basis,
- unresolved items and the evidence each still needs,
- proposal ids and policy decisions from the responses,
- the single next step: review the proposals in Brain.

## Examples

**Example 1**
User: "Review my subscriptions and show me what I can cut."
Behaviour: inspect recurring transactions, propose evidence-backed review or
cancellation recommendations, and return unresolved merchants separately.

**Example 2**
User: "I think we pay for the same design tool twice."
Behaviour: compare charge cadence, amount, and resolved counterparties; propose a
duplicate cancellation recommendation only when confidence is at least 0.7.

**Example 3**
User: "Why did this subscription get more expensive?"
Behaviour: compare historical charges and available vendor context, propose a
price-increase finding, and identify any missing plan evidence.
