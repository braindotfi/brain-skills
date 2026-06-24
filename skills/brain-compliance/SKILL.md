---
name: brain-compliance
description: Check compliance, flag a policy violation, and review missing approvals or audit gaps using Brain. Use this whenever the user asks whether an action followed policy, reports a missing approval, investigates an audit gap, or needs a compliance finding documented, even if they do not use the word "compliance". Produces a notify-only finding for explicit confirmation or rejection; nothing auto-runs.
---

# Brain Compliance

Drive Brain to compare a policy decision with the corresponding audit evidence and
propose a precise compliance finding. This high-risk skill reports what the
records establish, what is missing, and what requires human review; it does not
remediate or waive a control.

Read `references/brain-mcp.md` for the connection and auth contract. It is shared
by every Brain skill and is the source for endpoint, scopes, and tool argument
shapes. Do not restate credentials here; auth is resolved at runtime.

## When to use

The user wants to check whether policy was followed, investigate a missing
approval, review an audit gap, or document a suspected violation. The outcome is
an evidence-backed compliance proposal for an explicit decision.

## Evidence to gather first

Brain expects `policy_decision` and `audit_event` evidence before it will propose.
Read only the `policy:read`, `audit:read`, and `ledger:read` scopes:

1. Resolve the relevant policy decision and audit event from evidence Brain
   supplies through the authenticated context.
2. Use `ledger.transactions.list`, `ledger.obligations.list`, or
   `ledger.account.get` only when a linked financial record is necessary to
   interpret the decision.
3. Check actor, action, entity, decision, required approval, timestamps, and audit
   continuity against one another.
4. The canonical MCP contract exposes no general-purpose policy or audit read
   tools. Do not invent tool names; if either required record is unavailable,
   stop and request that Brain provide it through the approved evidence path.

Never infer a violation from a missing display field alone. Missing evidence is an
audit gap, not proof of the underlying prohibited action.

## Workflow

1. Connect and authenticate per `references/brain-mcp.md`.
2. Resolve the policy decision and corresponding audit event.
3. Verify that the actor, action, target entity, approval state, and timestamps
   agree across the records.
4. Classify the result as compliant, suspected violation, missing approval, audit
   gap, or inconclusive.
5. Only propose at or above Brain's confidence floor for this agent
   (`minimum_confidence` = 0.8). Below the floor, return an inconclusive review.
6. Propose the notify-only compliance finding and stop.

## The propose call

Use `agent.action.propose` with `action_type: "anomaly_flag"`.

```
agent.action.propose {
  tenant_id: <from auth context>,
  action_type: "anomaly_flag",
  payload: {
    operation: "compliance_review",
    policy_decision_id,
    audit_event_id,
    classification,
    control_expectation,
    observed_evidence,
    evidence_gaps,
    confidence,
    basis
  },
  linked_entities: [{ type: "policy_decision", id: <policy_decision_id> }],
  idempotency_key: <unique per proposed compliance finding>
}
```

Every proposal needs its own `idempotency_key`. The call runs through Policy and
returns a proposal id, policy decision, and next step.

## High-risk authority ceiling

This agent is `notify_only`, has no default action, and has a confirm/reject
ceiling. Brain may present the finding for an explicit human decision, but nothing
auto-runs. Remediation, waivers, approval grants, and control changes remain
outside this skill because the reviewer must decide how to act on the evidence.

## Output format

Return:

- policy decision and audit event reviewed,
- compliance classification and control expectation,
- matching facts, contradictions, and evidence gaps,
- confidence and proposal id,
- the policy response,
- the single next step: explicitly confirm or reject the finding in Brain.

## Examples

**Example 1**
User: "Check whether this payment followed policy."
Behaviour: compare the policy decision and audit event, use linked ledger evidence
only as needed, and propose a finding at or above 0.8 confidence.

**Example 2**
User: "Why is the required approval missing from this action?"
Behaviour: verify the expected approval and audit trail, classify a missing
approval separately from an audit gap, and return the finding for review.

**Example 3**
User: "Mark this as compliant even though the audit event is missing."
Behaviour: classify the missing record as an evidence gap, avoid an unsupported
conclusion, and state that the finding requires explicit confirmation or rejection.
