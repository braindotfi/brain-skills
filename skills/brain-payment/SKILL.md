---
name: brain-payment
description: Pay a bill, schedule a payment, or prepare an approved invoice for payment using Brain. Use this whenever the user asks to pay a supplier, schedule a bill, act on an approved invoice, or prepare an outbound ACH or wire, even if they simply say "send the payment". Creates a payment-intent proposal through Brain; it never signs, dispatches, or moves funds.
---

# Brain Payment

Drive Brain to validate an invoice, counterparty, destination, amount, and source
account, then create a payment-intent proposal for review. This skill prepares the
financial intent; Brain's policy and approval path control everything after that
handoff.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user wants to pay a bill, schedule an invoice payment, or prepare an approved
supplier obligation for payment. The outcome is one payment-intent proposal with
verified fields and a policy decision, not movement of funds.

## Evidence to gather first

Brain expects `invoice`, `counterparty`, and `payment_destination` evidence before
it will propose. Read only the `ledger:read` scope:

1. `ledger.obligations.list` for the invoice, amount due, currency, due date,
   approval state, and open balance.
2. `ledger.counterparties.list` to resolve the intended payee.
3. `ledger.accounts.list` and `ledger.account.get` to resolve the source account
   and current balance snapshot.
4. `ledger.transactions.list` to identify duplicate or already-paid obligations
   when relevant.
5. Use payment-destination evidence only when Brain supplies a verified destination
   in the authenticated context. Do not infer routing details from free text.

If any required evidence is missing, conflicting, or stale, stop and name the
problem. Never substitute an unverified destination.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Resolve the invoice, counterparty, verified destination, and source account.
3. Confirm the amount, currency, due date, approval state, and absence of an
   existing payment for the same obligation.
4. Select `ach_outbound` or `wire` only when the verified destination and requested
   rail support it. Do not guess a rail.
5. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.85). Below the floor, return the evidence gap.
6. Create the payment-intent proposal and stop.

## The propose call

Use `payment_intent.propose`. Choose the valid `action_type` from the verified
payment rail: `"ach_outbound"` or `"wire"`.

```
payment_intent.propose {
  action_type: <"ach_outbound" or "wire">,
  source_account_id: <verified account id>,
  destination_counterparty_id: <verified counterparty id>,
  amount: <verified invoice amount>,
  currency: <verified invoice currency>,
  obligation_id: <obligation id>,
  invoice_id: <invoice id when present>
}
```

The bearer token supplies the tenant. The response returns the
`payment_intent_id`, policy decision, and next approval state.

## Money-mover boundary

This agent has no default action. A financial proposal requires an explicit user
request or a matched event plus complete evidence; no unmatched trigger can choose
a payment action. The skill stops at `payment_intent.propose` because signing and
fund movement remain inside Brain's gated approval path.

## Output format

Return:

- invoice, counterparty, amount, currency, due date, and selected rail,
- source account and verified destination identifiers,
- duplicate-payment checks and confidence,
- payment-intent id and policy decision,
- required approvers or next approval state,
- the single next step: review the payment intent in Brain.

## Examples

**Example 1**
User: "Pay the approved AWS invoice."
Behaviour: verify the invoice, payee, destination, source account, and duplicate
state, then propose the supported outbound rail at or above 0.85 confidence.

**Example 2**
User: "Schedule this supplier bill for Friday."
Behaviour: create a payment-intent proposal carrying the verified obligation and
requested timing context, then return the policy decision.

**Example 3**
User: "Use the bank details from this email and send it now."
Behaviour: reject the free-text destination as evidence, request a verified Brain
destination, and create no payment intent until the required evidence is complete.
