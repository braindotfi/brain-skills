---
name: brain-treasury
description: Sweep idle cash, move excess balances to yield, top up a low-balance account, or plan liquidity using Brain. Use this whenever the user asks to optimize cash placement, rebalance operating accounts, respond to a runway change, or prepare a treasury transfer. Creates a payment-intent proposal through Brain; it never signs or moves funds.
---

# Brain Treasury

Drive Brain to assess current balances, operating needs, runway, and documented
liquidity constraints, then create a treasury payment-intent proposal when the
evidence supports one. The outcome is a reviewed financial intent, not an
automatic sweep.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user wants to sweep idle cash, top up a low-balance account, move excess cash
to an approved yield destination, or plan liquidity after a runway change. The
outcome is either a payment-intent proposal or a no-transfer liquidity plan when
the evidence does not justify movement.

## Evidence to gather first

Brain expects `balance` evidence before it will propose. Read only the
`ledger:read` and `wiki:read` scopes:

1. `ledger.accounts.list` and `ledger.account.get` for source and destination
   accounts and their latest balance snapshots.
2. `ledger.obligations.list` for near-term bills and receivables that define the
   operating reserve.
3. `ledger.transactions.list` for recent cash-flow patterns and pending movement.
4. `ledger.counterparties.list` to resolve an approved external destination when
   the proposal is not between internal accounts.
5. `wiki.page.get` or `wiki.question` for documented reserve targets, liquidity
   policy, approved yield destinations, and timing constraints.

If balances are stale, the reserve target is unknown, or the destination is not
verified, stop and return a liquidity review instead of proposing movement.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Establish source and destination balances, near-term obligations, and the
   required operating reserve.
3. Calculate the transferable amount after preserving the reserve and known cash
   needs.
4. Confirm the destination and select the supported rail: `ach_outbound`, `wire`,
   or `onchain_transfer`. Do not infer a rail or destination.
5. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.8). Below the floor, return the liquidity plan and
   evidence gap.
6. Create the payment-intent proposal and stop.

## The propose call

Use `payment_intent.propose`. Choose the valid `action_type` from the verified
treasury rail.

```
payment_intent.propose {
  tenant_id: <from auth context>,
  action_type: <"ach_outbound", "wire", or "onchain_transfer">,
  source_account_id: <verified source account id>,
  destination_counterparty_id: <verified destination id>,
  amount: <amount after reserve>,
  currency: <verified currency>,
  idempotency_key: <unique per proposed treasury movement>
}
```

Every proposal needs its own `idempotency_key`. The response returns the
`payment_intent_id`, policy decision, and next approval state.

## Money-mover boundary

This agent has no default action. A financial proposal requires an explicit user
request or a matched event plus complete balance, reserve, and destination
evidence. The skill stops at `payment_intent.propose`; signing and fund movement
remain inside Brain's gated approval path.

## Output format

Return:

- source and destination balances with snapshot times,
- operating reserve, near-term obligations, and transferable amount,
- selected rail, amount, currency, and assumptions,
- confidence and any evidence gaps,
- payment-intent id and policy decision,
- required approvers or next approval state,
- the single next step: review the treasury intent in Brain.

## Examples

**Example 1**
User: "Sweep idle cash above our operating reserve."
Behaviour: calculate the reserve-adjusted amount, verify the approved destination,
and propose the supported rail at or above 0.8 confidence.

**Example 2**
User: "Top up payroll from our treasury account."
Behaviour: verify both balances and upcoming obligations, preserve the required
reserve, and return one payment-intent proposal.

**Example 3**
User: "Move everything to the highest-yield account."
Behaviour: refuse to assume zero operating reserve or an unapproved destination;
return a liquidity plan until the required evidence is complete.
