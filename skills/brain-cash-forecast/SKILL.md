---
name: brain-cash-forecast
description: Forecast cash, estimate runway, and project cash flow using Brain. Use this whenever the user asks about future cash balances, runway, liquidity, an expected shortfall, the effect of a large payable, or how long current funds will last, even if they do not call it a cash forecast. Proposes a forecast and recommended review items through Brain; it never moves funds.
---

# Brain Cash Forecast

Drive Brain to build an evidence-backed cash forecast from current balances,
transaction patterns, obligations, and known business context. The result is a
reviewable projection with assumptions and risks, not a transfer or treasury
action.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user wants a cash projection, runway estimate, liquidity view, shortfall
warning, or analysis of how a large payable changes the outlook. The outcome is a
dated forecast with explicit assumptions, scenarios, and review items.

## Evidence to gather first

Brain expects `balance` evidence before it will propose. Read only the
`ledger:read` and `wiki:read` scopes:

1. `ledger.accounts.list` and `ledger.account.get` for current cash accounts and
   their latest balance snapshots.
2. `ledger.transactions.list` for recent inflow and outflow patterns.
3. `ledger.obligations.list` for known receivables, bills, and large payables in
   the forecast window.
4. `wiki.page.get` or `wiki.question` for documented timing assumptions, planned
   events, or business context that is not inferable from the ledger.

If current balance evidence is missing or stale, stop and state that the forecast
cannot be anchored. Do not fabricate opening cash or payment timing.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Establish the opening balance and forecast horizon.
3. Project recurring and known inflows and outflows, separating ledger facts from
   documented assumptions.
4. Produce base, downside, and upside scenarios when uncertainty is material.
5. Calculate runway or the earliest projected shortfall, and identify the events
   with the largest effect.
6. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.65). Below the floor, return the missing assumptions.
7. Propose the forecast and stop.

## The propose call

Use `agent.action.propose` with `action_type: "other"`.

```
agent.action.propose {
  tenant_id: <from auth context>,
  action_type: "other",
  payload: {
    operation: "cash_forecast",
    account_ids,
    horizon,
    scenarios,
    projected_shortfall_date,
    runway,
    assumptions,
    confidence,
    basis
  },
  linked_entities: [{ type: "account", id: <account_id> }],
  idempotency_key: <unique per proposed forecast>
}
```

Every proposal needs its own `idempotency_key`. The call runs through Policy and
returns a proposal id, policy decision, and next step.

## Proposal boundary

This skill proposes a forecast and stops because a projection is decision support,
not authority to change balances. If the forecast suggests a transfer, financing,
or payment-timing change, return it as a review item for the appropriate approved
workflow.

## Output format

Return:

- opening cash, horizon, and data freshness,
- base, downside, and upside projections,
- runway or earliest projected shortfall,
- the largest inflow, outflow, and assumption sensitivities,
- confidence and missing evidence,
- the proposal id, policy decision, and single review next step.

## Examples

**Example 1**
User: "Forecast our cash for the next 13 weeks."
Behaviour: anchor on current balances, project known and recurring flows, and
propose a scenario-based forecast at or above 0.65 confidence.

**Example 2**
User: "What is our runway if revenue stays flat?"
Behaviour: state the flat-revenue assumption, calculate the downside runway, and
show which obligations drive the result.

**Example 3**
User: "Can we afford this large payable next month?"
Behaviour: include the payable in each scenario, identify any shortfall date, and
return liquidity options only as review items.
