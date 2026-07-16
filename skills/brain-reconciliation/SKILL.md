---
name: brain-reconciliation
description: Reconcile transactions against bank statements and the ledger using Brain. Use this whenever the user mentions unreconciled transactions, matching a statement to the ledger, month-end or period close, clearing a suspense account, or resolving discrepancies between bank activity and booked entries, even if they don't say the word "reconcile". Proposes matches through Brain; it never posts or executes anything itself.
---

# Brain Reconciliation

Drive Brain to find and propose matches between unreconciled ledger activity and
imported statement lines, and to surface genuine discrepancies for a human to
resolve. Brain runs the ingest, normalization, and deterministic matching; this
skill is the recipe for using that surface to a clean close.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user is closing a period, has unmatched bank lines, sees a suspense or
clearing balance that should be zero, or asks why the ledger and the bank disagree.
The outcome is a set of proposed matches plus a short list of true discrepancies,
not a posted ledger.

## Evidence to gather first

Brain expects `transaction` evidence before it will propose. Read only the
`ledger:read` scope:

1. `ledger.transactions.list` for the unreconciled or candidate transactions in the
   period.
2. `ledger.accounts.list` / `ledger.account.get` to confirm the account and its
   latest balance snapshot.

If the transactions are not yet in Brain, stop and tell the user the statement has
not been ingested. Do not invent lines.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. List the unreconciled transactions for the target account and period.
3. For each candidate, assess match confidence. Only propose at or above Brain's
   confidence floor for this agent (`minimum_confidence` = 0.7). Below the floor,
   surface it as a discrepancy for human review rather than proposing a match.
4. Propose each match. Do not post. Do not execute.
5. Return the proposals and the discrepancy list to the user.

## The propose call

Use `agent.action.propose` with `action.kind: "reconciliation_match"`.

```
agent.action.propose {
  action: {
    kind: "reconciliation_match",
    payload: { transaction_id, matched_to, confidence, basis },
    linked_entities: [{ type: "transaction", id: <txn_id> }]
  }
}
```

The bearer token supplies the tenant. The call runs through Policy and lands as a
`proposals` row; the response carries the policy decision and next step.

## No-execute boundary

This skill proposes matches and stops. There is no execute or post step on the MCP
surface, by design: a proposed match is reviewed and applied through Brain's own
gated path, not by the proposing agent. If the user asks you to "just post it",
explain that the proposal is the handoff point and that posting happens behind
Brain's approval gate.

## Output format

Return:
- a count of proposed matches with confidence and basis,
- a discrepancy list (unmatched or below-floor items) with why each is unresolved,
- the proposal ids and policy decisions from the responses,
- the single next step (review and approve in Brain).

## Examples

**Example 1**
User: "Help me close out March, the bank and the books don't line up."
Behaviour: list March unreconciled transactions, propose matches at or above 0.7,
return matches plus a short discrepancy list. No posting.

**Example 2**
User: "Why is my clearing account not zero?"
Behaviour: pull the clearing account transactions, propose the matches that resolve
it, and surface the residual lines that explain the non-zero balance.

**Example 3**
User: "Just auto-post anything that matches."
Behaviour: propose the matches, then explain that execution happens through Brain's
approval gate, not from this skill. Return the proposals for approval.
