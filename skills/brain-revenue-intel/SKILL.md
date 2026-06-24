---
name: brain-revenue-intel
description: Analyze revenue, flag churn risk, and find expansion opportunities using Brain. Use this whenever the user asks why revenue changed, which customers are slowing payment, who may churn, which renewals need attention, or where account expansion may exist, even if they do not say "revenue intelligence". Produces notify-only findings through Brain; it never contacts customers or changes commercial terms.
---

# Brain Revenue Intelligence

Drive Brain to connect invoice and transaction evidence with customer context,
then surface material revenue changes, churn signals, and expansion opportunities.
This skill produces notifications for review, not sales outreach or account
changes.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user wants to explain a revenue change, identify customers with worsening
payment behavior, review renewal risk, or find evidence-backed expansion signals.
The outcome is a prioritized findings proposal with supporting evidence.

## Evidence to gather first

Brain expects `invoice` and `transaction` evidence before it will propose. Read
only the `ledger:read` and `wiki:read` scopes:

1. `ledger.obligations.list` for invoice values, timing, status, renewals, and
   changes in billed amounts.
2. `ledger.transactions.list` for realized payments, timing shifts, failures, and
   customer-level trends.
3. `ledger.counterparties.list` to resolve customers consistently across records.
4. `wiki.page.get` or `wiki.question` for contract, renewal, relationship, and
   account context.

If invoices and realized transactions cannot be linked to a customer, stop and
list the unresolved records. Do not infer churn or expansion from one isolated
payment.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Resolve invoices and transactions by customer and comparison period.
3. Quantify revenue changes and distinguish timing effects from durable movement.
4. Identify churn or expansion signals only when multiple facts support them.
5. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.65). Return weaker signals as watch items.
6. Propose the notify-only findings and stop.

## The propose call

Use `agent.action.propose` with `action_type: "other"`.

```
agent.action.propose {
  tenant_id: <from auth context>,
  action_type: "other",
  payload: {
    operation: "revenue_intelligence_notification",
    comparison_period,
    revenue_changes,
    churn_signals,
    expansion_signals,
    watch_items,
    confidence,
    basis
  },
  linked_entities: [{ type: "counterparty", id: <customer_id> }],
  idempotency_key: <unique per proposed revenue finding>
}
```

Every proposal needs its own `idempotency_key`. The call runs through Policy and
returns a proposal id, policy decision, and next step.

## Notify-only boundary

This agent's authority is `notify_only`. It may surface findings and recommended
questions, but it cannot contact a customer, alter pricing, change a contract, or
create a commercial commitment. Those actions require a separate approved
workflow because the evidence here is analytical, not customer authority.

## Output format

Return:

- revenue movement by period and customer,
- timing effects separated from durable changes,
- churn and expansion signals with supporting evidence,
- watch items below the confidence floor,
- proposal ids and policy decisions,
- the single next step: review and assign follow-up outside this skill.

## Examples

**Example 1**
User: "Why did revenue fall this month?"
Behaviour: compare invoice and transaction evidence, separate timing from durable
changes, and propose a notify-only summary.

**Example 2**
User: "Which customers look likely to churn?"
Behaviour: combine payment behavior with contract and relationship context, then
rank only evidence-backed signals at or above 0.65 confidence.

**Example 3**
User: "Email every expansion opportunity with a new offer."
Behaviour: return the expansion findings and explain that customer outreach and
commercial terms require a separate approved workflow.
